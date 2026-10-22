import Link from "next/link";

import styles from "./guide.module.css";

type Command = {
  command: string;
  description: string;
  example?: string;
  aliases?: string[];
  access?: "Staff / Moderators" | "Configuration dependent" | "Statistics" | "Management";
  cooldown?: string;
};

type CommandSection = {
  id: string;
  icon: string;
  title: string;
  intro: string;
  viewerAccess?: string;
  commands: Command[];
};

const commandSections: CommandSection[] = [
  {
    id: "fun",
    icon: "🎱",
    title: "Fun & Interactions",
    intro: "Small chat moments for the people sharing the cloud world.",
    viewerAccess: "Everyone in chat",
    commands: [
      { command: "!8ball", description: "Ask the magic ball a question and receive a random answer.", example: "!8ball Will I get a Legendary Upman today?" },
      { command: "!dadjoke", description: "Ask for a dad joke.", example: "!dadjoke" },
      { command: "!hug", description: "Send a virtual hug to another viewer.", example: "!hug @username" },
      { command: "!wyr", description: "Start a Would You Rather? question for chat.", example: "!wyr" },
    ],
  },
  {
    id: "stream",
    icon: "📺",
    title: "Twitch & Stream",
    intro: "Useful live-channel information, plus a clip request when the stream is running.",
    viewerAccess: "Everyone in chat",
    commands: [
      { command: "!uptime", description: "Shows how long the stream has been live." },
      { command: "!followage", description: "Shows how long you have followed the channel." },
      { command: "!followers", description: "Shows the channel follower count." },
      { command: "!accountAge", description: "Shows the age of your Twitch account." },
      { command: "!date", description: "Shows the current date." },
      { command: "!clip", description: "Requests a Twitch clip for the current live stream. Streamer.bot can announce detected clips on Twitch and Discord; publication is not guaranteed immediately.", cooldown: "60s global cooldown" },
    ],
  },
  {
    id: "music",
    icon: "🎵",
    title: "Music & Song Requests",
    intro: "Request music, check the queue, or use the available song tools during the stream.",
    viewerAccess: "Song requests are available when the music system is enabled",
    commands: [
      { command: "!sr", description: "Request a song by name or YouTube link.", example: "!sr Never Gonna Give You Up" },
      { command: "!song", description: "Shows information about the current song.", example: "!song", aliases: ["!songname"] },
      { command: "!queue", description: "Shows the music queue.", example: "!queue" },
      { command: "!when", description: "Shows music waiting information." },
      { command: "!voteskip", description: "Vote to skip the current song.", aliases: ["!skipvote"] },
      { command: "!wrongsong", description: "Reports that the current song is wrong.", aliases: ["!songwrong"] },
      { command: "!pause", description: "Pauses music.", access: "Staff / Moderators" },
      { command: "!start", description: "Resumes music playback.", access: "Staff / Moderators" },
      { command: "!skip", description: "Skips to the next song.", aliases: ["!skipsong"], access: "Staff / Moderators" },
      { command: "!stop", description: "Stops music playback.", access: "Staff / Moderators" },
      { command: "!volume", description: "Controls music volume.", access: "Staff / Moderators" },
      { command: "!srForce", description: "Adds a song request with forced priority when configured.", aliases: ["!srforce"], access: "Configuration dependent" },
    ],
  },
  {
    id: "community",
    icon: "🎨",
    title: "Community & Gartic Phone",
    intro: "Join a Gartic Phone game, find the community, or let chat know you are nearby.",
    viewerAccess: "Everyone in chat",
    commands: [
      { command: "!link", description: "Shows the link to join the current Gartic Phone game.", aliases: ["!gartic", "!wannajoin", "!join", "!garticlink", "!linkpls"] },
      { command: "!lurk", description: "Lets chat know you are watching in the background.", aliases: ["!brb", "!lurking", "!imstillwatching"] },
      { command: "!discord", description: "Shows the community Discord link.", aliases: ["!uprealidh", "!dihcord", "!dicord", "!DCord"] },
      { command: "!nata", description: "Opens the Gartic gallery.", aliases: ["!natiedeboozy", "!mother", "!barbie", "!mode", "!modegallery"] },
    ],
  },
  {
    id: "death-counter",
    icon: "💀",
    title: "Death Counter",
    intro: "A per-game death counter is available for streams that use it.",
    viewerAccess: "Availability and permissions can vary with the active stream setup",
    commands: [
      { command: "!deaths", description: "Shows the current death count.", access: "Statistics" },
      { command: "!deathboard", description: "Shows the death-counter board.", access: "Statistics" },
      { command: "!totaldeaths", description: "Shows the total recorded deaths.", access: "Statistics" },
      { command: "!death+", description: "Increases the current death count.", access: "Management" },
      { command: "!death-", description: "Decreases the current death count.", access: "Management" },
      { command: "!deathset", description: "Sets the death count.", access: "Management" },
      { command: "!deathgame+", description: "Moves the counter to the next game.", access: "Management" },
      { command: "!deathgame-", description: "Moves the counter to the previous game.", access: "Management" },
    ],
  },
  {
    id: "staff",
    icon: "🛡️",
    title: "Moderation & Staff",
    intro: "These commands are intended for the streamer and moderators, not general chat use.",
    viewerAccess: "Staff / Moderators",
    commands: [
      { command: "!game", description: "Changes the Twitch stream category.", aliases: ["!category"], access: "Staff / Moderators" },
      { command: "!title", description: "Changes the stream title.", access: "Staff / Moderators" },
      { command: "!panic", description: "Enables strengthened chat protection.", access: "Staff / Moderators" },
      { command: "!relax", description: "Disables strengthened chat protection.", access: "Staff / Moderators" },
      { command: "!so", description: "Sends a Twitch shoutout when staff access is configured.", access: "Staff / Moderators" },
    ],
  },
];

export default function TwitchCommandsGuide() {
  return (
    <main className={styles.page}>
      <header className={`${styles.hero} ${styles.commandsHero}`}>
        <span className={styles.eyebrow}>✦ UPMANDEX CLOUD GUIDE</span>
        <h1>Twitch Commands</h1>
        <p>Everything currently listed for chat, music, community games and stream staff — grouped so you can find the right command quickly.</p>
      </header>

      <nav className={styles.commandNav} aria-label="Twitch command categories">
        {commandSections.map((section) => <a href={`#${section.id}`} key={section.id}><span aria-hidden="true">{section.icon}</span>{section.title}</a>)}
      </nav>

      <div className={styles.commandSections}>
        {commandSections.map((section) => (
          <section id={section.id} className={styles.commandSection} key={section.id} aria-labelledby={`${section.id}-heading`}>
            <header className={styles.commandSectionHeader}>
              <span className={styles.commandSectionIcon} aria-hidden="true">{section.icon}</span>
              <div><h2 id={`${section.id}-heading`}>{section.title}</h2><p>{section.intro}</p></div>
              {section.viewerAccess && <span className={styles.commandAccess}>{section.viewerAccess}</span>}
            </header>
            <div className={styles.commandGrid}>
              {section.commands.map((command) => <CommandCard command={command} key={command.command} />)}
            </div>
          </section>
        ))}
      </div>

      <aside className={styles.commandNote}>
        <span aria-hidden="true">☁</span>
        <div><strong>Commands depend on the live setup.</strong><p>A listed command can need an active stream, music system, game room, or staff permission before it responds.</p></div>
        <a href="https://www.twitch.tv/upreal_" target="_blank" rel="noopener noreferrer">Open Twitch ↗ <span className="sr-only">(opens in a new tab)</span></a>
      </aside>
      <nav className={styles.footer} aria-label="Related destinations"><Link className={styles.action} href="/upmans">Explore the Dex →</Link><Link className={styles.action} href="/community">Meet the community →</Link></nav>
    </main>
  );
}

function CommandCard({ command }: { command: Command }) {
  return <article className={styles.commandCard}>
    <div className={styles.commandCardTop}><code>{command.command}</code>{command.access && <span data-access={command.access}>{command.access}</span>}</div>
    <p>{command.description}</p>
    {command.example && <p className={styles.commandExample}><span>Try</span><code>{command.example}</code></p>}
    {command.cooldown && <span className={styles.commandCooldown}>⌛ {command.cooldown}</span>}
    {command.aliases && <details className={styles.commandAliases}><summary>Aliases ({command.aliases.length})</summary><span>{command.aliases.join(" · ")}</span></details>}
  </article>;
}
