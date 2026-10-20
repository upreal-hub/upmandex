export type IdentityUser = {
  twitchLogin: string;
  avatar: string | null;
};

export type CreatorPersonIdentity = {
  id: string;
  displayName: string;
  isPublic: boolean;
  user: IdentityUser | null;
};

export type LegacyCreatorIdentity = {
  creator: string;
  creatorTwitch: string | null;
};

export type ResolvedCreatorIdentity = {
  displayName: string;
  twitchLogin: string | null;
  avatar: string | null;
  source: "canonical" | "legacy" | "unknown";
};

/**
 * Resolves the public-facing creator without inferring an identity from a name.
 * A non-public Person is deliberately ignored outside Admin; legacy attribution
 * remains available as the compatibility fallback.
 */
export function resolvePublicCreatorIdentity(
  legacy: LegacyCreatorIdentity,
  creatorPerson: CreatorPersonIdentity | null,
  legacyAvatar: string | null = null,
): ResolvedCreatorIdentity {
  if (creatorPerson?.isPublic) {
    return {
      displayName: creatorPerson.displayName,
      twitchLogin: creatorPerson.user?.twitchLogin ?? null,
      avatar: creatorPerson.user?.avatar ?? null,
      source: "canonical",
    };
  }

  if (legacy.creator || legacy.creatorTwitch) {
    return {
      displayName: legacy.creator || "Unknown creator",
      twitchLogin: legacy.creatorTwitch,
      avatar: legacyAvatar,
      source: "legacy",
    };
  }

  return { displayName: "Unknown creator", twitchLogin: null, avatar: null, source: "unknown" };
}

export type AssociationStatus = "Linked" | "Legacy only" | "Mismatch" | "Unlinked";

/** A mismatch is only a contradictory verified Twitch login; display names alone are not proof. */
export function getCreatorAssociationStatus(
  legacy: LegacyCreatorIdentity,
  creatorPerson: CreatorPersonIdentity | null,
): AssociationStatus {
  if (creatorPerson) {
    const canonicalLogin = creatorPerson.user?.twitchLogin?.toLocaleLowerCase();
    const legacyLogin = legacy.creatorTwitch?.toLocaleLowerCase();
    if (canonicalLogin && legacyLogin && canonicalLogin !== legacyLogin) return "Mismatch";
    return "Linked";
  }

  return legacy.creator || legacy.creatorTwitch ? "Legacy only" : "Unlinked";
}
