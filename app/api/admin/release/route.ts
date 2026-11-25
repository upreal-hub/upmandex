import { auth } from "@/auth";
import { requireAdmin } from "@/lib/authorization";
import { createPublicationHandlers } from "@/lib/site-publication-handler";

export const dynamic = "force-dynamic";
const handlers = createPublicationHandlers(async () => {
  if (!(await requireAdmin()).ok) return null;
  return (await auth())?.user?.twitchUserId ?? null;
});
export const GET = handlers.GET;
export const POST = handlers.POST;
