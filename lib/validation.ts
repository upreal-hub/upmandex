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
const TWITCH_USER_ID_PATTERN = /^[1-9][0-9]{0,29}$/;
const TWITCH_REDEMPTION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nonEmptyString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function optionalId(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return typeof value === "string" && /^[a-z0-9]+$/i.test(value) && value.length <= 64
    ? value
    : undefined;
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
        creatorPersonId?: string | null;
        representedPersonId?: string | null;
        confirmRepresentedPersonRemoval: boolean;
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
  const hasCreatorPersonId = Object.hasOwn(payload, "creatorPersonId");
  const hasRepresentedPersonId = Object.hasOwn(payload, "representedPersonId");
  const creatorPersonId = hasCreatorPersonId ? optionalId(payload.creatorPersonId) : undefined;
  const representedPersonId = hasRepresentedPersonId ? optionalId(payload.representedPersonId) : undefined;
  const confirmRepresentedPersonRemoval = payload.confirmRepresentedPersonRemoval === true;

  if (
    !slug ||
    !name ||
    !creator ||
    !rarity ||
    (hasCreatorPersonId && creatorPersonId === undefined) ||
    (hasRepresentedPersonId && representedPersonId === undefined) ||
    (rarity === "Common" && representedPersonId !== undefined && representedPersonId !== null)
  ) {
    return { success: false, error: "Invalid Upman payload" };
  }

  return {
    success: true,
    data: {
      slug,
      name,
      creator,
      rarity,
      creatorPersonId,
      representedPersonId,
      confirmRepresentedPersonRemoval,
    },
  };
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
        creatorPersonId: string | null;
        representedPersonId: string | null;
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
  const creatorPersonId = optionalId(payload.creatorPersonId);
  const representedPersonId = optionalId(payload.representedPersonId);

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

  if (
    !slug ||
    !name ||
    !creator ||
    !rarity ||
    creatorPersonId === undefined ||
    representedPersonId === undefined ||
    (rarity === "Common" && representedPersonId !== null)
  ) {
    return { success: false, error: "Invalid Upman details" };
  }

  return {
    success: true,
    data: {
      slug,
      name,
      creator,
      creatorTwitch,
      rarity,
      creatorPersonId,
      representedPersonId,
    },
  };
}

export function validateUpmanRelationshipPayload(value: unknown):
  | {
      success: true;
      data:
        | { relation: "creator" | "represented"; source: "unlink" }
        | { relation: "creator" | "represented"; source: "existing-person"; personId: string }
        | {
            relation: "creator" | "represented";
            source: "create-person";
            displayName: string;
            userId: string | null;
          };
    }
  | { success: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Invalid relationship request" };
  }

  const payload = value as Record<string, unknown>;
  const relation = payload.relation;
  const source = payload.source;
  if ((relation !== "creator" && relation !== "represented") || typeof source !== "string") {
    return { success: false, error: "Invalid relationship request" };
  }

  if (source === "unlink") return { success: true, data: { relation, source } };

  if (source === "existing-person") {
    const personId = optionalId(payload.personId);
    return personId
      ? { success: true, data: { relation, source, personId } }
      : { success: false, error: "Select a valid Person" };
  }

  if (source === "create-person") {
    const displayName = nonEmptyString(payload.displayName, 120);
    const userId = optionalId(payload.userId);
    return displayName && userId !== undefined
      ? { success: true, data: { relation, source, displayName, userId } }
      : { success: false, error: "Invalid Person details" };
  }

  return { success: false, error: "Invalid relationship request" };
}

export function validatePersonPayload(value: unknown):
  | { success: true; data: { displayName: string; userId: string | null; isPublic: boolean } }
  | { success: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Invalid Person details" };
  }

  const payload = value as Record<string, unknown>;
  const displayName = nonEmptyString(payload.displayName, 120);
  const userId = optionalId(payload.userId);
  const isPublic = payload.isPublic;

  if (!displayName || userId === undefined || typeof isPublic !== "boolean") {
    return { success: false, error: "Invalid Person details" };
  }

  return { success: true, data: { displayName, userId, isPublic } };
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

export function validatePullPayload(value: unknown):
  | {
      success: true;
      data: {
        requestId: string;
        viewer: {
          twitchUserId: string;
          twitchLogin: string;
          displayName: string;
        };
      };
    }
  | { success: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Invalid pull request" };
  }

  const payload = value as Record<string, unknown>;
  const requestId = nonEmptyString(payload.requestId, 64);
  const viewer = payload.viewer;

  if (!requestId || !TWITCH_REDEMPTION_ID_PATTERN.test(requestId)) {
    return { success: false, error: "Invalid request ID" };
  }

  if (!viewer || typeof viewer !== "object" || Array.isArray(viewer)) {
    return { success: false, error: "Invalid viewer" };
  }

  const viewerPayload = viewer as Record<string, unknown>;
  const twitchUserId = nonEmptyString(viewerPayload.twitchUserId, 30);
  const twitchLogin = normalizeTwitchLogin(viewerPayload.twitchLogin);
  const displayName = nonEmptyString(viewerPayload.displayName, 120);

  if (
    !twitchUserId ||
    !TWITCH_USER_ID_PATTERN.test(twitchUserId) ||
    !twitchLogin ||
    !displayName
  ) {
    return { success: false, error: "Invalid viewer" };
  }

  return {
    success: true,
    data: {
      requestId: requestId.toLowerCase(),
      viewer: { twitchUserId, twitchLogin, displayName },
    },
  };
}
