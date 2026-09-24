"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import LoginButton from "./LoginButton";
import ThemeToggle from "./ThemeToggle";

const primaryNavigation = [
  { label: "Home", href: "/" },
  { label: "Upmandex", href: "/upmans" },
  { label: "My Collection", href: "/my-collection" },
  { label: "Art", href: "/pantheon" },
];

const exploreNavigation = [
  { label: "Projects", detail: "Little worlds in progress" },
  { label: "Creators & Friends", detail: "Meet the cloud artists", href: "/pantheon" },
  { label: "Community", detail: "Collections and explorers", href: "/community" },
  { label: "About", detail: "The story behind Upmandex" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setIsExploreOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const isCurrentRoute = (href: string) => href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <div className="site-nav-bar">
        <Link href="/" className="brand-mark" aria-label="UPMANDEX home">
          <span aria-hidden="true" className="brand-cloud">☁</span>UPMANDEX
        </Link>

        <div className="site-nav-desktop">
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href}
              className={`site-nav-link ${isCurrentRoute(item.href) ? "is-active" : ""}`}>
              {item.label}
            </Link>
          ))}
          <div className="explore-menu">
            <button type="button" className={`site-nav-link explore-trigger ${isExploreOpen ? "is-active" : ""}`}
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
          <button type="button" className="mobile-menu-trigger" aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen} aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((current) => !current)}>
            <span /> <span /> <span />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-navigation" className="mobile-navigation">
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{item.label}</Link>
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
