export const PERSON_LINK_PLATFORMS = [
  "YOUTUBE",
  "INSTAGRAM",
  "TIKTOK",
  "BLUESKY",
  "X",
  "GITHUB",
  "WEBSITE",
  "PORTFOLIO",
] as const;

export type PersonLinkPlatform = (typeof PERSON_LINK_PLATFORMS)[number];

export const PERSON_LINK_PLATFORM_DETAILS: Record<PersonLinkPlatform, { label: string; marker: string }> = {
  YOUTUBE: { label: "YouTube", marker: "YT" },
  INSTAGRAM: { label: "Instagram", marker: "IG" },
  TIKTOK: { label: "TikTok", marker: "TT" },
  BLUESKY: { label: "Bluesky", marker: "BS" },
  X: { label: "X", marker: "X" },
  GITHUB: { label: "GitHub", marker: "GH" },
  WEBSITE: { label: "Website", marker: "WE" },
  PORTFOLIO: { label: "Portfolio", marker: "PF" },
};
