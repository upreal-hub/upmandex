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

  return (
    <main className={`upmandex-page ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>A little world. Plenty to discover.</p>
          <h1>UPMANDEX</h1>
          <p className={styles.intro}>Every cloud has a curious face. Find your favourite Upmans, meet their creators, and discover the stories that make each one unique.</p>
          <span className={styles.count}>{upmans.length} Upman{upmans.length === 1 ? "" : "s"} to discover</span>
        </div>
        <aside className={styles.guide} aria-label="How to explore the Dex">
          <p className={styles.guideTitle}>Your guide to the clouds</p>
          <ol>
            <li><strong>Find a familiar face</strong><span>Search by Upman name or creator.</span></li>
            <li><strong>Follow your curiosity</strong><span>Pick a rarity to explore a little further.</span></li>
            <li><strong>Get to know an Upman</strong><span>Open a card for its story and details.</span></li>
          </ol>
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
