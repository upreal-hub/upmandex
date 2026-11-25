import type { Prisma } from "@/app/generated/prisma/client";
import { createActivityLogData, type ActivityActor } from "@/lib/activity";
import { normalizeTwitchLogin, validateSlug } from "@/lib/validation";
import { hasCreatorCredit } from "@/lib/upman-identity";

type Credit = { creator: string; creatorTwitch: string | null; creatorPersonId: string | null };
type Mutation = { expected: Credit } & ({ operation: "delete" } | {
  operation: "add" | "edit";
  displayName: string;
  twitchLogin: string | null;
  personId: string | null;
  userId: string | null;
});

const id = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9]{1,64}$/i.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseMutation(input: unknown): Mutation | null {
  if (!record(input) || !record(input.expected)) return null;
  const { creator, creatorTwitch, creatorPersonId } = input.expected;
  if (typeof creator !== "string" || (creatorTwitch !== null && typeof creatorTwitch !== "string")
    || (creatorPersonId !== null && !id(creatorPersonId))) return null;
  const expected = { creator, creatorTwitch, creatorPersonId };
  if (input.operation === "delete") return { operation: "delete", expected };
  if (input.operation !== "add" && input.operation !== "edit") return null;
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  const { personId, userId } = input;
  if (!displayName || displayName.length > 120 || /[\u0000-\u001f\u007f]/.test(displayName)
    || (personId !== null && !id(personId)) || (userId !== null && !id(userId)) || (personId && userId)) return null;
  if (typeof input.twitchLogin !== "string") return null;
  const twitchLogin = normalizeTwitchLogin(input.twitchLogin.replace(/^\s*@/, ""));
  if (input.twitchLogin.trim() && !twitchLogin) return null;
  return { operation: input.operation, expected, displayName, twitchLogin, personId, userId };
}

async function updateCredit(tx: Prisma.TransactionClient, slug: string, mutation: Mutation, actor: ActivityActor) {
  const before = await tx.upman.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, creator: true, creatorTwitch: true, creatorPersonId: true },
  });
  if (!before) return { status: 404, error: "Upman not found." };
  const { expected, operation } = mutation;
  if (before.creator !== expected.creator || before.creatorTwitch !== expected.creatorTwitch
    || before.creatorPersonId !== expected.creatorPersonId || hasCreatorCredit(before) === (operation === "add")) {
    return { status: 409, error: "The creator credit changed. Reopen the editor and check the current credit." };
  }

  const after: Credit = { creator: "", creatorTwitch: null, creatorPersonId: null };
  if (mutation.operation !== "delete") {
    after.creator = mutation.displayName;
    after.creatorTwitch = mutation.twitchLogin;
    const person = mutation.personId ? await tx.person.findUnique({
      where: { id: mutation.personId }, select: { id: true, isPublic: true, user: { select: { twitchLogin: true } } },
    }) : null;
    if (mutation.personId && !person) return { status: 400, error: "Selected Person no longer exists." };
    if (person) {
      if (person.user && mutation.twitchLogin && mutation.twitchLogin !== normalizeTwitchLogin(person.user.twitchLogin)) {
        return { status: 409, error: "The Twitch login differs from the selected account. Choose the correct account." };
      }
      after.creatorPersonId = person.id;
      if (person.user) after.creatorTwitch = person.isPublic ? person.user.twitchLogin : null;
    }
    if (mutation.userId) {
      const user = await tx.user.findUnique({
        where: { id: mutation.userId }, select: { id: true, twitchLogin: true, person: { select: { id: true, isPublic: true } } },
      });
      if (!user) return { status: 400, error: "Selected User no longer exists." };
      if (mutation.twitchLogin && mutation.twitchLogin !== normalizeTwitchLogin(user.twitchLogin)) {
        return { status: 409, error: "The Twitch login differs from the selected account. Choose the correct account." };
      }
      after.creatorPersonId = user.person?.id ?? null;
      after.creatorTwitch = user.person?.isPublic === false ? null : user.twitchLogin;
    }
  }

  await tx.upman.update({ where: { id: before.id, ...expected }, data: after });
  await tx.activityLog.create({
    data: createActivityLogData({
      action: "UPMAN_RELATIONSHIPS_UPDATED", context: { origin: "ADMIN", actor }, upman: before,
      metadata: { changes: [`creator credit: ${operation}`], before: expected, after },
    }),
  });
  return { status: 200 };
}

type Dependencies = {
  authorize: () => Promise<{ ok: false; response: Response } | { ok: true; user: ActivityActor }>;
  transaction: (action: (tx: Prisma.TransactionClient) => ReturnType<typeof updateCredit>) => ReturnType<typeof updateCredit>;
};

export async function handleCreatorCredit(request: Request, rawSlug: string, deps: Dependencies): Promise<Response> {
  const authorization = await deps.authorize();
  if (!authorization.ok) return authorization.response;
  const slug = validateSlug(rawSlug);
  const mutation = parseMutation(await request.json().catch(() => null));
  if (!slug || !mutation) return Response.json({ error: "Invalid creator credit." }, { status: 400 });
  try {
    const result = await deps.transaction(tx => updateCredit(tx, slug, mutation, authorization.user));
    return Response.json(result.error ? { error: result.error } : { success: true }, { status: result.status });
  } catch (error) {
    const code = record(error) ? error.code : null;
    if (code === "P2025" || code === "P2034" || code === "P2002") {
      return Response.json({ error: "A concurrent change prevented the update. Reload and try again." }, { status: 409 });
    }
    return Response.json({ error: "Unable to update the creator credit." }, { status: 500 });
  }
}
