import { notFound } from "next/navigation";
import { canManageTwitchCommands } from "@/lib/twitch-command-owner";
import { readCommandCatalog } from "@/lib/twitch-command-store";
import CommandManager from "./CommandManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!await canManageTwitchCommands()) notFound();
  const initial = await readCommandCatalog().catch(() => null);
  if (!initial) return <p role="alert">The Twitch Commands catalog is unavailable.</p>;
  return <CommandManager initial={initial} />;
}
