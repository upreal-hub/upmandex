import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PULL_RARITIES } from "@/lib/upman-rarity";

import styles from "./guide.module.css";

const rarityColours: Record<string, string> = {
  Common: "#4aa875",
  Rare: "#2e9ed5",
  Epic: "#9163d9",
  Mythic: "#dc6c62",
  Legendary: "#d99e26",
};

const questions = [
  ["Can I get the same Upman twice?", "Yes. A repeated normal pull is recorded as a duplicate, but your collection keeps one ownership entry for that Upman."],
  ["Are all Upmans available through normal pulls?", "No. Event and Secret Upmans are outside the normal weighted pull pool, and some Upmans may be unavailable for normal pulls."],
  ["How do I check my collection?", "Connect with the same Twitch account, then open My Collection to see your owned Upmans and the public Dex to explore the catalogue."],
  ["Do Event Upmans work differently?", "Yes. They are awarded through a dedicated event reward only while that event is active; they are never selected by a normal pull."],
  ["Can I choose which Upman I receive?", "No. A normal pull first selects a rarity by its current configured chance, then selects an eligible Upman from that rarity."],
] as const;

export default async function HowToCollectGuide() {
  const [rules, candidates, examples] = await Promise.all([
    prisma.pullRarityRule.findMany({
      where: { enabled: true, weight: { gt: 0 }, rarity: { in: [...PULL_RARITIES] } },
      select: { rarity: true, weight: true },
    }),
    prisma.upman.groupBy({
      by: ["rarity"],
      where: { isPullable: true, rarity: { in: [...PULL_RARITIES] } },
      _count: { _all: true },
    }),
    prisma.upman.findMany({
      where: { dexVisibility: "PUBLIC", isPullable: true, rarity: { in: [...PULL_RARITIES] } },
      select: { slug: true, name: true, image: true, rarity: true },
      orderBy: [{ rarity: "asc" }, { name: "asc" }, { slug: "asc" }],
    }),
  ]);

  const availableRarities = new Set(candidates.map((candidate) => candidate.rarity));
  const activeRates = rules
    .filter((rule) => availableRarities.has(rule.rarity))
    .sort((first, second) => PULL_RARITIES.indexOf(first.rarity as typeof PULL_RARITIES[number]) - PULL_RARITIES.indexOf(second.rarity as typeof PULL_RARITIES[number]));
  const totalWeight = activeRates.reduce((total, rule) => total + rule.weight, 0);
  const exampleByRarity = new Map<string, (typeof examples)[number]>();
  for (const example of examples) {
    if (!exampleByRarity.has(example.rarity)) exampleByRarity.set(example.rarity, example);
  }

  return (
    <main className={styles.page}>
      <header className={`${styles.hero} ${styles.collectHero}`}>
        <span className={styles.eyebrow}>✦ UPMANDEX CLOUD GUIDE</span>
        <h1>How to Collect</h1>
        <p>Start your collection during the live stream, understand each pull, and keep track of every cloud face that finds its way to you.</p>
      </header>

      <nav className={styles.collectNav} aria-label="How to Collect sections">
        <a href="#start">Getting started</a><a href="#get-upmans">Get Upmans</a><a href="#rarities">Rarities</a><a href="#duplicates">Duplicates</a><a href="#collection">Your collection</a><a href="#faq">FAQ</a>
      </nav>

      <section id="start" className={styles.collectSection} aria-labelledby="start-heading">
        <div className={styles.collectHeading}><span aria-hidden="true">🎁</span><div><p>FIRST CLOUDS</p><h2 id="start-heading">Getting started</h2></div></div>
        <div className={styles.collectSteps}>
          <article><span>1</span><h3>Connect your Twitch</h3><p>Use the Twitch account you watch with. This is the account UPMANDEX uses to recognise your collection when you sign in.</p></article>
          <article><span>2</span><h3>Watch a live stream</h3><p>Normal pulls are made through the Twitch reward when it is available during a live stream.</p></article>
          <article><span>3</span><h3>Open your little sky</h3><p>Visit My Collection to see the Upmans your Twitch account owns and to follow your progress.</p><Link href="/my-collection">Open My Collection →</Link></article>
        </div>
      </section>

      <section id="get-upmans" className={styles.collectSection} aria-labelledby="get-heading">
        <div className={styles.collectHeading}><span aria-hidden="true">🎲</span><div><p>WAYS TO COLLECT</p><h2 id="get-heading">How to get Upmans</h2></div></div>
        <div className={styles.methodGrid}>
          <article className={styles.methodCard}><span className={styles.methodBadge}>NORMAL PULL</span><h3>Use the live Twitch pull reward</h3><p>When the normal reward is available, it resolves one weighted pull for your Twitch account. The rarity is chosen first, then one eligible Upman from that rarity.</p></article>
          <article className={styles.methodCard}><span className={styles.methodBadge}>EVENT</span><h3>Join an active event</h3><p>An active event can use its own Twitch reward to award the selected Event Upman. Event availability is controlled for the stream and does not use normal pull odds.</p></article>
          <article className={styles.methodCard}><span className={styles.methodBadge}>SECRET</span><h3>Discover special stream moments</h3><p>Some Secret Upmans can be tied to a dedicated stream interaction with its own requirements. Their acquisition rules are intentionally part of the discovery.</p></article>
          <article className={styles.methodCard}><span className={styles.methodBadge}>ACHIEVEMENTS</span><h3>Check in and be First!</h3><p>Daily Check-in and First! record stream participation for Achievements. They do not award an Upman pull by themselves.</p></article>
        </div>
      </section>

      <section id="rarities" className={styles.collectSection} aria-labelledby="rarities-heading">
        <div className={styles.collectHeading}><span aria-hidden="true">⭐</span><div><p>LIVE CONFIGURATION</p><h2 id="rarities-heading">Pull chances &amp; rarities</h2></div></div>
        <p className={styles.collectLead}>Normal pulls use the enabled rarity weights currently configured by UPMANDEX. Only rarities with at least one eligible Upman take part, so these percentages always follow the live setup.</p>
        {totalWeight > 0 ? <div className={styles.rarityGuideGrid}>{activeRates.map((rule) => {
          const chance = rule.weight / totalWeight * 100;
          const example = exampleByRarity.get(rule.rarity);
          return <article className={styles.rarityGuideCard} key={rule.rarity} style={{ "--rarity": rarityColours[rule.rarity] ?? "#4aa9d0" } as React.CSSProperties}>
            <div className={styles.rarityGuideTop}><span>{rule.rarity}</span><strong>{new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(chance)}%</strong></div>
            <meter min={0} max={100} value={chance} aria-label={`${rule.rarity} chance`} />
            <p>Each eligible {rule.rarity} Upman has an equal share after this rarity is selected.</p>
            {example ? <Link className={styles.rarityExample} href={`/upmans/${example.slug}`}><Image src={example.image} alt={example.name} width={96} height={78} /><span><small>Public Dex example</small><strong>{example.name}</strong></span></Link> : <span className={styles.rarityUnavailable}>No public example is currently available.</span>}
          </article>;
        })}</div> : <p className={styles.collectEmpty}>No normal-pull rarity is currently configured with an eligible Upman.</p>}
        <aside className={styles.specialRarityNote}><strong>Event and Secret are special.</strong><span>They are not part of the normal weighted pool, so they do not have a normal-pull percentage here.</span></aside>
      </section>

      <section id="duplicates" className={styles.collectSection} aria-labelledby="duplicates-heading">
        <div className={styles.collectHeading}><span aria-hidden="true">🔁</span><div><p>ONE OF A KIND</p><h2 id="duplicates-heading">Understanding duplicates</h2></div></div>
        <div className={styles.duplicatePanel}><div><h3>New discovery</h3><p>When the Upman is new to your Twitch account, it is added to your collection as a unique ownership entry.</p></div><div><h3>Duplicate pull</h3><p>When you pull one you already own, UPMANDEX records the duplicate for its related Achievement progress. It does not add another inventory copy or give compensation.</p></div></div>
      </section>

      <section id="collection" className={styles.collectSection} aria-labelledby="collection-heading">
        <div className={styles.collectHeading}><span aria-hidden="true">📚</span><div><p>FOLLOW YOUR JOURNEY</p><h2 id="collection-heading">Your collection</h2></div></div>
        <div className={styles.collectionGuideGrid}>
          <article><h3>The Dex</h3><p>Explore public Upmans, their rarity, artwork and creator credits.</p><Link href="/upmans">Explore the Dex →</Link></article>
          <article><h3>My Collection</h3><p>See the Upmans owned by your connected Twitch account, including the faces you are still missing from the visible catalogue.</p><Link href="/my-collection">View collection →</Link></article>
          <article><h3>Your profile</h3><p>A represented Upman is a profile display choice. It does not replace or create an ownership entry in your collection.</p><Link href="/profile">Open My Profile →</Link></article>
        </div>
      </section>

      <section id="faq" className={styles.collectSection} aria-labelledby="faq-heading">
        <div className={styles.collectHeading}><span aria-hidden="true">💬</span><div><p>QUICK ANSWERS</p><h2 id="faq-heading">Tips &amp; FAQ</h2></div></div>
        <div className={styles.faqList}>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>

      <nav className={styles.footer} aria-label="Related destinations"><a className={styles.action} href="#rarities">Pull chances &amp; rarities →</a><Link className={styles.action} href="/achievements">Explore Achievements →</Link><Link className={styles.action} href="/upmans">Explore the Dex →</Link></nav>
    </main>
  );
}
