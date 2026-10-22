import assert from "node:assert/strict";
import test from "node:test";

import { isClassicCollectionUpman } from "./classic-collection";

test("includes only public, pullable Upmans from classic pull rarities", () => {
  assert.equal(isClassicCollectionUpman({ dexVisibility: "PUBLIC", isPullable: true, rarity: "Common" }), true);
  assert.equal(isClassicCollectionUpman({ dexVisibility: "PUBLIC", isPullable: true, rarity: "Legendary" }), true);
  assert.equal(isClassicCollectionUpman({ dexVisibility: "PUBLIC", isPullable: true, rarity: "Event" }), false);
  assert.equal(isClassicCollectionUpman({ dexVisibility: "PUBLIC", isPullable: true, rarity: "Secret" }), false);
  assert.equal(isClassicCollectionUpman({ dexVisibility: "HIDDEN", isPullable: true, rarity: "Rare" }), false);
  assert.equal(isClassicCollectionUpman({ dexVisibility: "PUBLIC", isPullable: false, rarity: "Epic" }), false);
});
