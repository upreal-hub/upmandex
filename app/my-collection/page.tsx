import { auth } from "@/auth";
import Image from "next/image";
import CollectionGallery from "@/components/CollectionGallery";
import LoginButton from "@/components/LoginButton";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";
import { getCollectionView } from "@/lib/collection-view";

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
    select: { id: true, twitchLogin: true, displayName: true, avatar: true },
  });

  if (!user) {
    return <LoggedOutCollection />;
  }

  const { entries, ownedCount } = await getCollectionView(user.id, true);

  return (
    <main className={`collection-page ${styles.page} ${titleStyles.titlePolish}`}>
      <header className={styles.header}>
        <Image src="/cloud-decorations/base_cloud.png" alt="" aria-hidden="true" width={48} height={48} className={styles.collectionCloud} />
        {user.avatar && (
          // This is the stored avatar from the authenticated Twitch User record.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className={styles.avatar} />
        )}
        <div><p>Your part of the cloud world</p><h1>MY COLLECTION</h1><p className={styles.identity}><strong>{user.displayName}</strong> · @{user.twitchLogin}</p><span className={styles.subtitle}>Every discovery gives your sky a little more character.</span></div>
      </header>
      <CollectionGallery upmans={entries} ownedCount={ownedCount} />
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
