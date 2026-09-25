export type ManagedUpman = {
  id: string;
  slug: string;
  name: string;
  image: string;
  rarity: string;
  creator: string;
  creatorTwitch: string | null;
  creatorPersonId: string | null;
  representedPersonId: string | null;
  creatorPerson: { id: string; displayName: string } | null;
  representedPerson: { id: string; displayName: string } | null;
  ownersCount: number;
  firstOwner: string | null;
  createdAt: Date;
};

export type PersonOption = {
  id: string;
  displayName: string;
};

export const UP_MAN_RARITIES = [
  "Common",
  "Rare",
  "Epic",
  "Mythic",
  "Legendary",
] as const;

export type UpmanRarity = (typeof UP_MAN_RARITIES)[number];
