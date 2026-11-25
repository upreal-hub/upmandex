"use client";

import { useState } from "react";
import Image from "next/image";
import { copyCommand, searchCommands, type CommandCatalog, type TwitchCommand } from "@/lib/twitch-command-catalog";
import styles from "./twitch-commands.module.css";

export function CommandCard({ command, showCopy = true }: { command: TwitchCommand; showCopy?: boolean }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await copyCommand(navigator.clipboard, command.example);
      setStatus("Copied");
    } catch { setStatus("Copy unavailable. Select the example to copy it."); }
  }
  return <article className={styles.card}>
    <div className={styles.cardTop}><span className={styles.icon} aria-hidden="true">{command.icon}</span><h3><code>{command.syntax || "!command"}</code></h3></div>
    <p>{command.description || "Command description"}</p>
    {command.aliases.length > 0 && <div className={styles.aliases}><span>Aliases</span>{command.aliases.map((alias, index) => <code key={index}>{alias}</code>)}</div>}
    <div className={styles.example}><span>Try it in chat</span><code>{command.example || "!command"}</code>
      {showCopy && <button type="button" aria-label={`Copy example for ${command.syntax}`} onClick={() => void copy()}>{status === "Copied" ? "Copied" : "Copy example"}</button>}
      <span className={status === "Copied" ? "sr-only" : undefined} role="status">{status}</span>
    </div>
    <dl className={styles.cooldowns}>
      <div><dt>Global cooldown</dt><dd>{command.global ? `${command.global}s` : "None"}</dd></div>
      <div><dt>Viewer cooldown</dt><dd>{command.viewer ? `${command.viewer}s` : "None"}</dd></div>
    </dl>
  </article>;
}

export default function TwitchCommandsGuide({ catalog }: { catalog: CommandCatalog | null }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const results = searchCommands(catalog?.commands ?? [], query, category);
  return <main className={styles.page}>
    <header className={styles.hero}>
      <div>
        <h1>Twitch Commands</h1>
        <p>Drop into upreal_’s chat, join a Gartic room, request a track, or send someone a hug.</p>
        <a href="https://www.twitch.tv/upreal_">Open Twitch chat ↗</a>
      </div>
      <div className={styles.art} aria-hidden="true">
        <Image className={styles.artSide} src="/upmans/discoupman.png" alt="" width={164} height={164} unoptimized />
        <Image className={styles.artMain} src="/upmans/garticupman.png" alt="" width={240} height={240} unoptimized />
      </div>
    </header>
    {catalog ? <>
      <section className={styles.tools} aria-label="Find a command">
        <label htmlFor="command-search">Search commands or aliases</label>
        <input id="command-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try !lurk, !brb, or song" />
        <nav aria-label="Command categories" className={styles.filters}>
          {[{ id: "", title: "All commands" }, ...catalog.categories].map(item =>
            <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.title}</button>)}
        </nav>
        <p className={styles.hint}>Replace text in <code>&lt;angle brackets&gt;</code> with your input. <code>[Square brackets]</code> indicate optional input.</p>
      </section>
      <p role="status" className={styles.count}>{results.length} {results.length === 1 ? "command" : "commands"}</p>
      {results.length === 0 && <p className={styles.empty}>No commands match your search.</p>}
      {catalog.categories.map(item => {
        const commands = results.filter(command => command.categoryId === item.id);
        if (!commands.length) return null;
        return <section className={styles.section} key={item.id} aria-labelledby={`category-${item.id}`}>
          <h2 id={`category-${item.id}`}>{item.title}</h2>
          <div className={styles.grid}>{commands.map(command => <CommandCard key={command.id} command={command} />)}</div>
        </section>;
      })}
    </> : <p className={styles.empty}>The command catalog is temporarily unavailable.</p>}
  </main>;
}
