"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function SkyAtmosphere() {
  const pathname = usePathname();
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".home-destinations, .home-featured");
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (!("IntersectionObserver" in window) || preference.matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove("awaiting-sky"); observer.unobserve(entry.target); } });
    }, { threshold: .08 });
    elements.forEach(element => { element.classList.add("awaiting-sky"); observer.observe(element); });
    const reveal = () => elements.forEach(element => element.classList.remove("awaiting-sky"));
    preference.addEventListener("change", reveal);
    return () => { observer.disconnect(); reveal(); preference.removeEventListener("change", reveal); };
  }, [pathname]);
  return <div className="living-sky" aria-hidden="true"><div className="night-stars" /><span className="ambient-cloud ambient-cloud-one" /><span className="ambient-cloud ambient-cloud-two" /></div>;
}
