import ProfileCosmeticsManager from "./ProfileCosmeticsManager";
import { listProfileCosmetics } from "@/lib/profile-cosmetics";

export default async function ProfileCosmeticsPage() {
  const assets = await listProfileCosmetics();
  return <ProfileCosmeticsManager initialAssets={assets.map((asset) => ({ ...asset, createdAt: asset.createdAt.toISOString(), updatedAt: asset.updatedAt.toISOString() }))} />;
}
