import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import CollectionGallery from "@/components/CollectionGallery";
import { getCollectionView } from "@/lib/collection-view";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";
import styles from "@/app/my-collection/collection.module.css";
import titleStyles from "@/app/my-collection/collection-title.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ViewerCollection({ params }: { params: Promise<{ viewer: string }> }) {
  const { viewer } = await params;
  const targetLogin = normalizeTwitchLogin(viewer);
  if (!targetLogin) notFound();
  const visitorLogin = normalizeTwitchLogin((await auth())?.user?.name);
  const [user, visitor] = await Promise.all([
    prisma.user.findUnique({ where: { twitchLogin: targetLogin }, select: { id: true, twitchLogin: true, displayName: true, avatar: true, person: { select: { id: true, isPublic: true } } } }),
    visitorLogin ? prisma.user.findUnique({ where: { twitchLogin: visitorLogin }, select: { id: true } }) : null,
  ]);
  if (!user) notFound();
  const isOwner = visitor?.id === user.id;
  const { entries, ownedCount } = await getCollectionView(user.id, isOwner);

  return <main className={`collection-page ${styles.page} ${titleStyles.titlePolish}`}>
    <header className={styles.header}>
      {user.avatar ? (
        // Twitch avatars are stored on the User and can use external hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt="" className={styles.avatar} />
      ) : <span className={styles.avatarFallback} aria-hidden="true">☁</span>}
      <div><p>A collection in the cloud world</p><h1>{isOwner ? "MY COLLECTION" : `${user.displayName}’s collection`}</h1>
        <p className={styles.identity}><strong>{user.displayName}</strong> · @{user.twitchLogin}</p>
        <span className={styles.subtitle}>{isOwner ? "Every discovery gives your sky a little more character." : "Explore this member’s public discoveries and collection progress."}</span>
        {user.person && (user.person.isPublic || isOwner) && <Link className={styles.collectionProfileLink} href={`/people/${encodeURIComponent(user.person.id)}`}>View profile ↗</Link>}
      </div>
    </header>
    <CollectionGallery upmans={entries} ownedCount={ownedCount} viewerName={isOwner ? undefined : user.displayName} />
  </main>;
}
