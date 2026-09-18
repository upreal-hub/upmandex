export type ViewerSummary = {
  id: string;
  twitchLogin: string;
  displayName: string;
  avatar: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
  ownedCount: number;
  completion: number;
  latestDiscoveryAt: Date | null;
};

export type ViewerDiscovery = {
  obtainedAt: string;
  upman: {
    slug: string;
    name: string;
    image: string;
    rarity: string;
  };
};

export type ViewerDetails = {
  twitchLogin: string;
  displayName: string;
  avatar: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  ownedCount: number;
  completion: number;
  latestDiscovery: ViewerDiscovery | null;
  rarityBreakdown: Record<"Common" | "Rare" | "Epic" | "Mythic" | "Legendary", number>;
  recentDiscoveries: ViewerDiscovery[];
};
