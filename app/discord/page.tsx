import styles from "./discord.module.css";

const highlights = [
  { icon: "✦", title: "Community Events", text: "Participate in special activities and game nights." },
  { icon: "✎", title: "Gartic Phone", text: "Join drawing sessions and creative chaos." },
  { icon: "✿", title: "OCs & Art", text: "Share original characters, artwork, and projects." },
  { icon: "☁", title: "UPMANDEX", text: "Discover Upmans, collections, and community creations." },
  { icon: "◷", title: "Twitch", text: "Follow streams, share clips, and hang out with everyone." },
];

export default function DiscordPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>UPMANDEX COMMUNITY</p>
        <h1>Join the Cloud! <span aria-hidden="true">☁️</span></h1>
        <p className={styles.intro}>
          Join our Discord community to meet other members, participate in community events, play Gartic Phone, share your OCs and artwork, and discover the world of Upmans!
        </p>
        <span className={styles.heroStars} aria-hidden="true">✦　✧　⋆</span>
      </header>

      <section className={styles.community} aria-labelledby="discord-widget-title">
        <div className={styles.widgetCard}>
          <div className={styles.widgetHeading}>
            <span aria-hidden="true">✺</span>
            <div>
              <p>OFFICIAL COMMUNITY</p>
              <h2 id="discord-widget-title">Meet everyone in the cloud.</h2>
            </div>
          </div>
          <div className={styles.widgetFrame}>
            <iframe
              src="https://discord.com/widget?id=1447606454914781310&theme=dark"
              title="UPMANDEX Discord community widget"
              loading="lazy"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className={styles.widgetFallback}>If Discord is temporarily unavailable, please try again in a moment.</p>
        </div>

        <aside className={styles.highlights} aria-label="What you can find in the Discord community">
          <p className={styles.eyebrow}>A LITTLE CORNER OF THE SKY</p>
          <h2>Come say hi, make things, and play together.</h2>
          <div className={styles.highlightGrid}>
            {highlights.map((highlight) => (
              <article key={highlight.title} className={styles.highlight}>
                <span aria-hidden="true">{highlight.icon}</span>
                <div>
                  <h3>{highlight.title}</h3>
                  <p>{highlight.text}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
