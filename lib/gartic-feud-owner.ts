import "server-only";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/authorization";
import { isReleaseOwner } from "@/lib/site-publication-policy";

export async function checkGarticOwner(twitchId: unknown, checkAdmin: () => Promise<{ ok: boolean }>) {
  return isReleaseOwner(twitchId, process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID) && (await checkAdmin()).ok;
}

export async function isGarticOwner() {
  return checkGarticOwner((await auth())?.user?.twitchUserId, requireAdmin);
}
