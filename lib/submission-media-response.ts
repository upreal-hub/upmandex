import { canReadSubmissionMedia } from "./site-publication-policy";

export type MediaContext = {
  image: string;
  access: Parameters<typeof canReadSubmissionMedia>[0];
};
type PrivateObject = { stream: ReadableStream<Uint8Array> } | null;
type Dependencies = {
  load: (id: string) => Promise<MediaContext | null>;
  readPrivate: (url: string) => Promise<PrivateObject>;
  readLegacyPublic: (url: string) => Promise<Response>;
};
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function submissionMediaResponse(id: string, deps: Dependencies) {
  if (!/^[a-z0-9]+$/i.test(id)) return new Response(null, { status: 404, headers });
  try {
    const context = await deps.load(id);
    if (!context || !canReadSubmissionMedia(context.access)) return new Response(null, { status: 404, headers });
    const url = new URL(context.image);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash ||
        !url.pathname.startsWith("/upman-submissions/")) return new Response(null, { status: 404, headers });
    if (/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(url.hostname)) {
      const blob = await deps.readPrivate(context.image);
      return blob ? new Response(blob.stream, { headers: { ...headers, "Content-Type": "image/png" } })
        : new Response(null, { status: 404, headers });
    }
    // Compatibility only: existing public originals must still be migrated/revoked separately.
    if (/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname)) {
      const legacy = await deps.readLegacyPublic(context.image);
      return legacy.ok ? new Response(legacy.body, { headers: { ...headers, "Content-Type": "image/png" } })
        : new Response(null, { status: 404, headers });
    }
    return new Response(null, { status: 404, headers });
  } catch { return new Response(null, { status: 503, headers }); }
}
