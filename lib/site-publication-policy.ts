export type PublicationState = { status: "PRIVATE" | "PUBLIC"; version: number };

export function isReleaseOwner(id: unknown, configured: string | undefined) {
  return typeof configured === "string" && /^[1-9]\d{0,29}$/.test(configured) && id === configured;
}

export function publicationRequest(input: unknown): { status: "PRIVATE" | "PUBLIC"; version: number } | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if ((value.status !== "PUBLIC" && value.status !== "PRIVATE") ||
      !Number.isSafeInteger(value.version) || (value.version as number) < 0 ||
      value.confirmation !== (value.status === "PUBLIC" ? "Release UPMANDEX" : "Return to PRIVATE")) return null;
  return { status: value.status, version: value.version as number };
}

export function canReadSubmissionMedia(input: {
  admin: boolean; owner: boolean; approvedPublic: boolean; privateSite: boolean; member: boolean;
}) {
  return (!input.privateSite || input.member) && (input.admin || input.owner || input.approvedPublic);
}
