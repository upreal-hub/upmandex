import assert from "node:assert/strict";
import test from "node:test";
import { authenticateMewRequest, signMewRequest, privateMewStore, verifyListedPrivateBlob, assertPrimaryMewAdmin, claimMewOperation, performMewTransfer, OPERATION, MEW_IDS } from "./mew-runtime-auth.mjs";
import { mewSigningContext, readVercelJson, VercelReadError } from "../tools/mew-signing-context.mjs";

const env = { AUTH_SECRET: "fixture-owner-secret", UPMANDEX_MEW_RUNTIME_ENABLED: "1", UPMANDEX_RELEASE_ADMIN_TWITCH_ID: "111" };
function fixture(overrides = {}) {
  const body = JSON.stringify({ operation: OPERATION, mode: "execute", ownerTwitchId: "111", nonce: "11111111-1111-4111-8111-111111111111", issuedAt: 100000,
    project: "late-paper-17187204", branchId: "br-anniversary", databaseHost: "ep-anniversary.region.neon.tech", databaseName: "neondb",
    sources: MEW_IDS.map((id, n) => ({ id, publicUrl: `https://e4pburhj5wrv8agh.public.blob.vercel-storage.com/upman-submissions/fixture-${n}.png` })), ...overrides });
  return { body, signature: signMewRequest(body, env.AUTH_SECRET) };
}
test("one-off owner capability is signature, time, scope and identity bound", () => {
  const valid = fixture();
  assert.equal(authenticateMewRequest(valid.body, valid.signature, env, 100000).ownerTwitchId, "111");
  assert.throws(() => authenticateMewRequest(valid.body, "0".repeat(64), env, 100000));
  assert.throws(() => authenticateMewRequest(valid.body, valid.signature, { ...env, UPMANDEX_MEW_RUNTIME_ENABLED: "0" }, 100000));
  assert.throws(() => authenticateMewRequest(valid.body, valid.signature, env, 200001));
  for (const patch of [{ ownerTwitchId: "222" }, { operation: "release-public" }, { mode: "PUBLIC" }, { sources: [] }, { project: "other" }]) {
    const bad = fixture(patch);
    assert.throws(() => authenticateMewRequest(bad.body, bad.signature, env, 100000));
  }
});
test("operator signs with the exact deployment secret despite a different local AUTH_SECRET", () => {
  const valid = fixture({ deploymentHost: "upmandex-fixture.vercel.app" });
  const localSecret = "different-development-secret";
  assert.throws(() => authenticateMewRequest(valid.body, signMewRequest(valid.body, localSecret), env, 100000), /Invalid owner signature/);
  const context = mewSigningContext({ env }, "111", localSecret);
  assert.equal(context.localSecretMatchesDeployment, false);
  assert.equal(context.ownerTwitchId, "111");
  // The same UTF-8 bytes are written to disk and transmitted using curl --data-binary.
  const received = Buffer.from(valid.body, "utf8").toString("utf8");
  const signature = signMewRequest(valid.body, context.secret);
  assert.equal(authenticateMewRequest(received, signature, env, 100000).deploymentHost, "upmandex-fixture.vercel.app");
  assert.throws(() => authenticateMewRequest(received + "\n", signature, env, 100000), /Invalid owner signature/);
  assert.throws(() => authenticateMewRequest(received.replace("upmandex-fixture", "upmandex-other"), signature, env, 100000), /Invalid owner signature/);
  assert.throws(() => authenticateMewRequest(received, "f".repeat(64), env, 100000), /Invalid owner signature/);
  assert.throws(() => authenticateMewRequest(received, signature, env, 190001), /Expired/);
});
test("unavailable deployment secret and inconsistent owner never fall back to local configuration", () => {
  for (const secret of [undefined, "", " ", "********", "[REDACTED]"]) {
    assert.throws(() => mewSigningContext({ env: { ...env, AUTH_SECRET: secret } }, "111", env.AUTH_SECRET), /non récupérable/);
  }
  assert.throws(() => mewSigningContext({ env }, "222", env.AUTH_SECRET), /ID propriétaire différent/);
  assert.throws(() => mewSigningContext(undefined, "111", env.AUTH_SECRET), /non récupérable/);
});
test("Vercel reads distinguish safe error categories without leaking CLI secrets", () => {
  const cases = [
    { stderr: "getaddrinfo ENOTFOUND api.vercel.com", category: "dns" },
    { stderr: "Error: unknown option --fixture", category: "cli-arguments" },
    { stderr: "No existing credentials found", category: "authentication" },
    { stdout: 'HTTP/2 403\n\n{"error":{"code":"forbidden","message":"fixture-secret-do-not-log"}}', category: "permissions" },
    { stdout: 'HTTP/2 404\n\n{"error":{"code":"not_found"}}', category: "endpoint-or-target-not-found" },
    { stderr: "Sensitive value cannot be retrieved", category: "secret-not-exportable" },
    { stderr: "certificate expired", category: "tls" },
    { stderr: "ECONNRESET", category: "network" },
    { stdout: "not-json fixture-secret-do-not-log", category: "cli-failure" },
  ];
  for (const row of cases) {
    assert.throws(() => readVercelJson({ status: 1, stdout: "", stderr: "", ...row }, "deployment-environment"), error => {
      assert.ok(error instanceof VercelReadError);
      assert.equal(error.diagnostic.category, row.category);
      assert.equal(JSON.stringify(error).includes("fixture-secret-do-not-log"), false);
      assert.equal(error.message.includes("fixture-secret-do-not-log"), false);
      return true;
    });
  }
  const result = readVercelJson({ status: 0, stdout: 'HTTP/2 200\ncontent-type: application/json\n\n{"env":{"AUTH_SECRET":"fixture-only"}}' }, "deployment-environment");
  assert.equal(result.env.AUTH_SECRET, "fixture-only");
  assert.throws(() => readVercelJson({ status: 0, stdout: "unexpected response" }, "deployment-environment"), error => {
    assert.ok(error instanceof VercelReadError);
    assert.equal(error.diagnostic.category, "unexpected-response-format");
    return true;
  });
});
test("private token overrides ambient public-store settings and cannot target the public store", () => {
  const privateEnv = { PRIVATE_BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_privatefixture_fixture", BLOB_STORE_ID: "store_e4pburhj5wrv8agh" };
  const selected = privateMewStore(privateEnv);
  assert.equal(selected.id, "privatefixture");
  assert.equal(selected.options.storeId, "privatefixture");
  assert.equal(selected.options.token, privateEnv.PRIVATE_BLOB_READ_WRITE_TOKEN);
  assert.throws(() => privateMewStore({}));
  assert.throws(() => privateMewStore({ PRIVATE_BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_e4pburhj5wrv8agh_fixture" }));
  assert.throws(() => privateMewStore({ ...privateEnv, PRIVATE_BLOB_STORE_ID: "store_other" }));
});
const sampleStore = privateMewStore({
  PRIVATE_BLOB_STORE_ID: "store_privatefixture",
  PRIVATE_BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_privatefixture_fixture",
});
const sample = { pathname: "fixture/sample.png", url: "https://privatefixture.blob.vercel-storage.com/fixture/sample.png", etag: "sample-etag" };
const sampleRead = (origin = sampleStore.origin, etag = sample.etag) => ({
  statusCode: 200,
  stream: new ReadableStream<Uint8Array>(),
  blob: { url: origin + "/" + sample.pathname, pathname: sample.pathname, etag },
});

test("private Blob listing accepts metadata URLs after a scoped successful read", async () => {
  assert.equal(await verifyListedPrivateBlob([], sampleStore, () => assert.fail("Empty store must not read")), false);
  const read = sampleRead();
  assert.equal(await verifyListedPrivateBlob([sample], sampleStore, async (pathname: string, options: {
    access: string; useCache: boolean; storeId: string; token: string;
  }) => {
    assert.equal(pathname, sample.pathname);
    assert.equal(options.access, "private");
    assert.equal(options.useCache, false);
    assert.equal(options.storeId, sampleStore.id);
    assert.equal(options.token, sampleStore.options.token);
    return read;
  }), true);
  assert.equal((await read.stream.getReader().read()).done, true);
});

test("private Blob listing rejects foreign stores, different objects and URL input", async () => {
  await assert.rejects(verifyListedPrivateBlob([sample], sampleStore, async () =>
    sampleRead("https://other.private.blob.vercel-storage.com")), /expected private store object/);
  await assert.rejects(verifyListedPrivateBlob([sample], sampleStore, async () =>
    sampleRead(sampleStore.origin, "other-etag")), /expected private store object/);
  await assert.rejects(verifyListedPrivateBlob([{ ...sample, pathname: sample.url }], sampleStore, () =>
    assert.fail("Never send the private token to a listed URL")), /Invalid pathname/);
});

test("private Blob listing fails closed on missing objects and read errors", async () => {
  await assert.rejects(verifyListedPrivateBlob([sample], sampleStore, async () => null), /could not be read/);
  await assert.rejects(verifyListedPrivateBlob([sample], sampleStore, async () => {
    throw new Error("mock error with private details");
  }), /^Error: Private store sample verification failed$/);
});

test("runtime principal must still have the real database ADMIN role", () => {
  assert.doesNotThrow(() => assertPrimaryMewAdmin({ id: "fixture-owner", role: "ADMIN" }));
  assert.throws(() => assertPrimaryMewAdmin({ id: "fixture-owner", role: "USER" }));
  assert.throws(() => assertPrimaryMewAdmin(null));
});
test("persistent private claim permits only one concurrent execution and blocks a later replay", async () => {
  const objects = new Map<string, string>();
  const storage = async (path: string, body: string, options: { allowOverwrite: boolean; access: string }) => {
    assert.equal(options.access, "private");
    assert.equal(options.allowOverwrite, false);
    if (objects.has(path)) throw Error("already claimed");
    objects.set(path, body);
    return { etag: "fixture-etag", url: "https://fixture.private.blob.vercel-storage.com/" + path };
  };
  const key = "upman-submissions/private-mew/operation-v1.json";
  const request = fixture();
  const authenticate = () => authenticateMewRequest(request.body, request.signature, env, 100000);
  authenticate();
  const results = await Promise.allSettled([claimMewOperation(storage, key, { state: "claimed" }, {}), claimMewOperation(storage, key, { state: "claimed" }, {})]);
  assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
  // Even an identical, still-valid signed request cannot claim the operation twice.
  authenticate();
  await assert.rejects(claimMewOperation(storage, key, { state: "claimed" }, {}));
});
test("every pre-deletion failure preserves originals and restores committed references", async () => {
  for (const failure of ["copyAndVerify", "replaceReferences", "verifyAccess", "lockAndValidateDeletion"]) {
    const calls: string[] = [];
    const actions = Object.fromEntries(["copyAndVerify", "replaceReferences", "verifyAccess", "lockAndValidateDeletion", "deleteOriginals", "verifyRevocation", "restoreReferences", "releaseLocks"].map(name => [name,
      async () => { calls.push(name); if (name === failure) throw Error("fixture failure"); return []; }]));
    await assert.rejects(performMewTransfer(actions));
    assert.equal(calls.includes("deleteOriginals"), false);
    if (["verifyAccess", "lockAndValidateDeletion"].includes(failure)) assert.equal(calls.includes("restoreReferences"), true);
  }
});

test("preparation verifies copies and references without calling deletion", async () => {
  const calls: string[] = [];
  const actions = Object.fromEntries(["copyAndVerify", "replaceReferences", "verifyAccess", "lockAndValidateDeletion", "deleteOriginals", "verifyRevocation", "restoreReferences", "releaseLocks"].map(name => [
    name, async () => { calls.push(name); return []; },
  ]));
  assert.deepEqual(await performMewTransfer(actions, { prepareOnly: true }), { outcome: "mew-prepared" });
  assert.deepEqual(calls, ["copyAndVerify", "replaceReferences", "verifyAccess", "lockAndValidateDeletion", "releaseLocks"]);
  calls.length = 0;
  await performMewTransfer(actions, { preparedCopies: [{ id: "fixture" }] });
  assert.deepEqual(calls, ["verifyAccess", "lockAndValidateDeletion", "deleteOriginals", "verifyRevocation", "releaseLocks"]);
});
