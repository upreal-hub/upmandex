import { PERSON_LINK_PLATFORM_DETAILS, type PersonLinkPlatform } from "@/lib/person-link-platforms";

import styles from "./person.module.css";

export default function PersonHeroLinks({ personName, links }: { personName: string; links: { id: string; platform: PersonLinkPlatform; url: string }[] }) {
  if (!links.length) return null;
  return <nav className={styles.heroLinks} aria-label={`${personName}'s external links`}>
    {links.map((link) => {
      const details = PERSON_LINK_PLATFORM_DETAILS[link.platform];
      return <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${personName}'s ${details.label} in a new tab`}>
        <span aria-hidden="true">{details.marker}</span>{details.label}<i aria-hidden="true">↗</i>
      </a>;
    })}
  </nav>;
}
