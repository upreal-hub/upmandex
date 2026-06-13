import upmansData from "./upmans.json";

export type Upman = {
  slug: string;
  name: string;
  rarity: string;
  creator: string;
  image: string;
  firstOwner?: string;
  owners?: number;
};

export const upmans = upmansData as Upman[];