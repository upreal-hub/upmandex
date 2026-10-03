export const UP_MAN_RARITIES = [
  "Common",
  "Rare",
  "Epic",
  "Mythic",
  "Legendary",
  "Secret",
] as const;

export const PULL_RARITIES = [
  "Common",
  "Rare",
  "Epic",
  "Mythic",
  "Legendary",
] as const;

export type UpmanRarity = (typeof UP_MAN_RARITIES)[number];
export type PullRarity = (typeof PULL_RARITIES)[number];

export function isUpmanRarity(value: unknown): value is UpmanRarity {
  return typeof value === "string" && UP_MAN_RARITIES.includes(value as UpmanRarity);
}

export function isPullRarity(value: unknown): value is PullRarity {
  return typeof value === "string" && PULL_RARITIES.includes(value as PullRarity);
}
