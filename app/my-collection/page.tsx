import { auth } from "@/auth";
import CollectionGallery, { type CollectionEntry } from "@/components/CollectionGallery";
import LoginButton from "@/components/LoginButton";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

import styles from "./collection.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyCollectionPage() {
  const session = await auth();
  const twitchLogin = normalizeTwitchLogin(session?.user?.name);

  if (!twitchLogin) {
    return <LoggedOutCollection />;
  }

  const [user, upmans] = await Promise.all([
    prisma.user.findUnique({
      where: { twitchLogin },
      select: { twitchLogin: true, displayName: true, avatar: true, inventory: { select: { upmanId: true } } },
    }),
    prisma.upman.findMany({
      orderBy: [{ name: "asc" }, { slug: "asc" }],
      select: { id: true, slug: true, name: true, image: true, rarity: true, creator: true, creatorTwitch: true },
    }),
  ]);

  if (!user) {
    return <LoggedOutCollection />;
  }

  const creatorLogins = upmans.map((upman) => upman.creatorTwitch).filter((login): login is string => Boolean(login));
  const creators = creatorLogins.length > 0 ? await prisma.user.findMany({ where: { twitchLogin: { in: creatorLogins } }, select: { twitchLogin: true, avatar: true } }) : [];
  const avatarsByLogin = new Map(creators.map((creator) => [creator.twitchLogin, creator.avatar]));
  const ownedIds = new Set(user.inventory.map((item) => item.upmanId));
  const entries: CollectionEntry[] = upmans.map((upman) => ({
    ...upman,
    rarity: upman.rarity as CollectionEntry["rarity"],
    creatorAvatar: upman.creatorTwitch ? avatarsByLogin.get(upman.creatorTwitch) ?? null : null,
    owned: ownedIds.has(upman.id),
  }));

  return (
    <main className={`collection-page ${styles.page}`}>
      <header className={styles.header}>
        {user.avatar && (
          // This is the stored avatar from the authenticated Twitch User record.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className={styles.avatar} />
        )}
        <div><p>Your part of the cloud world</p><h1>MY COLLECTION</h1><p className={styles.identity}><strong>{user.displayName}</strong> · @{user.twitchLogin}</p></div>
      </header>
      <CollectionGallery upmans={entries} ownedCount={user.inventory.length} />
    </main>
  );
}

function LoggedOutCollection() {
  return (
    <main className={`collection-page ${styles.page}`}>
      <section className={styles.login}>
        <p>Your part of the cloud world</p>
        <h1>MY COLLECTION</h1>
        <span>Your Upman collection is linked to Twitch. Connect to see every cloud you have found.</span>
        <LoginButton />
      </section>
    </main>
  );
}
