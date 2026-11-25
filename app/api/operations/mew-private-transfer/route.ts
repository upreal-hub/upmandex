import { auth } from '@/auth';
import { requireAdmin } from '@/lib/authorization';
import { createMewSessionHandlers } from '@/lib/mew-session-operation.mjs';
import { mewTarget } from '@/lib/mew-runtime-target.mjs';
import { runRuntimeMew } from '@/lib/mew-runtime-transfer.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const handlers = createMewSessionHandlers({
  currentUser: async () => {
    const session = await auth();
    if (!session?.user?.twitchUserId) return null;
    const authorization = await requireAdmin();
    return authorization.ok ? { ...authorization.user, twitchUserId: session.user.twitchUserId } : null;
  },
  target: mewTarget,
  run: runRuntimeMew,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
