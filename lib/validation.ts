export const RARITIES = [
  "Common",
  "Rare",
  "Epic",
  "Mythic",
  "Legendary",
] as const;

export type Rarity = (typeof RARITIES)[number];

const TWITCH_LOGIN_PATTERN = /^[a-z0-9_]{1,25}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function nonEmptyString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export function normalizeTwitchLogin(value: unknown): string | null {
  const login = nonEmptyString(value, 25)?.toLowerCase();
  return login && TWITCH_LOGIN_PATTERN.test(login) ? login : null;
}

export function validateSlug(value: unknown): string | null {
  const slug = nonEmptyString(value, 80)?.toLowerCase();
  return slug && SLUG_PATTERN.test(slug) ? slug : null;
}

export function validateRarity(value: unknown): Rarity | null {
  return typeof value === "string" && RARITIES.includes(value as Rarity)
    ? (value as Rarity)
    : null;
}

export function validateUpmanPayload(value: unknown):
  | {
      success: true;
      data: {
        slug: string;
        name: string;
        creator: string;
        rarity: Rarity;
        image: string;
      };
    }
  | { success: false; error: string } {
  if (!value || typeof value !== "object") {
    return { success: false, error: "Invalid Upman payload" };
  }

  const payload = value as Record<string, unknown>;
  const slug = validateSlug(payload.slug);
  const name = nonEmptyString(payload.name, 120);
  const creator = nonEmptyString(payload.creator, 120);
  const rarity = validateRarity(payload.rarity);
  const image = nonEmptyString(payload.image, 200);

  if (!slug || !name || !creator || !rarity || !image) {
    return { success: false, error: "Invalid Upman payload" };
  }

  if (image !== `/upmans/${slug}.png`) {
    return { success: false, error: "Invalid Upman image" };
  }

  return { success: true, data: { slug, name, creator, rarity, image } };
}

export function validateUpmanUpdatePayload(value: unknown):
  | {
      success: true;
      data: {
        slug: string;
        name: string;
        creator: string;
        rarity: Rarity;
      };
    }
  | { success: false; error: string } {
  if (!value || typeof value !== "object") {
    return { success: false, error: "Invalid Upman payload" };
  }

  const payload = value as Record<string, unknown>;
  const slug = validateSlug(payload.slug);
  const name = nonEmptyString(payload.name, 120);
  const creator = nonEmptyString(payload.creator, 120);
  const rarity = validateRarity(payload.rarity);

  if (!slug || !name || !creator || !rarity) {
    return { success: false, error: "Invalid Upman payload" };
  }

  return { success: true, data: { slug, name, creator, rarity } };
}

export function validateUploadedUpmanPayload(value: unknown):
  | {
      success: true;
      data: {
        slug: string;
        name: string;
        creator: string;
        creatorTwitch: string | null;
        rarity: Rarity;
      };
    }
  | { success: false; error: string } {
  if (!value || typeof value !== "object") {
    return { success: false, error: "Invalid Upman details" };
  }

  const payload = value as Record<string, unknown>;
  const slug = validateSlug(payload.slug);
  const name = nonEmptyString(payload.name, 120);
  const creator = nonEmptyString(payload.creator, 120);
  const rarity = validateRarity(payload.rarity);
  const creatorTwitchValue = payload.creatorTwitch;

  let creatorTwitch: string | null = null;

  if (creatorTwitchValue !== null && creatorTwitchValue !== undefined) {
    if (typeof creatorTwitchValue !== "string") {
      return { success: false, error: "Invalid creator Twitch login" };
    }

    if (creatorTwitchValue.trim()) {
      creatorTwitch = normalizeTwitchLogin(creatorTwitchValue);

      if (!creatorTwitch) {
        return { success: false, error: "Invalid creator Twitch login" };
      }
    }
  }

  if (!slug || !name || !creator || !rarity) {
    return { success: false, error: "Invalid Upman details" };
  }

  return {
    success: true,
    data: { slug, name, creator, creatorTwitch, rarity },
  };
}

export function validateInventoryPayload(value: unknown):
  | { success: true; data: { viewer: string; slug: string } }
  | { success: false; error: string } {
  if (!value || typeof value !== "object") {
    return { success: false, error: "Missing viewer or slug" };
  }

  const payload = value as Record<string, unknown>;
  const viewer = normalizeTwitchLogin(payload.viewer);
  const slug = validateSlug(payload.slug);

  if (!viewer || !slug) {
    return { success: false, error: "Missing viewer or slug" };
  }

  return { success: true, data: { viewer, slug } };
}
