import Link from "next/link";
import Image from "next/image";
import { publicUpmanWhere } from "@/lib/upman-visibility";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PULL_RARITIES } from "@/lib/upman-rarity";
import styles from "../guide.module.css";

export const dynamic = "force-dynamic";

type Card = { title: string; text: string; href?: string; action?: string; id?: string; external?: boolean; image?: string; status?: "confirmed" | "stream-dependent" | "manual" };
const guides: Record<string, { title: string; intro: string; cards: Card[] }> = {
  pulls: { title: "Pull chances", intro: "Each pull chooses an eligible rarity, then an Upman from that rarity.", cards: [
    { title: "The rarity clouds", text: "Common, Rare, Epic, Mythic and Legendary use configured weights. Only enabled rarities with at least one eligible Upman participate." },
    { title: "Special discoveries", text: "Event Upmans use dedicated event rewards rather than the normal pull. Secret Upmans are not in the normal rarity pool." },
    { title: "New or duplicate", text: "A pull can return an Upman already in your collection. Inventory records unique ownership, not quantities." },
  ] },
  collect: { title: "How to collect", intro: "Find new faces on stream and follow their journey in your collection.", cards: [
    { title: "Pull an Upman", text: "Use the available Twitch reward on stream to receive a weighted pull. A duplicate does not create another inventory entry.", href: "/guides/pulls", action: "Explore pull chances" },
    { title: "Event rewards", text: "When an event is active, its dedicated Twitch reward can grant the selected Event Upman. Availability is controlled during the stream." },
    { title: "Special discoveries", text: "Some Upmans have dedicated acquisition rules, including stream interactions and site discoveries. Their requirements must be satisfied before a reward can be granted; hidden solutions are yours to discover." },
    { title: "Track your journey", text: "Achievements follow collection progress, creation credits and recorded pulls. Unlocking an achievement can unlock profile titles, backgrounds, banners and accents.", href: "/achievements", action: "Explore achievements" },
    { title: "Your collection", text: "Sign in with Twitch to see your discoveries, missing faces and progress by rarity.", href: "/my-collection", action: "Open My Collection" },
  ] },
  lore: { title: "Upman lore", intro: "A little world of curious faces, shaped by the people who make and collect them.", cards: [
    { title: "Meet the Upmans", text: "Every public Upman has its own page, artwork and creator credit.", href: "/upmans", action: "Explore the Dex" },
    { title: "Made by people", text: "Meet the creators and friends behind the cloud world.", href: "/people", action: "Meet the community" },
    { title: "A world made together", text: "Discover the real creator credits below. Each portrait links to its public Dex entry; creator and represented-person profiles preserve the connections behind the artwork." },
  ] },
  worlds: { title: "Connected Worlds", intro: "Step through the clouds and discover the worlds of our friends.", cards: [
    { title: "SillyV Art", image: "/worlds/sillyv.ico", text: "SillyV’s Gartic gallery: a neighbouring world of drawings to explore.", href: "https://www.sillyv.art/home", action: "Visit SillyV Art", external: true },
    { title: "Byttenapple", image: "/worlds/byttenapple.webp", text: "Rotten Apple’s community hub brings together Gartic Phone drawings, The Halloran Case mystery and The Orchard viewer cards and pets.", href: "https://byttenapple.com", action: "Visit Byttenapple", external: true },
    { title: "Natade Gallery", image: "/worlds/natade.jpg", text: "NataDeGallery is Natiiebouzie’s gallery for Gartic Phone custom modes, with a Gartic Wall of Fame.", href: "https://natiiebouzie.com/natadegallery", action: "Visit Natade Gallery", external: true },
    { title: "Garticverse", image: "/worlds/garticverse.ico", text: "Browse the Garticverse gallery, or visit upreal_’s own stream space from Cloud Worlds → Stream.", href: "https://garticverse.com/all", action: "Visit Garticverse", external: true },
  ] },
  stream: { title: "Twitch commands", intro: "Join upreal_ on Twitch and share the cloud world live.", cards: [
    { title: "Watch on Twitch", text: "Chat with the community and discover the rewards available during the stream.", href: "https://www.twitch.tv/upreal_", action: "Open Twitch", external: true, status: "confirmed" },
    { title: "Twitch commands", id: "commands", text: "The public command list is managed in Streamer.bot and is not stored in this repository. Ask in chat for the commands currently enabled; some interactions depend on the live stream category.", href: "https://www.twitch.tv/upreal_", action: "Ask in Twitch chat", external: true, status: "manual" },
    { title: "Chat and rewards", text: "Twitch rewards can trigger Upman pulls and, when enabled, an event-specific Upman. Available rewards may change during a stream.", status: "stream-dependent" },
    { title: "Find your stream space", text: "Open upreal_’s Garticverse space to explore the stream’s world.", href: "https://garticverse.com/s/upreal_", action: "Open upreal_’s space", external: true, status: "confirmed" },
    { title: "Your Twitch identity", text: "Rewards are attached to your Twitch account. Sign in with that account to check your collection. A repeated delivery of the same reward does not grant another copy.", href: "/my-collection", action: "Check your collection", status: "confirmed" },
  ] },
};

guides.commands = guides.stream;

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
  const stories = topic === "lore" ? await prisma.upman.findMany({ where: publicUpmanWhere, orderBy: [{ createdAt: "asc" }, { slug: "asc" }], select: { slug: true, name: true, image: true, creator: true, rarity: true } }) : [];
  const pools = topic === "pulls" ? await prisma.upman.groupBy({ by: ["rarity"], where: { isPullable: true, rarity: { in: [...PULL_RARITIES] } }, _count: { _all: true } }) : [];
  const totalWeight = rates.reduce((sum, rule) => sum + rule.weight, 0);
  return <main className={styles.page}>
    <header className={`${styles.hero} ${topic === "worlds" ? styles.worldsHero : ""}`}><span className={styles.eyebrow}>✦ UPMANDEX CLOUD GUIDE</span><h1>{guide.title}</h1><p>{guide.intro}</p>{topic === "worlds" && <span className={styles.heroPortal} aria-hidden="true"><Image src="/upmans/normalupman.png" alt="" width={100} height={100} /></span>}</header>
    <div className={topic === "worlds" ? styles.portalGrid : styles.grid}>
      {topic === "pulls" && <section className={styles.card}><h2>Current eligible chances</h2>{totalWeight > 0 ? <><ul className={styles.rates}>{rates.map((rule) => <li key={rule.rarity} className={styles.rateRow}><strong>{rule.rarity} · {new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(rule.weight / totalWeight * 100)}%</strong><meter min={0} max={100} value={rule.weight / totalWeight * 100} aria-label={`${rule.rarity} chance`} /><small>Each eligible Upman in this rarity has an equal share of its rarity chance.</small></li>)}</ul><p>Calculated from enabled weights and currently eligible Upmans; chances can change. After the rarity is selected, one eligible Upman is chosen uniformly.</p><p>For one specific Upman: rarity chance ÷ the number of eligible Upmans in that rarity. Eligible pool sizes: {pools.map((pool) => `${pool.rarity}: ${pool._count._all}`).join(" · ")}.</p></> : <p>No eligible pull rarities are currently configured.</p>}</section>}
      {guide.cards.map((card, index) => topic === "worlds" && card.href && card.image ? <a key={card.title} href={card.href} target="_blank" rel="noopener noreferrer" className={styles.worldPortal} data-world={index}>
        <span className={styles.portalStars} aria-hidden="true">✧　✦　⋆</span><span className={styles.portalVisual}><Image src={card.image} alt="" width={640} height={300} unoptimized /></span>
        <span className={styles.portalCopy}><small>✦ COMMUNITY WORLD</small><strong>{card.title}</strong><span>{card.text}</span><em>{card.action} ↗ <span className="sr-only">(opens in a new tab)</span></em></span>
      </a> : <section id={card.id} key={card.title} className={styles.card}>{card.image && <Image className={styles.portalImage} src={card.image} alt={`${card.title} site identity`} width={640} height={300} unoptimized />}{card.status && <span className={`${styles.commandStatus} ${styles[card.status]}`}>{card.status === "confirmed" ? "Confirmed" : card.status === "stream-dependent" ? "Stream-dependent" : "Check in chat"}</span>}<h2>✧ {card.title}</h2><p>{card.text}</p>{card.href && (card.external ? <a href={card.href} target="_blank" rel="noopener noreferrer">{card.action} ↗ <span className="sr-only">(opens in a new tab)</span></a> : <Link href={card.href}>{card.action} →</Link>)}</section>)}
      {stories.map((upman) => <article className={styles.card} key={upman.slug}><Image className={styles.loreImage} src={upman.image} alt={upman.name} width={320} height={200} /><span className={styles.status}>{upman.rarity}</span><h2>{upman.name}</h2><p>Created by {upman.creator}.</p><Link href={`/upmans/${upman.slug}`}>Meet {upman.name} →</Link></article>)}
    </div>
    <nav className={styles.footer} aria-label="Related destinations"><Link className={styles.action} href="/upmans">Explore the Dex →</Link><Link className={styles.action} href="/community">Meet the community →</Link></nav>
  </main>;
}
