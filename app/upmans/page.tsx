import Image from "next/image";
import { auth } from "@/auth";
import UpmandexGallery, { type UpmandexEntry } from "@/components/UpmandexGallery";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";
import { publicUpmanWhere } from "@/lib/upman-visibility";

import styles from "./upmandex.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UpmansPage() {
  const session = await auth();
  const twitchLogin = normalizeTwitchLogin(session?.user?.name);

  const [upmans, viewer] = await Promise.all([
    prisma.upman.findMany({
      where: publicUpmanWhere,
      orderBy: [{ name: "asc" }, { slug: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        image: true,
        rarity: true,
        creator: true,
        creatorTwitch: true,
      },
    }),
    twitchLogin
      ? prisma.user.findUnique({
          where: { twitchLogin },
          select: { inventory: { where: { upman: publicUpmanWhere }, select: { upmanId: true } } },
        })
      : null,
  ]);

  const creatorLogins = upmans
    .map((upman) => upman.creatorTwitch)
    .filter((login): login is string => Boolean(login));

  const creatorUsers = creatorLogins.length > 0
    ? await prisma.user.findMany({
        where: { twitchLogin: { in: creatorLogins } },
        select: { twitchLogin: true, avatar: true },
      })
    : [];

  const avatarsByTwitchLogin = new Map(
    creatorUsers.map((user) => [user.twitchLogin, user.avatar]),
  );
  const ownedUpmanIds = new Set(viewer?.inventory.map((item) => item.upmanId));
  const entries: UpmandexEntry[] = upmans.map((upman) => ({
    ...upman,
    rarity: upman.rarity as UpmandexEntry["rarity"],
    creatorAvatar: upman.creatorTwitch
      ? avatarsByTwitchLogin.get(upman.creatorTwitch) ?? null
      : null,
    owned: ownedUpmanIds.has(upman.id),
  }));

  const guideUpman = upmans.find((upman) => upman.slug === "beanieupman") ?? upmans[0];

  return (
    <main className={`upmandex-page ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>A little world. Plenty to discover.</p>
          <h1>UPMANDEX</h1>
          <p className={styles.intro}>Every cloud has a curious face. Find your favourite Upmans, meet their creators, and discover the stories that make each one unique.</p>
          <span className={styles.count}>{upmans.length} Upman{upmans.length === 1 ? "" : "s"} to discover</span>
        </div>
        <aside className={styles.skyGuide} aria-label="A little nudge from the clouds">
          <div className={styles.guideScene}>
            <span className={styles.guideStar} aria-hidden="true">✦</span>
            <span className={styles.guideCloud} aria-hidden="true" />
            {guideUpman && <Image src={guideUpman.image} alt={guideUpman.name} width={240} height={260} sizes="(max-width: 760px) 130px, 180px" className={styles.guideUpman} />}
            <span className={styles.guideWhisper}>A familiar face?<span aria-hidden="true"> ↙</span></span>
            <span className={styles.guideTrail} aria-hidden="true">✧ · · ☁</span>
          </div>
          <p className={styles.guideTitle}>A new friend around every cloud.</p>
          <p className={styles.guideText}>Mix a few rarities, follow an artist you love, then open a card to meet the Upman behind the face.</p>
        </aside>
      </header>

      <UpmandexGallery
        upmans={entries}
        collection={viewer ? { ownedCount: viewer.inventory.length, totalCount: upmans.length } : null}
        showConnectMessage={!session?.user}
      />
    </main>
  );
}
