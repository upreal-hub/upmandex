import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PULL_RARITIES } from "@/lib/upman-rarity";
import styles from "../guide.module.css";

export const dynamic = "force-dynamic";

type Card = { title: string; text: string; href?: string; action?: string; id?: string; external?: boolean };
const guides: Record<string, { title: string; intro: string; cards: Card[] }> = {
  pulls: { title: "Pull chances", intro: "Each pull chooses an eligible rarity, then an Upman from that rarity.", cards: [
    { title: "The rarity clouds", text: "Common, Rare, Epic, Mythic and Legendary use configured weights. Only enabled rarities with at least one eligible Upman participate." },
    { title: "Special discoveries", text: "Event Upmans use dedicated event rewards rather than the normal pull. Secret Upmans are not in the normal rarity pool." },
    { title: "New or duplicate", text: "A pull can return an Upman already in your collection. Inventory records unique ownership, not quantities." },
  ] },
  collect: { title: "How to collect", intro: "Find new faces on stream and follow their journey in your collection.", cards: [
    { title: "Pull an Upman", text: "Use the available Twitch reward on stream to receive a weighted pull. A duplicate does not create another inventory entry.", href: "/guides/pulls", action: "Explore pull chances" },
    { title: "Event rewards", text: "When an event is active, its dedicated Twitch reward can grant the selected Event Upman. Availability is controlled during the stream." },
    { title: "Your collection", text: "Sign in with Twitch to see your discoveries, missing faces and progress by rarity.", href: "/my-collection", action: "Open My Collection" },
  ] },
  lore: { title: "Upman lore", intro: "A little world of curious faces, shaped by the people who make and collect them.", cards: [
    { title: "Meet the Upmans", text: "Every public Upman has its own page, artwork and creator credit.", href: "/upmans", action: "Explore the Dex" },
    { title: "Made by people", text: "Meet the creators and friends behind the cloud world.", href: "/people", action: "Meet the community" },
    { title: "Stories still unfolding", text: "The official history of the world is not yet documented here. More stories can be shared when they are ready." },
  ] },
  worlds: { title: "Other websites", intro: "Step through a cloud portal into more creative corners of the web.", cards: [
    { title: "SillyV Art", text: "Explore SillyV’s art and creative world.", href: "https://www.sillyv.art/home", action: "Visit SillyV Art", external: true },
    { title: "Byttenapple", text: "Visit the Byttenapple website.", href: "https://byttenapple.com", action: "Visit Byttenapple", external: true },
    { title: "Natade Gallery", text: "Discover the Natade art gallery.", href: "https://natiiebouzie.com/natadegallery", action: "Visit Natade Gallery", external: true },
    { title: "Garticverse", text: "Explore the Garticverse collection.", href: "https://garticverse.com/all", action: "Visit Garticverse", external: true },
  ] },
  stream: { title: "The stream", intro: "Join upreal_ on Twitch and share the cloud world live.", cards: [
    { title: "Watch on Twitch", text: "Chat with the community and discover the rewards available during the stream.", href: "https://www.twitch.tv/upreal_", action: "Open Twitch", external: true },
    { title: "Twitch commands", id: "commands", text: "A verified public command list is not available yet. Check the stream for current commands; secret acquisition rules stay secret." },
    { title: "Chat and rewards", text: "Twitch rewards can trigger Upman pulls and, when enabled, an event-specific Upman. Available rewards may change." },
    { title: "Music Bot", text: "Music Bot information and verified commands are not yet documented here." },
  ] },
};

export default async function GuidePage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const guide = Object.hasOwn(guides, topic) ? guides[topic] : null;
  if (!guide) notFound();
  let rates: { rarity: string; weight: number }[] = [];
  if (topic === "pulls") {
    const [rules, candidates] = await Promise.all([
      prisma.pullRarityRule.findMany({ where: { enabled: true, weight: { gt: 0 }, rarity: { in: [...PULL_RARITIES] } }, select: { rarity: true, weight: true } }),
      prisma.upman.groupBy({ by: ["rarity"], where: { isPullable: true, rarity: { in: [...PULL_RARITIES] } } }),
    ]);
    const available = new Set(candidates.map((item) => item.rarity));
    rates = rules.filter((rule) => available.has(rule.rarity)).sort((a, b) => PULL_RARITIES.indexOf(a.rarity as typeof PULL_RARITIES[number]) - PULL_RARITIES.indexOf(b.rarity as typeof PULL_RARITIES[number]));
  }
  const totalWeight = rates.reduce((sum, rule) => sum + rule.weight, 0);
  return <main className={styles.page}>
    <header className={styles.hero}><span className={styles.eyebrow}>✦ UPMANDEX CLOUD GUIDE</span><h1>{guide.title}</h1><p>{guide.intro}</p></header>
    <div className={styles.grid}>
      {topic === "pulls" && <section className={styles.card}><h2>Current eligible chances</h2>{totalWeight > 0 ? <><ul className={styles.rates}>{rates.map((rule) => <li key={rule.rarity}>{rule.rarity} · {new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(rule.weight / totalWeight * 100)}%</li>)}</ul><p>Calculated from enabled weights and currently eligible Upmans; chances can change.</p></> : <p>No eligible pull rarities are currently configured.</p>}</section>}
      {guide.cards.map((card) => <section id={card.id} key={card.title} className={styles.card}><h2>✧ {card.title}</h2><p>{card.text}</p>{card.href && (card.external ? <a href={card.href} target="_blank" rel="noopener noreferrer">{card.action} ↗ <span className="sr-only">(opens in a new tab)</span></a> : <Link href={card.href}>{card.action} →</Link>)}</section>)}
    </div>
    <nav className={styles.footer} aria-label="Related destinations"><Link className={styles.action} href="/upmans">Explore the Dex →</Link><Link className={styles.action} href="/community">Meet the community →</Link></nav>
  </main>;
}
