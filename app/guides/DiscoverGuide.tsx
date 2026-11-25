import Image from "next/image";
import Link from "next/link";
import styles from "./anniversary-guides.module.css";

const destinations = [
  { title: "Top Creators", href: "/community/creators", note: "Meet the artists behind the Dex." },
  { title: "Community Highlights", href: "/community/highlights", note: "See what the community has been sharing." },
  { title: "Cloud Members", href: "/community/members", note: "Explore the people who make up UPMANDEX." },
  { title: "Cloud Worlds", href: "/guides/worlds", note: "Visit neighbouring galleries and creative sites." },
  { title: "Upman Lore", href: "/guides/lore", note: "Follow the connections behind the characters." },
];

export default function DiscoverGuide() {
  return <main className={styles.page}>
    <header className={styles.hero}>
      <div>
        <h1>Welcome to UPMANDEX</h1>
        <p>Upmans are characters illustrated by the community. Meet them in the Dex, see them on upreal_’s Twitch stream, and build a collection of the ones you discover.</p>
        <Link className={styles.button} href="/upmans">Explore the Dex ↗</Link>
      </div>
      <div className={styles.sky} aria-hidden="true">
        <span className={styles.cloud} /><span className={styles.stars}>✧　⋆　✦</span>
        <Image className={styles.spriteMain} src="/upmans/normalupman.png" alt="" width={220} height={220} />
        <Image className={styles.spriteSide} src="/upmans/garticupman.png" alt="" width={135} height={135} />
      </div>
    </header>
    <section className={styles.feature} aria-labelledby="dex-title">
      <div className={styles.featureArt}><Image src="/upmans/discoupman.png" alt="" width={224} height={224} /></div>
      <div>
        <h2 id="dex-title">Explore the Dex</h2>
        <p>The Dex is the public catalogue. Search or filter to find an Upman, then open its page for artwork, rarity, creator credit and linked profiles when available.</p>
        <p>Many Upmans come from community artists. The Dex brings those creations together, while <Link href="/my-collection">My Collection</Link> shows the Upmans attached to your Twitch account and tracks what you’re still missing.</p>
      </div>
    </section>
    <div className={styles.pair}>
      <section className={styles.panel} aria-labelledby="personal-title">
        <h2 id="personal-title">Make it yours</h2>
        <p>If your Twitch account is linked to a Person profile, you can equip available titles, backgrounds and accents and share your public artwork or projects.</p>
        <p>A represented Upman is an association managed by UPMANDEX. It can appear on your profile and in the stream’s customized chat overlay alongside your equipped public cosmetics when the integration is active.</p>
        <Link href="/profile">Open My Profile ↗</Link> · <Link href="/guides/commands">See Twitch Commands ↗</Link>
      </section>
      <section className={styles.panel} aria-labelledby="journey-title">
        <h2 id="journey-title">Your journey in the clouds</h2>
        <p>Start your collection with a Twitch pull when the reward is available. See your discoveries and progress by rarity in <Link href="/my-collection">My Collection</Link>.</p>
        <p><Link href="/achievements">Achievements</Link> mark milestones in collecting and other tracked activities for linked Person profiles. <Link href="/community/leaderboards">Leaderboards</Link> show how collectors rank.</p>
        <Link href="/guides/collect">Learn how to collect ↗</Link>
      </section>
    </div>
    <section className={styles.community} aria-labelledby="community-title">
      <h2 id="community-title">A community-driven universe</h2>
      <p>Follow an artist’s credit from a Dex entry to their profile, or browse public <Link href="/art">artwork</Link> and <Link href="/projects">projects</Link> directly.</p>
      <ul>{destinations.map(({ title, href, note }) => <li key={href}><Link href={href}>{title} ↗</Link><span>{note}</span></li>)}</ul>
    </section>
    <footer className={styles.cta}>
      <h2>Start your adventure</h2>
      <nav aria-label="Start exploring">
        <Link className={styles.button} href="/upmans">Explore the Dex</Link>
        <Link href="/guides/collect">How to Collect</Link><Link href="/guides/commands">Twitch Commands</Link>
        <a href="https://www.twitch.tv/upreal_">Watch on Twitch ↗</a>
      </nav>
    </footer>
  </main>;
}
