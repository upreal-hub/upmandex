import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as nodeModule from "node:module";
import test from "node:test";

const base = "https://upmandex.example.test";
const author = { id: "author", twitchLogin: "author", displayName: "Author", avatar: null, role: "USER" };
const admin = { ...author, id: "admin", twitchLogin: "admin", role: "ADMIN" };
const outsider = { ...author, id: "outsider" };
const privateImage = "https://fixture.private.blob.vercel-storage.com/upman-submissions/fixture.png";
const png = new Uint8Array(readFileSync(new URL("../public/upmans/normalupman.png", import.meta.url)));

function mockDelegate(target: object, key: string, value: unknown) {
  assert.ok(Reflect.set(target, key, value));
}

function submissionRequest(name: string, image = png) {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("description", "A test-only submission");
  formData.set("image", new File([image], "fixture.png", { type: "image/png" }));
  return new Request(`${base}/api/upman-submissions`, { method: "POST", body: formData });
}

test("admin authorization and submission lifecycle use isolated mocks", async (context) => {
  const fixtureEnv = {
    DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/fixture",
    UPMANDEX_ENV: "anniversary", UPMANDEX_PRIVATE_ACCESS: "1", UPMANDEX_PRIVATE_TWITCH_IDS: "111,222,333",
    UPMANDEX_RELEASE_ADMIN_TWITCH_ID: "222", UPMANDEX_RELEASE_READY: "0", PRIVATE_BLOB_READ_WRITE_TOKEN: "fixture-only",
  };
  for (const [key, value] of Object.entries(fixtureEnv)) {
    const previous = process.env[key];
    process.env[key] = value;
    context.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }

  let identity: string | null = null;
  let written = 0;
  let deleted = 0;
  const blobRead = context.mock.fn(async () => ({ statusCode: 200, stream: new Blob([png]).stream() }));
  const namespace = Symbol.for("upmandex.admin-submissions.fixture");
  Reflect.set(globalThis, namespace, {
    auth: async () => identity ? { user: { twitchUserId: identity } } : null,
    put: async (name: string, file: File, options: { access: string; token: string }) => {
      assert.match(name, /^upman-submissions\/author\/.+\.png$/);
      assert.equal(options.access, "private");
      assert.equal(options.token, "fixture-only");
      assert.deepEqual(new Uint8Array(await file.arrayBuffer()), png);
      written++;
      return { url: privateImage };
    },
    get: blobRead,
    del: async (url: string, options: { token: string }) => { assert.equal(url, privateImage); assert.equal(options.token, "fixture-only"); deleted++; },
  });

  type Resolve = (specifier: string, context: object) => object;
  type Load = (url: string, context: object) => object;
  const { registerHooks } = nodeModule as typeof nodeModule & {
    registerHooks(options: { resolve: (specifier: string, context: object, next: Resolve) => object; load: (url: string, context: object, next: Load) => object }): { deregister(): void };
  };
  const authMock = "data:text/javascript,/* fixture auth */";
  const blobMock = "data:text/javascript,/* fixture blob */";
  const source = 'const fixture = globalThis[Symbol.for("upmandex.admin-submissions.fixture")];\n';
  const hook = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === "@/auth" || specifier === "@vercel/blob") {
        return { url: specifier === "@/auth" ? authMock : blobMock, shortCircuit: true };
      }
      return next(specifier === "server-only" ? "next/dist/compiled/server-only/empty.js" : specifier, context);
    },
    load(url, context, next) {
      if (url === authMock || url === blobMock) return { format: "module", shortCircuit: true, source: source + (
        url === authMock ? 'export const auth = fixture.auth;' : 'export const { put, get, del } = fixture;'
      ) };
      return next(url, context);
    },
  });
  context.after(() => { hook.deregister(); Reflect.deleteProperty(globalThis, namespace); });

  const { prisma } = await import("./prisma");
  const submissions = await import("../app/api/upman-submissions/route");
  const queue = await import("../app/api/admin/upman-submissions/route");
  const review = await import("../app/api/admin/upman-submissions/[id]/route");
  const media = await import("../app/api/submission-media/[id]/route");
  const release = await import("../app/api/admin/release/route");
  mockDelegate(prisma.user, "findUnique", async ({ where }: { where: { twitchUserId?: string } }) =>
    where.twitchUserId === "111" ? author : where.twitchUserId === "222" ? admin : outsider);
  mockDelegate(prisma.person, "findUnique", async () => null);
  let publication = "PRIVATE";
  mockDelegate(prisma, "$queryRaw", async (sql: TemplateStringsArray) => {
    assert.match(sql.join("?"), /SELECT/);
    return [{ status: publication, version: 0 }];
  });

  await context.test("anonymous and ordinary users are denied before each Admin action", async () => {
    const upload = await import("../app/api/admin-upmans/upload/route");
    const edit = await import("../app/api/edit-upman/route");
    const deleteUpman = await import("../app/api/delete-upman/route");
    const people = await import("../app/api/admin-people/route");
    const person = await import("../app/api/admin-people/[personId]/route");
    const users = await import("../app/api/users/route");
    const viewers = await import("../app/api/admin-viewers/[viewer]/route");
    const collection = await import("../app/api/admin-viewers/[viewer]/collection/route");
    const cosmetics = await import("../app/api/admin/profile-cosmetics/route");
    const cosmeticsAsset = await import("../app/api/admin/profile-cosmetics/[assetId]/route");
    const relationships = await import("../app/api/admin-upmans/[slug]/relationships/route");
    const eventUpman = await import("../app/api/admin/event-upman/route");
    const actions = [
      () => upload.POST(new Request(`${base}/api/admin-upmans/upload`, { method: "POST" })),
      () => edit.POST(new Request(`${base}/api/edit-upman`, { method: "POST" })),
      () => deleteUpman.POST(new Request(`${base}/api/delete-upman`, { method: "POST" })),
      () => people.POST(new Request(`${base}/api/admin-people`, { method: "POST" })),
      () => person.PATCH(new Request(`${base}/api/admin-people/target`, { method: "PATCH" }), { params: Promise.resolve({ personId: "target" }) }),
      () => users.GET(),
      () => viewers.GET(new Request(`${base}/api/admin-viewers/author`), { params: Promise.resolve({ viewer: "author" }) }),
      () => collection.POST(new Request(`${base}/api/admin-viewers/author/collection`, { method: "POST" }), { params: Promise.resolve({ viewer: "author" }) }),
      () => collection.DELETE(new Request(`${base}/api/admin-viewers/author/collection`, { method: "DELETE" }), { params: Promise.resolve({ viewer: "author" }) }),
      () => cosmetics.POST(new Request(`${base}/api/admin/profile-cosmetics`, { method: "POST" })),
      () => cosmeticsAsset.PATCH(new Request(`${base}/api/admin/profile-cosmetics/fixture`, { method: "PATCH" }), { params: Promise.resolve({ assetId: "fixture" }) }),
      () => cosmeticsAsset.DELETE(new Request(`${base}/api/admin/profile-cosmetics/fixture`, { method: "DELETE" }), { params: Promise.resolve({ assetId: "fixture" }) }),
      () => relationships.PATCH(new Request(`${base}/api/admin-upmans/fixture/relationships`, { method: "PATCH" }), { params: Promise.resolve({ slug: "fixture" }) }),
      () => eventUpman.PATCH(new Request(`${base}/api/admin/event-upman`, { method: "PATCH" })),
      () => queue.GET(new Request(`${base}/api/admin/upman-submissions`)),
      () => review.PATCH(new Request(`${base}/api/admin/upman-submissions/draft`, { method: "PATCH" }), { params: Promise.resolve({ id: "draft" }) }),
    ];
    for (const [viewer, status] of [[null, 401], ["111", 403]] as const) {
      identity = viewer;
      for (const action of actions) {
        const response = await action();
        assert.ok(response);
        assert.equal(response.status, status);
      }
      assert.equal((await release.GET()).status, 403);
    }
    identity = "222";
    const releaseStatus = await release.GET();
    assert.equal(releaseStatus.status, 200);
    assert.ok((await releaseStatus.json()).blockers.includes("Launch prerequisites have not been approved."));
    assert.equal((await release.POST(new Request(`${base}/api/admin/release`, {
      method: "POST", headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLIC", version: 0, confirmation: "Release UPMANDEX" }),
    }))).status, 503);
  });

  await context.test("valid PNGs stay private through submission, approval or rejection", async () => {
    type Row = { id: string; name: string; description: string; image: string; userId: string; contentFingerprint: string;
      status: "PENDING" | "APPROVED" | "REJECTED"; approvedUpmanId?: string; approvedUpman?: { dexVisibility: string; rarity: string; inventory: [] } };
    const rows = new Map<string, Row>();
    let activeId = "";
    let failInsert = false;
    let linked = true;
    let existingRepresentation: string | null = "old-upman";
    let newUpmanCount = 0;
    const prepare = ({ id, userId_contentFingerprint: fingerprint }: { id?: string; userId_contentFingerprint?: { userId: string; contentFingerprint: string } }) =>
      id ? rows.get(id) ?? null : [...rows.values()].find(row => row.userId === fingerprint?.userId && row.contentFingerprint === fingerprint.contentFingerprint) ?? null;
    mockDelegate(prisma.upmanSubmission, "findUnique", async ({ where }: { where: Parameters<typeof prepare>[0] }) => prepare(where));
    mockDelegate(prisma.upmanSubmission, "findMany", async ({ where }: { where: { userId?: string; status?: Row["status"] } }) =>
      [...rows.values()].filter(row => (!where.status || row.status === where.status) && (!where.userId || row.userId === where.userId)));
    mockDelegate(prisma.upmanSubmission, "create", async ({ data }: { data: Omit<Row, "id" | "status"> }) => {
      if (failInsert) throw new Error("fixture database error");
      assert.equal(data.image, privateImage);
      const id = data.name.toLowerCase();
      rows.set(id, { ...data, id, status: "PENDING" });
      return { id, status: "PENDING", createdAt: new Date(0) };
    });
    const tx = {
      $queryRaw: async () => [rows.get(activeId)],
      user: { findUnique: async () => ({ ...author, person: linked ? { id: "person", representedUpmans: existingRepresentation ? [{ id: existingRepresentation }] : [] } : null }) },
      upman: {
        updateMany: async ({ where, data }: { where: object; data: object }) => {
          assert.deepEqual(where, { representedPersonId: "person" });
          assert.deepEqual(data, { representedPersonId: null });
          existingRepresentation = null;
        },
        create: async ({ data }: { data: { image: string; representedPersonId: string } }) => {
          assert.equal(data.image, "/api/submission-media/approve");
          assert.equal(data.representedPersonId, "person");
          assert.equal(existingRepresentation, null);
          newUpmanCount++;
          return { id: "new", slug: "approve", name: "Approve", rarity: "Rare" };
        },
        findUnique: async () => ({ id: "new", slug: "approve", name: "Approve", rarity: "Rare" }),
      },
      upmanSubmission: { update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        Object.assign(rows.get(where.id)!, data);
        if (data.status === "APPROVED") rows.get(where.id)!.approvedUpman = { dexVisibility: "PUBLIC", rarity: "Rare", inventory: [] };
      } },
      activityLog: { create: async () => {} },
    };
    mockDelegate(prisma, "$transaction", async (action: (client: typeof tx) => unknown) => action(tx));
    const readImage = (id: string) => media.GET(new Request(`${base}/api/submission-media/${id}`), { params: Promise.resolve({ id }) });
    const decide = (id: string, input: object) => {
      activeId = id;
      return review.PATCH(new Request(`${base}/api/admin/upman-submissions/${id}`, { method: "PATCH", body: JSON.stringify(input) }), { params: Promise.resolve({ id }) });
    };

    identity = null;
    assert.equal((await submissions.POST(submissionRequest("Approve"))).status, 401);
    identity = "111";
    assert.equal((await submissions.POST(submissionRequest("Invalid", new Uint8Array([1, 2, 3])))).status, 400);
    assert.equal(written, 0);
    delete process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    assert.equal((await submissions.POST(submissionRequest("Approve"))).status, 503);
    process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = "fixture-only";
    failInsert = true;
    assert.equal((await submissions.POST(submissionRequest("Fail"))).status, 500);
    assert.equal(deleted, 1);
    failInsert = false;
    assert.equal((await submissions.POST(submissionRequest("Approve"))).status, 201);
    assert.equal((await submissions.POST(submissionRequest("Reject"))).status, 201);
    assert.equal((await submissions.POST(submissionRequest("Approve"))).status, 409);
    assert.equal(written, 3);
    const mySubmissions = (await (await submissions.GET()).json()).submissions;
    assert.equal(mySubmissions[0].image, "/api/submission-media/approve");
    assert.equal((await readImage("approve")).status, 200);
    identity = "333";
    assert.equal((await readImage("approve")).status, 404);
    identity = "222";
    const listed = (await (await queue.GET(new Request(`${base}/api/admin/upman-submissions?status=PENDING`))).json()).submissions;
    assert.equal(listed.length, 2);
    assert.equal(listed[0].image, "/api/submission-media/approve");
    assert.equal((await readImage("approve")).status, 200);
    linked = false;
    assert.equal((await decide("approve", { action: "approve", rarity: "Rare", represent: true })).status, 409);
    linked = true;
    assert.equal((await decide("approve", { action: "approve", rarity: "Rare", represent: true })).status, 409);
    const approval = { action: "approve", rarity: "Rare", represent: true, confirmReplaceRepresentation: true };
    assert.equal((await decide("approve", approval)).status, 200);
    assert.equal((await decide("approve", approval)).status, 200);
    assert.equal(newUpmanCount, 1);
    assert.equal((await decide("reject", { action: "reject" })).status, 200);
    assert.ok([...rows.values()].every(row => row.image === privateImage));
    assert.equal(deleted, 1);
    identity = null;
    assert.equal((await readImage("approve")).status, 404);
    publication = "PUBLIC";
    const publicImage = await readImage("approve");
    assert.equal(publicImage.status, 200);
    assert.deepEqual(new Uint8Array(await publicImage.arrayBuffer()), png);
    const lastRead = blobRead.mock.callCount();
    assert.equal((await readImage("reject")).status, 404);
    assert.equal(blobRead.mock.callCount(), lastRead);
  });
});
