import Link from "next/link";

import HomeFeaturedUpmanCard from "@/components/HomeFeaturedUpmanCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const upmans = await prisma.upman.findMany({
    orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
    select: { slug: true, name: true, image: true, rarity: true, creator: true, firstOwner: true },
  });

  const totalUpmans = upmans.length;
  const totalCreators = new Set(upmans.map((upman) => upman.creator)).size;
  const totalFirstOwners = upmans.filter((upman) => upman.firstOwner).length;
  const latestUpmans = upmans.slice(0, 3);

  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div aria-hidden="true" className="sky-cloud sky-cloud-one" />
        <div aria-hidden="true" className="sky-cloud sky-cloud-two" />
        <div aria-hidden="true" className="sky-sparkle sky-sparkle-one">✦</div>
        <div className="hero-copy">
          <h1 id="home-title">UPMANDEX</h1>
          <p className="hero-kicker">A sky full of tiny stories.</p>
          <p className="hero-description">
            Discover Upmans, the artists who create them, and the community collecting every cloud-dwelling oddity.
          </p>
          <Link href="/upmans" className="primary-button">Explore the Upmandex <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span>☁</span><i>✦</i><b>✧</b></div>
        <div className="home-facts" aria-label="Upmandex facts">
          <span><strong>{totalUpmans}</strong> Upmans</span>
          <span><strong>{totalCreators}</strong> creators</span>
          <span><strong>{totalFirstOwners}</strong> first explorers</span>
        </div>
      </section>

      <section className="home-destinations" aria-labelledby="destinations-title">
        <div className="section-heading">
          <p>Choose a cloud</p>
          <h2 id="destinations-title">Where would you like to wander?</h2>
        </div>
        <div className="destination-grid">
          <Link href="/upmans" className="destination-card destination-card-sky"><span className="destination-icon">◌</span><div><p>01 · The Dex</p><h3>UPMANDEX</h3><span>Meet every known Upman</span></div><b aria-hidden="true">↗</b></Link>
          <Link href="/my-collection" className="destination-card destination-card-lavender"><span className="destination-icon">✦</span><div><p>02 · Yours</p><h3>MY COLLECTION</h3><span>See the clouds you have found</span></div><b aria-hidden="true">↗</b></Link>
          <Link href="/pantheon" className="destination-card destination-card-coral"><span className="destination-icon">✎</span><div><p>03 · Made with care</p><h3>ART</h3><span>Visit the Cloud Pantheon</span></div><b aria-hidden="true">↗</b></Link>
          <Link href="/community" className="destination-card destination-card-gold"><span className="destination-icon">☼</span><div><p>04 · Beyond the Dex</p><h3>EXPLORE</h3><span>Creators, friends and community</span></div><b aria-hidden="true">↗</b></Link>
        </div>
      </section>

      {latestUpmans.length > 0 && (
        <section className="home-featured" aria-labelledby="featured-title">
          <div className="section-heading section-heading-inline">
            <div><p>Fresh from the clouds</p><h2 id="featured-title">New in the Upmandex</h2></div>
            <Link href="/upmans" className="secondary-button">See the full Dex <span aria-hidden="true">→</span></Link>
          </div>
          <div className="home-upman-grid">
            {latestUpmans.map((upman) => <HomeFeaturedUpmanCard key={upman.slug} {...upman} />)}
          </div>
        </section>
      )}
    </main>
  );
}
