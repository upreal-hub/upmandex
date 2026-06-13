export default function AchievementsPage() {
  const achievements = [
    {
      icon: "👑",
      name: "Legendary Collector",
      description:
        "Own at least one Legendary Upman",
    },

    {
      icon: "🔥",
      name: "Mythic Hunter",
      description:
        "Own at least one Mythic Upman",
    },

    {
      icon: "🏅",
      name: "Upman Veteran",
      description:
        "Own 20 or more Upmans",
    },

    {
      icon: "💎",
      name: "Common Master",
      description:
        "Collect every Common Upman",
    },

    {
      icon: "⚡",
      name: "Event Hunter",
      description:
        "Collect an Event Upman",
    },

    {
      icon: "👻",
      name: "Secret Finder",
      description:
        "Discover a Secret Upman",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">

      <h1 className="text-5xl font-bold mb-10">
        🏆 Achievements
      </h1>

      <p className="opacity-70 mb-8">
        Unlock badges by collecting Upmans.
      </p>

      <div className="grid grid-cols-2 gap-6">

        {achievements.map((achievement) => (
          <div
            key={achievement.name}
            className="border border-slate-700 rounded-lg p-6"
          >
            <div className="text-4xl mb-4">
              {achievement.icon}
            </div>

            <h2 className="text-2xl font-bold">
              {achievement.name}
            </h2>

            <p className="opacity-70 mt-2">
              {achievement.description}
            </p>
          </div>
        ))}

      </div>

    </main>
  );
}