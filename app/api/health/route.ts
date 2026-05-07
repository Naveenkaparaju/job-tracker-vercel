import { NextResponse } from "next/server";
import { getAllJobs, getHealth, getLastDiff, getLastRunAt } from "@/lib/store";
import { COMPANIES } from "@/lib/sources/walmart";
import type { SourceHealth } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const known = COMPANIES.map((c) => c.company);
  const observed = new Map(getHealth().map((h) => [h.company, h]));
  const sources: SourceHealth[] = known.map(
    (c) =>
      observed.get(c) ?? {
        company: c,
        status: "pending" as const,
        jobCount: 0,
        lastRun: null,
        errors: [],
      }
  );

  const totalJobs = getAllJobs().length;

  return NextResponse.json({
    sources,
    totalJobs,
    lastRunAt: getLastRunAt(),
    lastDiff: getLastDiff(),
  });
}
