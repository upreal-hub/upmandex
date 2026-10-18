"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import LoginButton from "./LoginButton";
import ThemeToggle from "./ThemeToggle";

const primaryNavigation = [
  { label: "Home", href: "/" },
  { label: "Upmandex", href: "/upmans" },
  { label: "My Collection", href: "/my-collection" },
  { label: "Creators & Friends", href: "/people" },
];

const exploreNavigation = [
  { label: "Art", detail: "Community art from the cloud world", href: "/art" },
  { label: "Projects", detail: "Little worlds in progress", href: "/projects" },
  { label: "Community", detail: "Collections and explorers", href: "/community" },
  { label: "About", detail: "The story behind Upmandex" },
];

export default function Navbar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLButtonElement>(null);
  const mobileRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isExploreOpen) exploreRef.current?.focus();
        else if (isMenuOpen) mobileRef.current?.focus();
        setIsMenuOpen(false);
        setIsExploreOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isExploreOpen, isMenuOpen]);

  useEffect(() => {
    const dismiss = (event: Event) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setIsExploreOpen(false); setIsMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", dismiss); };
  }, []);

  const isCurrentRoute = (href: string) => href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <nav ref={navRef} className="site-nav" aria-label="Primary navigation">
      <div className="site-nav-bar">
        <Link href="/" className="brand-mark" aria-label="UPMANDEX home">
          <span aria-hidden="true" className="brand-cloud">☁</span><span className="brand-wordmark">UPMANDEX</span>
        </Link>

        <div className="site-nav-desktop">
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setIsExploreOpen(false)}
              aria-current={isCurrentRoute(item.href) ? "page" : undefined}
              className={`site-nav-link ${isCurrentRoute(item.href) ? "is-active" : ""}`}>
              {item.label}
            </Link>
          ))}
          <div className="explore-menu">
            <button ref={exploreRef} type="button" className={`site-nav-link explore-trigger ${isExploreOpen ? "is-active" : ""}`}
              aria-expanded={isExploreOpen} aria-controls="explore-menu"
              onClick={() => setIsExploreOpen((current) => !current)}>
              Explore <span aria-hidden="true">⌄</span>
            </button>
            {isExploreOpen && (
              <div id="explore-menu" className="explore-popover">
                {exploreNavigation.map((item, index) => item.href ? (
                  <Link key={item.label} href={item.href} className="explore-item" onClick={() => setIsExploreOpen(false)}>
                    <span aria-hidden="true" className="explore-number">0{index + 1}</span>
                    <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  </Link>
                ) : (
                  <span key={item.label} className="explore-item is-coming-soon" aria-disabled="true">
                    <span aria-hidden="true" className="explore-number">0{index + 1}</span>
                    <span><strong>{item.label}</strong><small>{item.detail} · Coming soon</small></span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="site-nav-actions">
          <ThemeToggle />
          <div className="site-nav-login"><LoginButton /></div>
          <button ref={mobileRef} type="button" className="mobile-menu-trigger" aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen} aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((current) => !current)}>
            <span /> <span /> <span />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-navigation" className="mobile-navigation">
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isCurrentRoute(item.href) ? "page" : undefined} className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{item.label}</Link>
          ))}
          <div className="mobile-explore">
            <p>Explore</p>
            {exploreNavigation.map((item) => item.href ? (
              <Link key={item.label} href={item.href} onClick={() => setIsMenuOpen(false)}>{item.label}<small>{item.detail}</small></Link>
            ) : (
              <span key={item.label}>{item.label}<small>{item.detail} · Coming soon</small></span>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
