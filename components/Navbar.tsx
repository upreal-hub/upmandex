"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import LoginButton from "./LoginButton";
import ThemeToggle from "./ThemeToggle";
import styles from "./Navbar.module.css";

type MenuItem = { label: string; detail: string; icon: string; href?: string };
type Menu = { label: string; intro: string; icon: string; items: MenuItem[]; auth?: boolean };

const menus: Menu[] = [
  { label: "Upmandex", intro: "Meet the faces in the clouds.", icon: "☁", items: [
    { label: "Explore the Dex", detail: "Discover every public Upman", icon: "✦", href: "/upmans" },
    { label: "Pull Chances", detail: "A guide to pull chances is coming soon", icon: "✧" },
    { label: "Twitch Commands", detail: "A command guide is coming soon", icon: "⌘" },
    { label: "Upman Lore", detail: "Stories from the cloud world are coming soon", icon: "☼" },
  ] },
  { label: "Collection", intro: "Your discoveries, all in one sky.", icon: "✧", items: [
    { label: "My Collection", detail: "See your collected Upmans", icon: "☁", href: "/my-collection" },
    { label: "My Progress", detail: "Track your collection and rarities", icon: "◒", href: "/my-collection" },
    { label: "How to Collect", detail: "A collection guide is coming soon", icon: "?" },
    { label: "Achievements", detail: "Explore the achievement gallery", icon: "✦", href: "/achievements" },
  ] },
  { label: "Community", intro: "A sky shared by many explorers.", icon: "✺", items: [
    { label: "Leaderboards", detail: "Meet the top collectors and creators", icon: "♛", href: "/community#community-members-heading" },
    { label: "Cloud Members", detail: "Find community members", icon: "☁", href: "/community#community-members-heading" },
    { label: "Top Creators", detail: "Discover the people creating Upmans", icon: "✎", href: "/community#community-members-heading" },
    { label: "Community Highlights", detail: "Explore shared discoveries", icon: "✦", href: "/community#community-overview-heading" },
  ] },
  { label: "Cloud Worlds", intro: "Creative corners of the community.", icon: "✵", items: [
    { label: "Connected Worlds", detail: "Meet creators and friends", icon: "☁", href: "/people" },
    { label: "Art Galleries", detail: "Artwork made by the community", icon: "✎", href: "/art" },
    { label: "Stream Schedules", detail: "Stream schedules are coming soon", icon: "◷" },
    { label: "Stream Tools", detail: "A guide to stream tools is coming soon", icon: "⚙" },
    { label: "Projects", detail: "Little ideas shared by the community", icon: "✧", href: "/projects" },
  ] },
  { label: "My Profile", intro: "Make your own corner of the sky.", icon: "✿", auth: true, items: [
    { label: "My Profile", detail: "Open your linked Person profile", icon: "☁", href: "/profile" },
    { label: "Customization", detail: "Customize from your Person profile", icon: "✧", href: "/profile" },
    { label: "Achievements", detail: "Explore your achievement rewards", icon: "✦", href: "/profile" },
    { label: "My Creations", detail: "See creations on your Person profile", icon: "✎", href: "/profile" },
  ] },
];

export default function Navbar() {
  const { data: session } = useSession();
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLButtonElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleMenus = menus.filter((menu) => !menu.auth || session?.user);
  const activeMenu = visibleMenus.find((menu) => menu.label === openMenu);

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  function hoverMenu(label: string) {
    clearTimers();
    openTimer.current = setTimeout(() => setOpenMenu(label), 200);
  }

  function leaveMenu() {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpenMenu(null), 200);
  }

  const closeNavigation = useCallback(() => {
    clearTimers();
    setOpenMenu(null);
    setMobileOpen(false);
  }, [clearTimers]);

  useEffect(() => {
    const dismiss = (event: Event) => {
      if (!navRef.current?.contains(event.target as Node)) closeNavigation();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openMenu) triggers.current[openMenu]?.focus();
      else if (mobileOpen) mobileRef.current?.focus();
      closeNavigation();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", escape);
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [openMenu, mobileOpen, closeNavigation]);

  const renderItems = (menu: Menu) => menu.items.map((item) => item.href ? (
    <Link key={item.label} href={item.href} className={styles.item} onClick={closeNavigation}>
      <span className={styles.itemIcon} aria-hidden="true">{item.icon}</span>
      <span><strong>{item.label}</strong><small>{item.detail}</small></span><span className={styles.arrow} aria-hidden="true">↗</span>
    </Link>
  ) : (
    <div key={item.label} className={`${styles.item} ${styles.soon}`}>
      <span className={styles.itemIcon} aria-hidden="true">{item.icon}</span>
      <span><strong>{item.label}</strong><small>{item.detail}</small></span><span className={styles.soonLabel}>Soon</span>
    </div>
  ));

  return (
    <nav ref={navRef} className="site-nav" aria-label="Primary navigation" onPointerLeave={(event) => { if (event.pointerType === "mouse") leaveMenu(); }} onPointerEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}>
      <div className={`site-nav-bar ${styles.bar}`}>
        <Link href="/" className="brand-mark" aria-label="UPMANDEX home" onClick={closeNavigation}>
          <span aria-hidden="true" className="brand-cloud">☁</span><span className="brand-wordmark">UPMANDEX</span>
        </Link>
        <div className={`site-nav-desktop ${styles.desktop}`}>
          {visibleMenus.map((menu) => <button key={menu.label} ref={(node) => { triggers.current[menu.label] = node; }} type="button"
            className={`site-nav-link ${styles.trigger} ${openMenu === menu.label ? "is-active" : ""}`}
            aria-expanded={openMenu === menu.label} aria-controls="uppy-mega-menu"
            onPointerEnter={(event) => { if (event.pointerType === "mouse") hoverMenu(menu.label); }}
            onFocus={() => { clearTimers(); setOpenMenu(menu.label); }}
            onKeyDown={(event) => {
              if ((event.key === "Tab" && !event.shiftKey) || event.key === "ArrowDown") {
                const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>("a[href]");
                if (openMenu === menu.label && firstLink) { event.preventDefault(); firstLink.focus(); }
              }
            }}
            onClick={() => { clearTimers(); setOpenMenu(menu.label); }}>
            {menu.label}<span aria-hidden="true">⌄</span>
          </button>)}
        </div>
        <div className="site-nav-actions"><ThemeToggle /><div className="site-nav-login"><LoginButton /></div>
          <button ref={mobileRef} type="button" className="mobile-menu-trigger" aria-label="Toggle navigation menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => { setMobileOpen((current) => !current); setOpenMenu(null); }}><span /><span /><span /></button>
        </div>
      </div>
      {activeMenu && <div ref={menuRef} id="uppy-mega-menu" className={styles.menuBridge} onPointerEnter={clearTimers}>
        <section className={styles.menu} data-world={activeMenu.label} aria-label={`${activeMenu.label} navigation`}>
          <div className={styles.menuIntro}><span className={styles.menuIcon} aria-hidden="true">{activeMenu.icon}</span><div><strong>{activeMenu.label}</strong><p>{activeMenu.intro}</p></div><span className={styles.sparkle} aria-hidden="true">✦ · ✧</span></div>
          <div className={styles.items}>{renderItems(activeMenu)}</div>
        </section>
      </div>}
      {mobileOpen && <div id="mobile-navigation" className={`mobile-navigation ${styles.mobile}`}>
        {visibleMenus.map((menu) => <section key={menu.label} className={styles.mobileGroup}>
          <button type="button" className={styles.mobileTrigger} aria-expanded={openMenu === menu.label} onClick={() => setOpenMenu((current) => current === menu.label ? null : menu.label)}>
            <span aria-hidden="true">{menu.icon}</span> {menu.label}<span aria-hidden="true">{openMenu === menu.label ? "−" : "+"}</span>
          </button>
          {openMenu === menu.label && <div className={styles.mobileItems}>{renderItems(menu)}</div>}
        </section>)}
      </div>}
    </nav>
  );
}
