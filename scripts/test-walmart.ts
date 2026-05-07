// Standalone validator that exercises the Workday CXS path for a known
// Walmart job ID. NOT seeded into production data.
//
// Usage: npm run test:walmart -- [optional-url]

import {
  fetchWorkdayJobDetail,
  parseWorkdayUrl,
} from "../lib/sources/workday";
import { WALMART } from "../lib/sources/walmart";
import { isFresh } from "../lib/dates";
import { isUsLocation } from "../lib/locations";

async function main() {
  const arg = process.argv[2];
  if (arg) {
    const parsed = parseWorkdayUrl(arg);
    if (!parsed) {
      console.error("could not parse:", arg);
      process.exit(2);
    }
    console.log("parsed:", parsed);
    const detail = await fetchWorkdayJobDetail(
      parsed.host,
      parsed.tenant,
      parsed.site,
      parsed.externalPath
    );
    console.log("detail:", detail);
    console.log("isUS:", isUsLocation(detail.location));
    console.log("isFresh:", isFresh(detail.startDate));
    return;
  }

  // Probe two specific Walmart paths the user has highlighted as the canonical
  // R-2495265 case. We try multiple plausible location segments.
  const candidates = [
    "/job/Bentonville-AR/Software-Engineer-II_R-2495265",
    "/job/Sunnyvale-CA/Software-Engineer-II_R-2495265",
    "/job/Bentonville/Software-Engineer-II_R-2495265",
  ];
  for (const p of candidates) {
    try {
      const d = await fetchWorkdayJobDetail(
        WALMART.host,
        WALMART.tenant,
        WALMART.site,
        p
      );
      console.log("FOUND", p, d);
      return;
    } catch (e) {
      console.log("miss", p, (e as Error).message);
    }
  }
  console.log("No probe path matched. Run a full crawl to discover it.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
