import assert from "node:assert/strict";
import test from "node:test";
import { submissionMediaResponse, type MediaContext } from "./submission-media-response";

function fixture() {
  const context: MediaContext = { image: "https://fixture.private.blob.vercel-storage.com/upman-submissions/test/image.png",
    access: { admin: false, owner: false, approvedPublic: false, privateSite: true, member: false } };
  let reads = 0;
  const deps = {
    load: async () => context,
    readPrivate: async () => { reads++; return { stream: new Response("fixture-private-bytes").body! }; },
    readLegacyPublic: async () => { reads++; return new Response("fixture-legacy-bytes"); },
  };
  return { context, deps, reads: () => reads };
}

test("private route denies direct URL guesses before touching storage", async () => {
  const f = fixture();
  assert.equal((await submissionMediaResponse("submission1", f.deps)).status, 404);
  f.context.access.admin = true; // An unlisted administrator cannot bypass PRIVATE.
  assert.equal((await submissionMediaResponse("submission1", f.deps)).status, 404);
  assert.equal(f.reads(), 0);
});
test("authorized media is streamed without a redirect or shared cache", async () => {
  const f = fixture();
  Object.assign(f.context.access, { member: true, owner: true });
  const response = await submissionMediaResponse("submission1", f.deps);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "fixture-private-bytes");
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(f.reads(), 1);
});
test("PUBLIC never exposes pending submissions to unrelated visitors", async () => {
  const f = fixture();
  f.context.access.privateSite = false;
  assert.equal((await submissionMediaResponse("submission1", f.deps)).status, 404);
  f.context.access.approvedPublic = true;
  assert.equal((await submissionMediaResponse("submission1", f.deps)).status, 200);
  f.context.access.privateSite = true;
  assert.equal((await submissionMediaResponse("submission1", f.deps)).status, 404);
});
test("stored media cannot redirect credentials or request arbitrary hosts", async () => {
  const f = fixture();
  Object.assign(f.context.access, { member: true, owner: true });
  for (const image of ["http://127.0.0.1/private", "https://evil.test/upman-submissions/a.png",
    "https://fixture.private.blob.vercel-storage.com/other/a.png",
    "https://user:password@fixture.private.blob.vercel-storage.com/upman-submissions/a.png",
    "https://fixture.private.blob.vercel-storage.com/upman-submissions/a.png?redirect=evil"]) {
    f.context.image = image;
    assert.equal((await submissionMediaResponse("submission1", f.deps)).status, 404);
  }
  assert.equal(f.reads(), 0);
});
test("a storage failure stays closed and never falls back to a public copy", async () => {
  const f = fixture();
  Object.assign(f.context.access, { member: true, owner: true });
  f.deps.readPrivate = async () => { throw Error("fixture failure"); };
  assert.equal((await submissionMediaResponse("submission1", f.deps)).status, 503);
  assert.equal(f.reads(), 0);
});
