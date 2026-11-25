import { isGarticOwner } from "@/lib/gartic-feud-owner";
import { createGarticHostHandlers } from "@/lib/gartic-feud-host";

const handlers = createGarticHostHandlers(isGarticOwner);
export const GET = handlers.GET;
export const POST = handlers.POST;
