import { auth } from "@/auth";
import UpmandexGallery, { type UpmandexEntry } from "@/components/UpmandexGallery";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

import styles from "./upmandex.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UpmansPage() {
  const session = await auth();
  const twitchLogin = normalizeTwitchLogin(session?.user?.name);

  const [upmans, viewer] = await Promise.all([
    prisma.upman.findMany({
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
          select: { inventory: { select: { upmanId: true } } },
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
        <p>Every known cloud creature</p>
        <h1>UPMANDEX</h1>
        <span className={styles.count}>{upmans.length} Upman{upmans.length === 1 ? "" : "s"}</span>
        <p className={styles.intro}>Discover every Upman in the Dex and the people behind them.</p>
      </header>

      <UpmandexGallery
        upmans={entries}
        collection={viewer ? { ownedCount: viewer.inventory.length, totalCount: upmans.length } : null}
        showConnectMessage={!session?.user}
      />
    </main>
  );
}
