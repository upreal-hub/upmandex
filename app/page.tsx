import Link from "next/link";
import { upmans } from "@/data/upmans";
import LatestUpmanCarousel from "@/components/LatestUpmanCarousel";
import Navbar from "@/components/Navbar";

export default function HomePage() {

  const totalUpmans =
    upmans.length;

  const totalCreators =
    new Set(
      upmans.map(
        (u) => u.creator
      )
    ).size;

  const totalFirstOwners =
    upmans.filter(
      (u) => u.firstOwner
    ).length;

  const latestUpmans =
    upmans
      .slice(-5)
      .reverse();

  return (
    <main>

      {/* Hero */}

      <div className="text-center py-20 mb-12">

  <p className="text-sky-600 font-bold tracking-[0.3em] uppercase mb-4">
    ☁️ Welcome to the Skylands ☁️
  </p>

  <h1 className="text-7xl md:text-8xl xl:text-9xl font-black text-sky-800">
    UPMANDEX
  </h1>

  <div className="w-40 h-1 bg-sky-300 mx-auto rounded-full mt-6" />

  <p className="text-2xl mt-8 text-sky-700">
    Discover • Collect • Create
  </p>

  <p className="mt-6 text-lg text-sky-600 max-w-3xl mx-auto">

    Explore the floating world of the Upmans.
    Discover creatures created by artists,
    collected by viewers,
    and remembered in the Cloud Pantheon.

  </p>

</div>

      {/* Global Stats */}

      <div className="-colsgrid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

        <div className="
bg-white/80
backdrop-blur-md
rounded-3xl
p-8
text-center
shadow-xl
hover:-translate-y-1
transition
">

          <p className="text-5xl font-bold">
            📦
          </p>

          <p className="text-3xl font-bold mt-2">
            {totalUpmans}
          </p>

          <p className="opacity-70 mt-2">
            Upmans
          </p>

        </div>

        <div className="
bg-white/80
backdrop-blur-md
rounded-3xl
p-8
text-center
shadow-xl
hover:-translate-y-1
transition
">

          <p className="text-5xl font-bold">
            🎨
          </p>

          <p className="text-3xl font-bold mt-2">
            {totalCreators}
          </p>

          <p className="opacity-70 mt-2">
            Creators
          </p>

        </div>

        <div className="
bg-white/80
backdrop-blur-md
rounded-3xl
p-8
text-center
shadow-xl
hover:-translate-y-1
transition
">

          <p className="text-5xl font-bold">
            👑
          </p>

          <p className="text-3xl font-bold mt-2">
            {totalFirstOwners}
          </p>

          <p className="opacity-70 mt-2">
            First Owners
          </p>

        </div>

      </div>

      {/* Navigation */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

        <Link href="/upmans">

          <div className="
bg-white/80
backdrop-blur-md
rounded-3xl
p-8
shadow-xl
hover:-translate-y-1
hover:shadow-2xl
transition-all
cursor-pointer
">

            <h2 className="text-3xl font-bold">
              📖 Explore Upmans
            </h2>

            <p className="opacity-70 mt-3">
              Browse every creation in the Upmandex
            </p>

          </div>

        </Link>

        <Link href="/hall-of-fame">

          <div className="
bg-white/80
backdrop-blur-md
rounded-3xl
p-8
shadow-xl
hover:-translate-y-1
hover:shadow-2xl
transition-all
cursor-pointer
">

            <h2 className="text-3xl font-bold">
              👑 Hall of Fame
            </h2>

            <p className="opacity-70 mt-3">
              Discover the legends of the community
            </p>

          </div>

        </Link>

      </div>

      <LatestUpmanCarousel
  upmans={latestUpmans}
/>

    </main>
  );
}