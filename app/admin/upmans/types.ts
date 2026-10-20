export type ManagedUpman = {
  id: string;
  slug: string;
  name: string;
  image: string;
  rarity: string;
  creator: string;
  creatorTwitch: string | null;
  dexVisibility: "PUBLIC" | "HIDDEN";
  isPullable: boolean;
  creatorPersonId: string | null;
  representedPersonId: string | null;
  creatorPerson: { id: string; displayName: string; isPublic: boolean; user: { twitchLogin: string; avatar: string | null } | null } | null;
  representedPerson: { id: string; displayName: string; isPublic: boolean; user: { twitchLogin: string; avatar: string | null } | null } | null;
  ownersCount: number;
  firstOwner: string | null;
  createdAt: Date;
  acquisitionRules: { id: string; method: string; isEnabled: boolean; externalKey: string | null; event: { name: string } | null }[];
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
