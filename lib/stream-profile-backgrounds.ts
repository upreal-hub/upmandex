/**
 * Public, resolved background primitives for trusted stream consumers.
 *
 * These values mirror the achievement background tokens in
 * app/people/[id]/person.module.css. They deliberately contain no Person,
 * achievement, or asset identifiers: the caller validates those separately.
 */
export type StreamBackgroundAppearance = {
  skyTop: string;
  skyBottom: string;
  glow: string;
  haze: string;
  pattern: string;
  glowX: string;
  glowY: string;
  angle: string;
  opacity: number;
};

type BackgroundTokens = Omit<StreamBackgroundAppearance, "glowX" | "glowY" | "angle" | "opacity"> &
  Partial<Pick<StreamBackgroundAppearance, "glowX" | "glowY" | "angle" | "opacity">>;

const defaults = {
  glowX: "15%",
  glowY: "18%",
  angle: "145deg",
  opacity: 0.88,
} as const;

function background(tokens: BackgroundTokens): StreamBackgroundAppearance {
  return { ...defaults, ...tokens };
}

const achievementBackgrounds: Record<string, StreamBackgroundAppearance> = {
  "background-collector-10": background({ skyTop: "#c6efff", skyBottom: "#eefaff", glow: "#b2e8ff", haze: "#e4f8ff", pattern: "radial-gradient(ellipse 19rem 7rem at 12% 55%, color-mix(in srgb, white 72%, transparent) 0 28%, transparent 30%)" }),
  "background-collector-50": background({ skyTop: "#82d3fb", skyBottom: "#ddf8ff", glow: "#64c7ff", haze: "#c6efff", pattern: "radial-gradient(ellipse 23rem 8rem at 8% 58%, color-mix(in srgb, white 75%, transparent) 0 27%, transparent 29%), radial-gradient(ellipse 17rem 6rem at 72% 24%, color-mix(in srgb, white 57%, transparent) 0 28%, transparent 30%)" }),
  "background-collector-100": background({ skyTop: "#8ce0ff", skyBottom: "#fff7d9", glow: "#fff1ae", haze: "#d9f7ff", glowX: "52%", pattern: "radial-gradient(circle at 17% 28%, #fff9d6 0 .16rem, transparent .22rem), radial-gradient(circle at 75% 42%, #fff9d6 0 .12rem, transparent .2rem), radial-gradient(ellipse 31rem 10rem at 50% 74%, color-mix(in srgb, white 72%, transparent) 0 28%, transparent 30%)" }),
  "background-rarity-common": background({ skyTop: "#c5f5cb", skyBottom: "#e9fbef", glow: "#91e3a2", haze: "#d7f9df", pattern: "radial-gradient(ellipse 20rem 7rem at 17% 58%, color-mix(in srgb, white 68%, transparent) 0 29%, transparent 31%)" }),
  "background-rarity-rare": background({ skyTop: "#87d6ff", skyBottom: "#dcefff", glow: "#6dd9ff", haze: "#bde8ff", pattern: "linear-gradient(118deg, transparent 0 38%, color-mix(in srgb, white 40%, transparent) 39% 41%, transparent 42% 61%, color-mix(in srgb, white 24%, transparent) 62% 64%, transparent 65%)" }),
  "background-rarity-epic": background({ skyTop: "#9d86dc", skyBottom: "#e8dfff", glow: "#d2b8ff", haze: "#e6d9ff", pattern: "radial-gradient(circle at 18% 22%, #fff 0 .1rem, transparent .18rem), radial-gradient(circle at 76% 35%, #fff 0 .13rem, transparent .2rem), radial-gradient(circle at 43% 68%, #fff 0 .09rem, transparent .16rem)" }),
  "background-rarity-mythic": background({ skyTop: "#743945", skyBottom: "#f1aaa0", glow: "#ffb271", haze: "#d67573", glowX: "84%", pattern: "radial-gradient(ellipse 28rem 8rem at 10% 78%, color-mix(in srgb, #4d2338 50%, transparent) 0 28%, transparent 31%), linear-gradient(0deg, color-mix(in srgb, #9f3947 28%, transparent), transparent 45%)" }),
  "background-rarity-legendary": background({ skyTop: "#ffd66d", skyBottom: "#fff5cf", glow: "#fff9c9", haze: "#ffe7a0", glowX: "61%", pattern: "radial-gradient(circle at 11% 23%, #fff 0 .12rem, transparent .21rem), radial-gradient(circle at 81% 40%, #fff 0 .17rem, transparent .27rem), radial-gradient(circle at 43% 65%, #fff 0 .11rem, transparent .19rem), linear-gradient(112deg, transparent 45%, color-mix(in srgb, white 55%, transparent) 49% 51%, transparent 55%)" }),
  "background-pull-veteran-10": background({ skyTop: "#b9eaff", skyBottom: "#e9f8ff", glow: "#c8f6ff", haze: "#d8f4ff", pattern: "linear-gradient(123deg, transparent 0 46%, color-mix(in srgb, white 64%, transparent) 47% 48%, transparent 49%)" }),
  "background-pull-veteran-100": background({ skyTop: "#6f9fde", skyBottom: "#d9d7ff", glow: "#c7baff", haze: "#c5ddff", pattern: "linear-gradient(122deg, transparent 0 33%, color-mix(in srgb, white 58%, transparent) 34% 35%, transparent 36% 58%, color-mix(in srgb, white 38%, transparent) 59% 60%, transparent 61%), linear-gradient(56deg, transparent 0 70%, color-mix(in srgb, white 30%, transparent) 71% 72%, transparent 73%)" }),
  "background-pull-veteran-500": background({ skyTop: "#315f94", skyBottom: "#bceeff", glow: "#d5fdff", haze: "#80d7ff", glowX: "48%", pattern: "radial-gradient(circle at 14% 24%, #dfffff 0 .11rem, transparent .2rem), radial-gradient(circle at 63% 34%, #dfffff 0 .14rem, transparent .24rem), radial-gradient(circle at 84% 69%, #dfffff 0 .1rem, transparent .18rem), repeating-linear-gradient(125deg, transparent 0 2.8rem, color-mix(in srgb, white 30%, transparent) 2.85rem 2.95rem, transparent 3rem 5rem)" }),
  "background-lucky-one": background({ skyTop: "#132c5a", skyBottom: "#7489c5", glow: "transparent", haze: "transparent", glowX: "74%", pattern: "none" }),
  "background-duplicate-magnet-10": background({ skyTop: "#aee8fa", skyBottom: "#e5fbff", glow: "#d5faff", haze: "#b6ecfa", pattern: "repeating-linear-gradient(90deg, transparent 0 3.6rem, color-mix(in srgb, #4aaed2 12%, transparent) 3.65rem 3.85rem, transparent 3.9rem 7.2rem)" }),
  "background-duplicate-magnet-50": background({ skyTop: "#9075c9", skyBottom: "#e7dcff", glow: "#d5bdff", haze: "#c8b3ef", pattern: "repeating-linear-gradient(90deg, transparent 0 2.4rem, color-mix(in srgb, white 24%, transparent) 2.45rem 2.62rem, transparent 2.68rem 4.9rem), repeating-linear-gradient(0deg, transparent 0 3.2rem, color-mix(in srgb, #704eb0 13%, transparent) 3.25rem 3.42rem, transparent 3.48rem 6.6rem)" }),
  "background-duplicate-magnet-100": background({ skyTop: "#a34f79", skyBottom: "#f0b4cf", glow: "#ffd3ec", haze: "#e98cb9", pattern: "repeating-radial-gradient(ellipse at 22% 36%, transparent 0 1.4rem, color-mix(in srgb, white 27%, transparent) 1.45rem 1.58rem, transparent 1.63rem 3.2rem)" }),
  "background-upman-creator-1": background({ skyTop: "#c0f2f2", skyBottom: "#e8faff", glow: "#b9f4ee", haze: "#c9efff", pattern: "linear-gradient(15deg, transparent 0 38%, color-mix(in srgb, #4aa8b6 17%, transparent) 39% 40%, transparent 41%)" }),
  "background-upman-creator-10": background({ skyTop: "#9ed8f2", skyBottom: "#e8f8ff", glow: "#b9e7ff", haze: "#c3f1f4", pattern: "repeating-linear-gradient(0deg, transparent 0 2.75rem, color-mix(in srgb, #3f91b4 12%, transparent) 2.8rem 2.88rem), repeating-linear-gradient(90deg, transparent 0 2.75rem, color-mix(in srgb, #3f91b4 12%, transparent) 2.8rem 2.88rem)" }),
  "background-upman-creator-50": background({ skyTop: "#7ecbd7", skyBottom: "#fff0bf", glow: "#fff1ab", haze: "#c5f5f2", glowX: "58%", pattern: "repeating-linear-gradient(0deg, transparent 0 1.95rem, color-mix(in srgb, #367f9d 16%, transparent) 2rem 2.08rem), repeating-linear-gradient(90deg, transparent 0 1.95rem, color-mix(in srgb, #367f9d 16%, transparent) 2rem 2.08rem), radial-gradient(circle at 78% 29%, #fff9da 0 .12rem, transparent .2rem)" }),
  "background-artist-1": background({ skyTop: "#aee8ff", skyBottom: "#ffe5d1", glow: "#ffd5c0", haze: "#c6efff", pattern: "linear-gradient(16deg, transparent 0 42%, color-mix(in srgb, #ef9278 25%, transparent) 43% 47%, transparent 48%)" }),
  "background-artist-10": background({ skyTop: "#9eb8f4", skyBottom: "#f5c1dd", glow: "#e7bbff", haze: "#ffd1b2", pattern: "linear-gradient(22deg, transparent 0 21%, color-mix(in srgb, #7f64c5 30%, transparent) 22% 29%, transparent 30%), linear-gradient(156deg, transparent 0 64%, color-mix(in srgb, #eb8baa 28%, transparent) 65% 73%, transparent 74%)" }),
  "background-artist-100": background({ skyTop: "#8ca8e7", skyBottom: "#ffe0a5", glow: "#fff0b5", haze: "#e3bbff", glowX: "49%", pattern: "radial-gradient(ellipse 27rem 7rem at 18% 74%, color-mix(in srgb, #ef8da5 42%, transparent) 0 28%, transparent 30%), linear-gradient(20deg, transparent 0 38%, color-mix(in srgb, #825bc7 35%, transparent) 39% 46%, transparent 47%), linear-gradient(156deg, transparent 0 68%, color-mix(in srgb, #f2b345 30%, transparent) 69% 75%, transparent 76%)" }),
  "background-gartic-regular-1": background({ skyTop: "#c2eaff", skyBottom: "#f2e2ff", glow: "#d7d0ff", haze: "#d8f6ff", pattern: "repeating-linear-gradient(28deg, transparent 0 3.8rem, color-mix(in srgb, #8d6fd0 15%, transparent) 3.85rem 3.98rem, transparent 4.03rem 7.8rem)" }),
  "background-gartic-regular-10": background({ skyTop: "#b59ce8", skyBottom: "#f2cce9", glow: "#e5c4ff", haze: "#d9b8f4", pattern: "repeating-linear-gradient(28deg, transparent 0 2.6rem, color-mix(in srgb, #7c59bc 21%, transparent) 2.65rem 2.82rem, transparent 2.87rem 5.5rem), repeating-linear-gradient(148deg, transparent 0 4.2rem, color-mix(in srgb, #ed90b6 17%, transparent) 4.25rem 4.42rem, transparent 4.47rem 8.8rem)" }),
  "background-gartic-regular-50": background({ skyTop: "#9c5c9a", skyBottom: "#f7b9d2", glow: "#ffd2e5", haze: "#e994c8", pattern: "repeating-linear-gradient(28deg, transparent 0 1.7rem, color-mix(in srgb, #6b3e80 24%, transparent) 1.75rem 1.9rem, transparent 1.95rem 3.7rem), repeating-linear-gradient(148deg, transparent 0 2.4rem, color-mix(in srgb, white 22%, transparent) 2.45rem 2.59rem, transparent 2.64rem 5.1rem)" }),
  "background-gartic-gallery-1": background({ skyTop: "#b8e8ff", skyBottom: "#e5f7ff", glow: "#d8f5ff", haze: "#c6e5ff", pattern: "linear-gradient(90deg, transparent 0 12%, color-mix(in srgb, #5498cf 18%, transparent) 12.2% 12.7%, transparent 12.9% 31%, color-mix(in srgb, #5498cf 18%, transparent) 31.2% 31.7%, transparent 31.9%)" }),
  "background-gartic-gallery-10": background({ skyTop: "#a790d9", skyBottom: "#eeddfb", glow: "#d9c5ff", haze: "#d1b5ef", pattern: "repeating-linear-gradient(90deg, transparent 0 3.2rem, color-mix(in srgb, white 38%, transparent) 3.25rem 3.45rem, transparent 3.5rem 6.7rem), linear-gradient(0deg, color-mix(in srgb, #6c4dad 13%, transparent), transparent 48%)" }),
  "background-gartic-gallery-50": background({ skyTop: "#9a7b5c", skyBottom: "#fff1c6", glow: "#fff2c4", haze: "#e4c082", glowX: "52%", pattern: "repeating-linear-gradient(90deg, transparent 0 2.8rem, color-mix(in srgb, #a57430 28%, transparent) 2.85rem 3.1rem, transparent 3.15rem 5.9rem), linear-gradient(0deg, color-mix(in srgb, white 22%, transparent), transparent 62%)" }),
  "background-checked-in-1": background({ skyTop: "#7ca1c9", skyBottom: "#d7e9f7", glow: "#ffe4a4", haze: "#b9d8ed", pattern: "radial-gradient(circle at 26% 30%, #fff0be 0 .14rem, transparent .24rem)" }),
  "background-checked-in-10": background({ skyTop: "#587fae", skyBottom: "#c9ddf0", glow: "#e8f7ff", haze: "#9bbfe0", pattern: "radial-gradient(circle at 18% 26%, #fff 0 .1rem, transparent .18rem), radial-gradient(circle at 66% 42%, #fff 0 .13rem, transparent .21rem), radial-gradient(circle at 84% 22%, #fff 0 .08rem, transparent .16rem)" }),
  "background-checked-in-50": background({ skyTop: "#405d97", skyBottom: "#d6b9df", glow: "#ffe2ae", haze: "#a28dcc", pattern: "radial-gradient(circle at 16% 24%, #fff0bd 0 .13rem, transparent .22rem), radial-gradient(circle at 40% 37%, #fff0bd 0 .16rem, transparent .25rem), radial-gradient(circle at 76% 28%, #fff0bd 0 .11rem, transparent .19rem), radial-gradient(circle at 87% 59%, #fff0bd 0 .1rem, transparent .18rem)" }),
  "background-checked-in-100": background({ skyTop: "#1e356b", skyBottom: "#8095d0", glow: "#fff2b5", haze: "#7897d0", glowX: "71%", pattern: "radial-gradient(circle at 72% 26%, #fff3c8 0 .65rem, transparent .68rem), radial-gradient(circle at 17% 20%, #fff 0 .1rem, transparent .18rem), radial-gradient(circle at 39% 42%, #fff 0 .13rem, transparent .21rem), radial-gradient(circle at 88% 58%, #fff 0 .1rem, transparent .18rem)" }),
  "background-event-veteran-1": background({ skyTop: "#b7e8ff", skyBottom: "#e6f9ff", glow: "#d6f6ff", haze: "#c3eaff", pattern: "linear-gradient(118deg, transparent 0 39%, color-mix(in srgb, #449ec7 18%, transparent) 40% 48%, transparent 49%)" }),
  "background-event-veteran-10": background({ skyTop: "#aa91d8", skyBottom: "#ead7ff", glow: "#ddc7ff", haze: "#cdb4ed", pattern: "repeating-linear-gradient(118deg, transparent 0 3.6rem, color-mix(in srgb, white 30%, transparent) 3.65rem 4.3rem, transparent 4.35rem 7.8rem)" }),
  "background-event-veteran-50": background({ skyTop: "#80709f", skyBottom: "#ffe4ae", glow: "#fff0b8", haze: "#d6bb9d", glowX: "53%", pattern: "repeating-linear-gradient(118deg, transparent 0 2.4rem, color-mix(in srgb, #fff4d5 35%, transparent) 2.45rem 3.15rem, transparent 3.2rem 5.5rem), linear-gradient(0deg, color-mix(in srgb, #c58a35 18%, transparent), transparent 58%)" }),
  "background-event-collector-1": background({ skyTop: "#89bfe2", skyBottom: "#e6ecff", glow: "#d6e9ff", haze: "#b9d4f0", pattern: "linear-gradient(140deg, transparent 0 45%, color-mix(in srgb, #e5bd59 33%, transparent) 46% 54%, transparent 55%)" }),
  "background-event-collector-10": background({ skyTop: "#8c75ba", skyBottom: "#e5d5ff", glow: "#d7bfff", haze: "#c9b1ea", pattern: "repeating-linear-gradient(140deg, transparent 0 3rem, color-mix(in srgb, #f5dd8b 28%, transparent) 3.05rem 3.65rem, transparent 3.7rem 6.5rem)" }),
  "background-event-collector-25": background({ skyTop: "#7b6b91", skyBottom: "#fff0bc", glow: "#fff2bf", haze: "#d3b980", glowX: "54%", pattern: "repeating-linear-gradient(140deg, transparent 0 2.2rem, color-mix(in srgb, #fff7d7 38%, transparent) 2.25rem 2.95rem, transparent 3rem 5rem), repeating-linear-gradient(90deg, transparent 0 2.45rem, color-mix(in srgb, #b2843d 16%, transparent) 2.5rem 2.58rem)" }),
};

export function getStreamAchievementBackgroundAppearance(styleKey: string) {
  return achievementBackgrounds[styleKey] ?? null;
}
