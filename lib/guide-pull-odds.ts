import { PULL_RARITIES } from "./upman-rarity";

export function guidePullOdds(
  rules: readonly { rarity: string; enabled: boolean; weight: number }[],
  eligibleRarities: ReadonlySet<string>,
) {
  const entries = PULL_RARITIES.map(rarity => {
    const rule = rules.find(candidate => candidate.rarity === rarity);
    const status = !rule?.enabled || rule.weight <= 0 ? "disabled" as const
      : !eligibleRarities.has(rarity) ? "empty" as const : "active" as const;
    return { rarity, status, weight: status === "active" ? (rule?.weight ?? 0) : 0 };
  });
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  return entries.map(({ rarity, status, weight }) => ({
    rarity, status, chance: total ? weight / total : null,
  }));
}
