import { upmans } from "./data/upmans.ts";
import { writeFileSync } from "fs";

writeFileSync(
  "./data/upmans.json",
  JSON.stringify(upmans, null, 2)
);

console.log(
  `✅ ${upmans.length} Upmans exportés`
);