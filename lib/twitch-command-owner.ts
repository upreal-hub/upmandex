import "server-only";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/authorization";
import { isReleaseOwner } from "@/lib/site-publication-policy";

export async function canManageTwitchCommands() {
  const id = (await auth())?.user?.twitchUserId;
  return isReleaseOwner(id, process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID) && (await requireAdmin()).ok;
}
