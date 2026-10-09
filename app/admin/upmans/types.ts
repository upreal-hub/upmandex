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

export type EventUpmanOption = {
  id: string;
  slug: string;
  name: string;
};

export type ActiveEventUpmanConfig = {
  eventName: string;
  eventSlug: string;
  selectedUpmanId: string | null;
  selectedUpmanName: string | null;
  rewardId: string;
  isActive: boolean;
};

export { UP_MAN_RARITIES } from "@/lib/upman-rarity";
export type { UpmanRarity } from "@/lib/upman-rarity";
