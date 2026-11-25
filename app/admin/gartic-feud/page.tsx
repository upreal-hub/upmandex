import { notFound } from "next/navigation";
import { isGarticOwner } from "@/lib/gartic-feud-owner";
import Host from "./Host";

export default async function GarticFeudAdmin() {
  if (!await isGarticOwner()) notFound();
  return <Host />;
}
