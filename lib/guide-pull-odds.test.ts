import assert from "node:assert/strict";
import test from "node:test";
import { guidePullOdds } from "./guide-pull-odds";

test("the guide normalizes only enabled, positive, eligible standard rarity weights", () => {
  const rules = [
    { rarity: "Common", enabled: true, weight: 8 },
    { rarity: "Rare", enabled: true, weight: 2 },
    { rarity: "Epic", enabled: false, weight: 40 },
    { rarity: "Mythic", enabled: true, weight: 6 },
    { rarity: "Legendary", enabled: true, weight: 0 },
    { rarity: "Secret", enabled: true, weight: 80 },
  ];
  const eligible = new Set(["Common", "Rare", "Epic", "Legendary", "Secret"]);
  const odds = guidePullOdds(rules, eligible);
  assert.deepEqual(odds.map(row => [row.rarity, row.status, row.chance]), [
    ["Common", "active", .8], ["Rare", "active", .2], ["Epic", "disabled", 0], ["Mythic", "empty", 0], ["Legendary", "disabled", 0],
  ]);
  eligible.delete("Rare");
  assert.equal(guidePullOdds(rules, eligible)[0].chance, 1);
  assert.ok(guidePullOdds(rules, new Set()).every(row => row.chance === null));
  assert.ok(guidePullOdds([], eligible).every(row => row.status === "disabled" && row.chance === null));
});
