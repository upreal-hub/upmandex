import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { changeCatalog, copyCommand, publicCommands, searchCommands, type CommandCatalog } from "./twitch-command-catalog";
import { isReleaseOwner } from "./site-publication-policy";

const sql = readFileSync("prisma/migrations/20261124160000_twitch_command_catalog/migration.sql", "utf8");
const seed = JSON.parse(sql.match(/\$catalog\$([\s\S]+?)\$catalog\$/)![1]) as CommandCatalog;
const unchanged = () => structuredClone(seed);
const makeId = () => "fixture-id";

test("the migration seeds the official catalog with valid entries and never overwrites existing data", () => {
  assert.equal(seed.commands.length, 25);
  assert.deepEqual(seed.categories.map(category => category.title), ["Chat & Fun", "Gartic & Games", "UPMANDEX & Community", "Music", "Stream Information"]);
  assert.match(sql, /ON CONFLICT \("id"\) DO NOTHING/);
  for (const command of seed.commands) {
    assert.doesNotThrow(() => changeCatalog(seed, { type: "saveCommand", id: command.id, value: command }, makeId));
  }
  assert.deepEqual(seed.commands.filter(c => c.global || c.viewer).map(c => [c.id, c.global, c.viewer]), [
    ["8ball", 10, 30], ["dadjoke", 60, 20], ["hug", 0, 3], ["wyr", 60, 0], ["upmandex", 15, 0],
    ["sr", 0, 10], ["song", 60, 0], ["queue", 30, 0], ["when", 0, 30], ["voteskip", 0, 60], ["wrongsong", 0, 60], ["clip", 60, 0],
  ]);
});

test("search combines aliases, case-insensitive terms and category filters; copy sends the usable example", async () => {
  const catalog = publicCommands(seed);
  assert.deepEqual(searchCommands(catalog.commands, "!DCORD", "community").map(c => c.id), ["discord"]);
  assert.deepEqual(searchCommands(catalog.commands, "!BRB", "music"), []);
  assert.deepEqual(searchCommands(catalog.commands, "!modegallery gartic", "games").map(c => c.id), ["nata"]);
  const hug = catalog.commands.find(c => c.id === "hug")!;
  const written: string[] = [];
  assert.equal(await copyCommand({ writeText: async value => { written.push(value); } }, hug.example), "!hug @cloudviewer");
  assert.deepEqual(written, ["!hug @cloudviewer"]);
  await assert.rejects(copyCommand({ writeText: async () => { throw new Error("unavailable"); } }, hug.example));
});

test("admin catalog operations protect hidden aliases, update visibility immediately and support category CRUD", () => {
  let catalog = unchanged();
  const value = { ...catalog.commands[0], syntax: "!testing <word>", example: "!testing cloud", aliases: ["!testalias"], order: 0 };
  catalog = changeCatalog(catalog, { type: "saveCommand", value }, makeId);
  assert.equal(searchCommands(publicCommands(catalog).commands, "!testalias", "").length, 1);
  catalog = changeCatalog(catalog, { type: "saveCommand", id: "fixture-id", value: { ...value, visible: false, aliases: ["!oldalias"] } }, makeId);
  assert.equal(searchCommands(publicCommands(catalog).commands, "!testing", "").length, 0);
  assert.equal(searchCommands(publicCommands(catalog).commands, "!oldalias", "").length, 0);
  let draft = { ...value, syntax: "!OLDALIAS", example: "!OLDALIAS" };
  assert.throws(() => changeCatalog(catalog, { type: "saveCommand", value: draft }, makeId), /unique/);
  draft = { ...value, aliases: ["!Testing"] };
  assert.throws(() => changeCatalog(catalog, { type: "saveCommand", id: "fixture-id", value: draft }, makeId), /unique/);
  assert.throws(() => changeCatalog(catalog, { type: "saveCommand", value: { ...value, viewer: -1 } }, makeId));
  assert.throws(() => changeCatalog(catalog, { type: "deleteCategory", id: "chat" }, makeId), /Move or delete/);
  catalog = changeCatalog(catalog, { type: "deleteCommand", id: "fixture-id" }, makeId);
  catalog = changeCatalog(catalog, { type: "saveCategory", value: { title: "Extras", order: 2 } }, makeId);
  catalog = changeCatalog(catalog, { type: "saveCategory", id: "fixture-id", value: { title: "Bonus", order: 3 } }, makeId);
  assert.equal(catalog.categories.find(c => c.id === "fixture-id")?.title, "Bonus");
  catalog = changeCatalog(catalog, { type: "deleteCategory", id: "fixture-id" }, makeId);
  assert.equal(catalog.categories.length, 5);
  assert.equal(catalog.commands.length, 25);
  assert.equal(isReleaseOwner("111", "111"), true);
  assert.equal(isReleaseOwner("222", "111"), false);
});
