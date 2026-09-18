import "server-only";

export const UPMAN_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const UPMAN_BLOB_PREFIX = "/upmans/";

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

export async function isPngFile(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer());

  return (
    header.length === PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((value, index) => header[index] === value)
  );
}
