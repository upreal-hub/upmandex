import "server-only";

import { validateUpmanPngBytes, type PngImageInfo } from "@/lib/png-validation";

export const UPMAN_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const UPMAN_BLOB_PREFIX = "/upmans/";
export type { PngImageInfo } from "@/lib/png-validation";

export function getUpmanBlobPath(slug: string): string {
  return `upmans/${slug}.png`;
}

export function isManagedUpmanBlobUrl(value: string): boolean {
  const storeId = process.env.BLOB_STORE_ID;

  if (!storeId) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === `${storeId}.public.blob.vercel-storage.com` &&
      url.port === "" &&
      url.pathname.startsWith(UPMAN_BLOB_PREFIX) &&
      url.pathname.endsWith(".png") &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

export async function validateUpmanPngFile(file: File): Promise<PngImageInfo | null> {
  return validateUpmanPngBytes(new Uint8Array(await file.arrayBuffer()));
}
