import type { ActivityAction, ActivityOrigin } from "@/app/generated/prisma/client";

export type ActivityActor = {
  id: string;
  twitchLogin: string;
};

export type ActivityContext = {
  origin: ActivityOrigin;
  actor?: ActivityActor | null;
};

type ActivityTarget = {
  id: string;
  twitchLogin: string;
};

type ActivityUpman = {
  id: string;
  slug: string;
  name: string;
};

type ActivityPerson = {
  id: string;
  displayName: string;
};

export type ActivityMetadata =
  | {
      before: { name: string; creator: string; rarity: string };
      after: { name: string; creator: string; rarity: string };
    }
  | { inventoryRemoved: number }
  | {
      requestId: string;
      result: "new" | "duplicate";
      twitchUserId: string;
    }
  | {
      before: { creatorPerson: string | null; representedPerson: string | null };
      after: { creatorPerson: string | null; representedPerson: string | null };
    }
  | {
      changes: string[];
      linkedUserLogin?: string | null;
    };

export function createActivityLogData({
  action,
  context,
  target,
  upman,
  person,
  metadata,
}: {
  action: ActivityAction;
  context: ActivityContext;
  target?: ActivityTarget;
  upman?: ActivityUpman;
  person?: ActivityPerson;
  metadata?: ActivityMetadata;
}) {
  return {
    action,
    origin: context.origin,
    actorUserId: context.actor?.id,
    actorLogin: context.actor?.twitchLogin,
    targetUserId: target?.id,
    targetLogin: target?.twitchLogin,
    upmanId: upman?.id,
    upmanSlug: upman?.slug,
    upmanName: upman?.name,
    personId: person?.id,
    personDisplayName: person?.displayName,
    ...(metadata ? { metadata } : {}),
  };
}

export type ActivityDisplayEntry = {
  action: ActivityAction;
  origin: ActivityOrigin;
  actorLogin: string | null;
  targetLogin: string | null;
  upmanName: string | null;
  upmanSlug: string | null;
  personDisplayName?: string | null;
};

function actorLabel(entry: ActivityDisplayEntry) {
  if (entry.actorLogin) return entry.actorLogin;
  if (entry.origin === "STREAMERBOT") return "Streamer.bot";
  return "System";
}

function upmanLabel(entry: ActivityDisplayEntry) {
  return entry.upmanName ?? entry.upmanSlug ?? "an Upman";
}

function personLabel(entry: ActivityDisplayEntry) {
  return entry.personDisplayName ?? "a Person";
}

export function formatActivityDescription(entry: ActivityDisplayEntry) {
  const actor = actorLabel(entry);
  const upman = upmanLabel(entry);
  const target = entry.targetLogin ?? "a viewer";

  switch (entry.action) {
    case "UPMAN_GRANTED":
      return `${actor} granted ${upman} to ${target}`;
    case "UPMAN_REMOVED":
      return `${actor} removed ${upman} from ${target}`;
    case "UPMAN_CREATED":
      return `${actor} created ${upman}`;
    case "UPMAN_UPDATED":
      return `${actor} updated ${upman}`;
    case "UPMAN_DELETED":
      return `${actor} deleted ${upman}`;
    case "PULL_RESOLVED":
      return `${actor} resolved a pull of ${upman} for ${target}`;
    case "PERSON_CREATED":
      return `${actor} created ${personLabel(entry)}`;
    case "PERSON_UPDATED":
      return `${actor} updated ${personLabel(entry)}`;
    case "UPMAN_RELATIONSHIPS_UPDATED":
      return `${actor} updated relationships for ${upman}`;
  }
}
