import Image from "next/image";
import Link from "next/link";
import { classicCollectionUpmanWhere } from "@/lib/classic-collection";
import { guidePullOdds } from "@/lib/guide-pull-odds";
import { prisma } from "@/lib/prisma";
import { PULL_RARITIES } from "@/lib/upman-rarity";
import styles from "./anniversary-guides.module.css";

const sections = [
  ["getting-started", "Getting started"], ["first-pull", "Your first pull"], ["how-pulls-work", "How pulls work"],
  ["rarities", "Rarities & Pull Chances"], ["special", "Special Upmans"], ["collection", "Your collection"], ["faq", "FAQ"],
];

const faq = [
  ["Do I need to sign in before redeeming?", "Redeem on Twitch with the account you want to collect on. Sign in to UPMANDEX with that same account to open My Collection."],
  ["Why can’t I find the pull reward?", "Open Channel Points on the Twitch stream. The reward may be unavailable, or Twitch may show a cost or redemption limit that prevents you from using it."],
  ["Can I choose a rarity or avoid duplicates?", "No. The normal reward randomly selects an eligible rarity and then an eligible Upman. The selection includes Upmans you already own."],
  ["Why do the odds change?", "The site calculates the odds from the current enabled weights and eligible Upmans. A rarity drops out of the draw when it is disabled, has no positive weight, or has no eligible Upmans."],
  ["Does Twitch retrying a redemption count twice?", "No. UPMANDEX recognizes the same redemption and returns its original result."],
];

export default function HowToCollectGuide() {
  return <main className={styles.page}>
    <header className={styles.hero}>
      <div><h1>How to Collect</h1><p>Make your first Twitch pull, read the live rarity odds, and follow your progress in My Collection.</p>
        <a className={styles.button} href="https://www.twitch.tv/upreal_">Open Twitch ↗</a>
      </div>
      <div className={styles.sky} aria-hidden="true"><span className={styles.cloud} /><span className={styles.stars}>✦　✧　⋆</span>
        <Image className={styles.spriteMain} src="/upmans/normalupman.png" alt="" width={210} height={210} />
      </div>
    </header>
    <nav className={styles.quick} aria-label="On this page">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    <section id="getting-started" className={styles.panel}>
      <h2>Getting started</h2>
      <p>Use the Twitch account you watch with. When the normal Upman pull reward is available on upreal_’s stream, check Twitch for the current Channel Points cost and redemption limits. Sign in with that account to open <Link href="/my-collection">My Collection</Link>.</p>
    </section>
    <section id="first-pull" className={styles.section}>
      <h2>Your first pull</h2>
      <ol className={styles.steps}>
        <li><Image src="/upmans/garticupman.png" alt="" width={70} height={70} /><h3>Redeem the reward</h3><p>Open Channel Points on Twitch and choose the normal Upman pull reward.</p></li>
        <li><Image src="/upmans/discoupman.png" alt="" width={70} height={70} /><h3>See your result</h3><p>The redemption draws one eligible Upman. It can be a new discovery or a duplicate.</p></li>
        <li><Image src="/upmans/normalupman.png" alt="" width={70} height={70} /><h3>Check your collection</h3><p>A new discovery is added automatically to the Twitch account that redeemed the reward.</p></li>
      </ol>
    </section>
    <section id="how-pulls-work" className={styles.panel}>
      <h2>How pulls work</h2>
      <ol className={styles.flow} aria-label="Normal pull sequence"><li>Channel Points redemption</li><li>Weighted rarity draw</li><li>Random eligible Upman</li></ol>
      <p>A normal pull first chooses one of the five standard rarities. Each enabled rarity with positive weight and at least one eligible Upman gets a share of the draw proportional to its weight.</p>
      <p>Within the selected rarity, every eligible Upman has the same chance. An Upman must be public in the Dex, enabled for normal pulls and belong to that rarity.</p>
      <p>For example, if Rare is selected and has three eligible Upmans, each has a one-in-three chance <em>within that Rare draw</em>.</p>
    </section>
    <RarityOdds />
    <section id="special" className={styles.section}>
      <h2>Special Upmans</h2>
      <div className={styles.pair}>
        <article className={styles.panel}><h3>Event Upmans</h3><p>An enabled event can award an Upman through its dedicated Twitch reward while the event is available. Event Upmans are outside the normal pull pool.</p></article>
        <article className={styles.panel}><h3>Secret Upmans</h3><p>Secret Upmans can have their own discovery requirements. Their identities and unlock conditions are intentionally omitted from this guide. They are outside the normal pull pool.</p></article>
      </div>
    </section>
    <section id="collection" className={styles.panel}>
      <h2>Understanding your collection</h2>
      <p>A duplicate is recorded as a pull result. It adds neither another copy nor another unique discovery. Replaying the same redemption returns its original result.</p>
      <p>Open <Link href="/my-collection">My Collection</Link> to see what you own, switch between collected and missing Upmans, or review <Link href="/my-collection#collection-progress">your progress by rarity</Link>. Classic collection completion tracks the public normal-pull catalogue. Event, Secret and hidden Upmans are outside that goal.</p>
    </section>
    <section id="faq" className={styles.section}>
      <h2>Frequently Asked Questions</h2>
      {faq.map(([question, answer]) => <details className={styles.faq} key={question}><summary>{question}</summary><p>{answer}</p></details>)}
    </section>
    <footer className={styles.cta}>
      <nav aria-label="Keep exploring"><Link className={styles.button} href="/my-collection">My Collection</Link><Link href="/upmans">Explore the Dex</Link><Link href="/guides/discover">Discover UPMANDEX</Link></nav>
    </footer>
  </main>;
}

async function RarityOdds() {
  const [rules, examples] = await prisma.$transaction([
    prisma.pullRarityRule.findMany({
      where: { rarity: { in: [...PULL_RARITIES] } },
      select: { rarity: true, weight: true, enabled: true },
    }),
    prisma.upman.findMany({
      where: classicCollectionUpmanWhere, distinct: ["rarity"], orderBy: [{ rarity: "asc" }, { slug: "asc" }],
      select: { rarity: true, slug: true, name: true, image: true },
    }),
  ], { isolationLevel: "RepeatableRead" });
  const odds = guidePullOdds(rules, new Set(examples.map(candidate => candidate.rarity)));
  const unavailable = odds.every(row => row.chance === null);
  const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 2 });
  return <section id="rarities" className={styles.section} aria-labelledby="rarity-title">
    <h2 id="rarity-title">Rarities &amp; Pull Chances</h2>
    <p>These are the current rarity odds for a normal pull. Rarities with no eligible Upmans, a disabled rule or no positive weight are left out, so their weights do not reduce the remaining chances.</p>
    {unavailable && <p role="status">Normal pulls are currently unavailable.</p>}
    <div className={styles.rarityGrid}>{odds.map(({ rarity, chance, status }) => {
      const example = examples.find(upman => upman.rarity === rarity);
      return <article key={rarity} data-rarity={rarity.toLowerCase()} className={styles.rarity}>
        <h3><span className={`rarity-badge rarity-${rarity.toLowerCase()}`}>{rarity}</span></h3>
        {example && <Link href={`/upmans/${example.slug}`} className={styles.rarityExample}>
          <Image src={example.image} alt="" width={105} height={100} /><span>{example.name}</span>
        </Link>}
        <strong>{chance === null ? "Unavailable" : chance > 0 && chance < 0.00005 ? "<0.01%" : percent.format(chance)}</strong>
        <progress aria-label={`${rarity} chance`} value={chance ?? 0} max={1} />
        {status !== "active" && <small>{status === "empty" ? "No eligible Upmans" : "Rarity inactive"}</small>}
      </article>;
    })}</div>
  </section>;
}
