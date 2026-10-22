import Link from "next/link";
import Image from "next/image";
import { publicUpmanWhere } from "@/lib/upman-visibility";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "../guide.module.css";
import HowToCollectGuide from "../HowToCollectGuide";
import TwitchCommandsGuide from "../TwitchCommandsGuide";
import UpmandexTutorialGuide from "../UpmandexTutorialGuide";

export const dynamic = "force-dynamic";

type Card = { title: string; text: string; href?: string; action?: string; id?: string; external?: boolean; image?: string; status?: "confirmed" | "stream-dependent" | "manual" };
const guides: Record<string, { title: string; intro: string; cards: Card[] }> = {
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
  if (topic === "stream" || topic === "commands") return <TwitchCommandsGuide />;
  if (topic === "collect") return <HowToCollectGuide />;
  if (topic === "pulls") return <UpmandexTutorialGuide />;
  const guide = Object.hasOwn(guides, topic) ? guides[topic] : null;
  if (!guide) notFound();
  const stories = topic === "lore" ? await prisma.upman.findMany({ where: publicUpmanWhere, orderBy: [{ createdAt: "asc" }, { slug: "asc" }], select: { slug: true, name: true, image: true, creator: true, rarity: true } }) : [];
  return <main className={styles.page}>
    <header className={`${styles.hero} ${topic === "worlds" ? styles.worldsHero : ""}`}><span className={styles.eyebrow}>✦ UPMANDEX CLOUD GUIDE</span><h1>{guide.title}</h1><p>{guide.intro}</p>{topic === "worlds" && <span className={styles.heroPortal} aria-hidden="true"><Image src="/upmans/normalupman.png" alt="" width={100} height={100} /></span>}</header>
    <div className={topic === "worlds" ? styles.portalGrid : styles.grid}>
      {guide.cards.map((card, index) => topic === "worlds" && card.href && card.image ? <a key={card.title} href={card.href} target="_blank" rel="noopener noreferrer" className={styles.worldPortal} data-world={index}>
        <span className={styles.portalStars} aria-hidden="true">✧　✦　⋆</span><span className={styles.portalVisual}><Image src={card.image} alt="" width={640} height={300} unoptimized /></span>
        <span className={styles.portalCopy}><small>✦ COMMUNITY WORLD</small><strong>{card.title}</strong><span>{card.text}</span><em>{card.action} ↗ <span className="sr-only">(opens in a new tab)</span></em></span>
      </a> : <section id={card.id} key={card.title} className={styles.card}>{card.image && <Image className={styles.portalImage} src={card.image} alt={`${card.title} site identity`} width={640} height={300} unoptimized />}{card.status && <span className={`${styles.commandStatus} ${styles[card.status]}`}>{card.status === "confirmed" ? "Confirmed" : card.status === "stream-dependent" ? "Stream-dependent" : "Check in chat"}</span>}<h2>✧ {card.title}</h2><p>{card.text}</p>{card.href && (card.external ? <a href={card.href} target="_blank" rel="noopener noreferrer">{card.action} ↗ <span className="sr-only">(opens in a new tab)</span></a> : <Link href={card.href}>{card.action} →</Link>)}</section>)}
      {stories.map((upman) => <article className={styles.card} key={upman.slug}><Image className={styles.loreImage} src={upman.image} alt={upman.name} width={320} height={200} /><span className={styles.status}>{upman.rarity}</span><h2>{upman.name}</h2><p>Created by {upman.creator}.</p><Link href={`/upmans/${upman.slug}`}>Meet {upman.name} →</Link></article>)}
    </div>
    <nav className={styles.footer} aria-label="Related destinations"><Link className={styles.action} href="/upmans">Explore the Dex →</Link><Link className={styles.action} href="/community">Meet the community →</Link></nav>
  </main>;
}
