import { auth } from "@/auth";
import CollectionGallery, { type CollectionEntry } from "@/components/CollectionGallery";
import LoginButton from "@/components/LoginButton";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";
import { collectionUpmanWhere } from "@/lib/upman-visibility";

import styles from "./collection.module.css";
import titleStyles from "./collection-title.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyCollectionPage() {
  const session = await auth();
  const twitchLogin = normalizeTwitchLogin(session?.user?.name);

  if (!twitchLogin) {
    return <LoggedOutCollection />;
  }

  const user = await prisma.user.findUnique({
    where: { twitchLogin },
    select: { id: true, twitchLogin: true, displayName: true, avatar: true, inventory: { select: { upmanId: true } } },
  });

  if (!user) {
    return <LoggedOutCollection />;
  }

  const visibleUpmans = await prisma.upman.findMany({
    where: collectionUpmanWhere(user.id),
    orderBy: [{ name: "asc" }, { slug: "asc" }],
    select: { id: true, slug: true, name: true, image: true, rarity: true, creator: true, creatorTwitch: true },
  });

  const creatorLogins = visibleUpmans.map((upman) => upman.creatorTwitch).filter((login): login is string => Boolean(login));
  const creators = creatorLogins.length > 0 ? await prisma.user.findMany({ where: { twitchLogin: { in: creatorLogins } }, select: { twitchLogin: true, avatar: true } }) : [];
  const avatarsByLogin = new Map(creators.map((creator) => [creator.twitchLogin, creator.avatar]));
  const ownedIds = new Set(user.inventory.map((item) => item.upmanId));
  const entries: CollectionEntry[] = visibleUpmans.map((upman) => ({
    ...upman,
    rarity: upman.rarity as CollectionEntry["rarity"],
    creatorAvatar: upman.creatorTwitch ? avatarsByLogin.get(upman.creatorTwitch) ?? null : null,
    owned: ownedIds.has(upman.id),
    canViewDetails: true,
  }));

  return (
    <main className={`collection-page ${styles.page} ${titleStyles.titlePolish}`}>
      <header className={styles.header}>
        {user.avatar && (
          // This is the stored avatar from the authenticated Twitch User record.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className={styles.avatar} />
        )}
        <div><p>Your part of the cloud world</p><h1>MY COLLECTION</h1><p className={styles.identity}><strong>{user.displayName}</strong> · @{user.twitchLogin}</p><span className={styles.subtitle}>Every discovery gives your sky a little more character.</span></div>
      </header>
      <CollectionGallery upmans={entries} ownedCount={user.inventory.length} />
    </main>
  );
}

function LoggedOutCollection() {
  return (
    <main className={`collection-page ${styles.page} ${titleStyles.titlePolish}`}>
      <section className={styles.login}>
        <p>Your part of the cloud world</p>
        <h1>MY COLLECTION</h1>
        <span>Your little sky starts here. Connect with Twitch to see the Upmans you’ve collected, track your progress by rarity, and discover the faces still waiting to join you.</span>
        <div className={styles.loginBenefits} aria-label="Your collection at a glance"><span>✓ Your discoveries</span><span>◌ Your progress</span><span>☁ Your next favourites</span></div>
        <LoginButton />
      </section>
    </main>
  );
}
