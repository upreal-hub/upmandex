import Link from "next/link";

import { auth } from "@/auth";
import { getAchievementCatalog, getAchievementProgress } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";
import styles from "@/app/guides/guide.module.css";
import AchievementBrowser from "./AchievementBrowser";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const login = normalizeTwitchLogin((await auth())?.user?.name);
  const user = login ? await prisma.user.findUnique({
    where: { twitchLogin: login },
    select: { person: { select: { id: true } } },
  }) : null;
  const progress = user?.person ? await getAchievementProgress(user.person.id) : null;
  const milestones = new Map(progress?.families.flatMap((family) => family.milestones.map((milestone) => [milestone.key, milestone] as const)) ?? []);
  const catalog = getAchievementCatalog();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Your journey in the clouds</p>
        <h1>Achievements</h1>
        <p>Collect, create and explore to unlock achievements and profile cosmetics.</p>
        <p>{progress ? `${progress.summary.unlocked} achievements unlocked.` : login ? "Link a Person profile to see your progress." : "Sign in with Twitch to see your progress."}</p>
      </header>
      <AchievementBrowser signedIn={Boolean(progress)} items={catalog.map((achievement) => {
          const milestone = milestones.get(achievement.key);
          return { key: achievement.key, name: achievement.name, description: achievement.description, label: achievement.label, category: achievement.category, order: achievement.order, unlocked: Boolean(milestone?.isUnlocked), unlockedAt: milestone?.unlockedAt ?? null, current: milestone?.trackable ? milestone.displayCurrent : null, target: milestone?.trackable ? milestone.displayTarget : null, trackable: Boolean(milestone?.trackable) };
        })} />
      <div className={styles.footer}><Link className={styles.action} href="/profile">My profile →</Link><Link className={styles.action} href="/my-collection">My collection →</Link></div>
    </main>
  );
}
