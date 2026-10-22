import Image from "next/image";
import Link from "next/link";

import styles from "./guide.module.css";

const sections = [
  { id: "welcome", icon: "☁", eyebrow: "WELCOME TO THE CLOUD WORLD", title: "Welcome to UPMANDEX", text: "UPMANDEX is a community collection world connected to the live Twitch experience. Explore cloud characters in the Dex, grow a personal collection during streams, build a Person profile, and discover art made by the community." },
  { id: "login", icon: "✦", eyebrow: "YOUR TWITCH IDENTITY", title: "Getting started & Twitch login", text: "Sign in with the Twitch account you use in chat. That gives UPMANDEX a consistent way to show your collection. My Collection works from your Twitch User record; profile customization and a personal workshop require that account to be linked to a Person profile." },
  { id: "dex", icon: "🔎", eyebrow: "EXPLORE THE CATALOGUE", title: "The Upman Dex", text: "The Dex is the public catalogue of Upmans. Browse its cards, open an Upman for its artwork, rarity and creator information, and use the available search or filters to find a particular cloud face. Event and Secret are special categories; How to Collect explains normal pull rarities in detail." },
  { id: "collection", icon: "📚", eyebrow: "YOUR LITTLE SKY", title: "My Collection", text: "My Collection compares your owned Upmans with the visible catalogue. Owned cards stay bright and marked as collected; missing cards stay visible but subdued, so progress is easy to read. Open any card for its public details and use How to Collect for the ways to add new faces." },
  { id: "represented", icon: "👤", eyebrow: "PEOPLE & UPMANS", title: "Represented Upmans", text: "A Represented Upman is an Upman linked by UPMANDEX to a Person profile. It appears in the profile’s My Upman area and can be included in the trusted stream-profile projection used by stream integrations. This association is managed by the site; it is not a self-service collection selector." },
  { id: "profiles", icon: "✿", eyebrow: "MAKE A CORNER OF THE SKY", title: "Profiles & cosmetics", text: "A linked Person profile can show public identity details, artwork, projects, links, created Upmans and achievements. Achievement unlocks can provide titles, backgrounds, banners and accents. Profile owners can equip the cosmetic options they have legitimately unlocked." },
  { id: "achievements", icon: "🏆", eyebrow: "FOLLOW YOUR JOURNEY", title: "Achievements", text: "Achievements follow real activity such as classic collection progress, pulls, duplicates, creations, submissions and selected stream events. Open Achievements to see your current tracked goals when your Twitch User is linked to a Person profile; completed goals remain unlocked and can grant profile cosmetics." },
  { id: "worlds", icon: "✵", eyebrow: "BEYOND THE DEX", title: "Cloud Worlds", text: "Cloud Worlds is the route to connected creative spaces: community sites, galleries and the Creative Studio. Use the Cloud Worlds menu to visit those destinations. External worlds open as their own sites, while the Creative Studio remains part of UPMANDEX." },
  { id: "studio", icon: "✎", eyebrow: "CREATE & SHARE", title: "Creative Studio", text: "Creative Studio gathers public community art and projects in one place. Browse either tab, open a creator’s profile, and explore their public work. Owners of linked Person profiles can use their personal workshop to manage their own art and projects." },
  { id: "community", icon: "🎨", eyebrow: "MADE TOGETHER", title: "Community & Art Gallery", text: "Community routes help you meet cloud members, discover creators and see shared highlights. The art experience is part of Creative Studio and public Person galleries, where you can browse artwork and follow it back to the person who shared it." },
  { id: "submit", icon: "🖌️", eyebrow: "SEND AN IDEA", title: "Submit Your Upman", text: "Sign in with Twitch, then open Submit an Upman to send a name, description and PNG illustration. PNG files are limited to 4 MiB. Your proposal stays in your personal submissions list as Pending, Approved or Rejected; only Admin approval creates the catalogue Upman." },
  { id: "events", icon: "🎉", eyebrow: "LIMITED CLOUDS", title: "Events & Special Upmans", text: "Event Upmans use a dedicated Twitch reward while an event is actively enabled. They never enter the normal weighted pool. Secret Upmans can use dedicated discovery rules, so their availability and conditions are intentionally not listed as normal pull chances." },
  { id: "twitch", icon: "📺", eyebrow: "LIVE CONNECTION", title: "Twitch integration", text: "During a live stream, Channel Point rewards can trigger normal pulls and, when active, Event Upmans. The site also provides a protected read-only stream profile for trusted stream integrations, including a public Person’s represented Upman and equipped public cosmetics. See the dedicated guides for details." },
] as const;

const faq = [
  ["Do I need Twitch to browse UPMANDEX?", "No. The Dex, public People profiles, Creative Studio and connected worlds can be explored without signing in. Twitch is needed for a personal collection and account-specific areas."],
  ["Why can’t I see profile customization?", "Customization belongs to a linked Person profile. If your Twitch account is not linked yet, My Profile explains that your collection remains available while the link is missing."],
  ["Where do I find pull probabilities?", "How to Collect shows the live configured normal-pull chances and explains special Event and Secret Upmans separately."],
  ["What happens after I submit an Upman?", "The proposal remains visible in Your submissions while an Admin reviews it. Only an approved proposal becomes a catalogue Upman."],
  ["Where can I learn the stream commands?", "Open the Twitch Commands guide for the current command groups, aliases and the live-system notes that apply to them."],
] as const;

export default function UpmandexTutorialGuide() {
  return <main className={styles.page}>
    <header className={`${styles.hero} ${styles.tutorialHero}`}>
      <span className={styles.eyebrow}>✦ UPMANDEX CLOUD GUIDE</span>
      <h1>UPMANDEX Tutorial</h1>
      <p>A friendly tour of the cloud world: where to explore, what your Twitch account unlocks, and how the community creates together.</p>
      <Image className={styles.tutorialHeroUpman} src="/upmans/normalupman.png" alt="NormalUpman" width={150} height={150} priority />
    </header>

    <nav className={styles.tutorialNav} aria-label="UPMANDEX Tutorial sections">
      {sections.map((section) => <a key={section.id} href={`#${section.id}`}><span aria-hidden="true">{section.icon}</span>{section.title}</a>)}
      <a href="#faq"><span aria-hidden="true">?</span>FAQ</a>
    </nav>

    <div className={styles.tutorialSections}>
      {sections.map((section, index) => <section id={section.id} className={styles.tutorialSection} key={section.id} aria-labelledby={`${section.id}-title`}>
        <div className={styles.tutorialMarker} aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span>{section.icon}</div>
        <div className={styles.tutorialCopy}><p>{section.eyebrow}</p><h2 id={`${section.id}-title`}>{section.title}</h2><span>{section.text}</span>{section.id === "collection" && <Link href="/guides/collect">Read How to Collect →</Link>}{section.id === "achievements" && <Link href="/achievements">Open Achievements →</Link>}{section.id === "worlds" && <Link href="/guides/worlds">Explore Cloud Worlds →</Link>}{section.id === "studio" && <Link href="/creative-studio">Open Creative Studio →</Link>}{section.id === "community" && <Link href="/community/members">Meet Cloud Members →</Link>}{section.id === "submit" && <Link href="/submit-upman">Submit an Upman →</Link>}{section.id === "twitch" && <span className={styles.tutorialLinks}><Link href="/guides/commands">Twitch Commands →</Link><Link href="/guides/collect">How to Collect →</Link></span>}</div>
      </section>)}
    </div>

    <section id="faq" className={styles.tutorialFaq} aria-labelledby="tutorial-faq-title">
      <div><p>QUICK ANSWERS</p><h2 id="tutorial-faq-title">Useful tips &amp; FAQ</h2></div>
      <div className={styles.faqList}>{faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    </section>

    <nav className={styles.footer} aria-label="Tutorial destinations"><Link className={styles.action} href="/upmans">Explore the Dex →</Link><Link className={styles.action} href="/my-collection">My Collection →</Link><Link className={styles.action} href="/guides/collect#rarities">Pull chances &amp; rarities →</Link></nav>
  </main>;
}
