// Crawl orchestration shared by /api/run-now and any future scheduler entry.

import { COMPANIES } from "./sources/walmart";
import { crawlWorkdaySite, type CrawlOptions } from "./sources/workday";
import { setHealth, setLastDiff, upsertCompanyJobs } from "./store";
import type { RunDiff } from "./types";

export interface RunSummary {
  startedAt: string;
  finishedAt: string;
  diff: RunDiff;
  perCompany: Record<
    string,
    {
      jobCount: number;
      added: number;
      removed: number;
      staleRemoved: number;
      errors: string[];
      uniquePaths: number;
      pagesFetched: number;
      detailsFetched: number;
    }
  >;
}

export async function runCrawl(opts: CrawlOptions = {}): Promise<RunSummary> {
  const startedAt = new Date().toISOString();
  const totals: RunDiff = { added: [], removed: [], staleRemoved: [] };
  const perCompany: RunSummary["perCompany"] = {};

  for (const cfg of COMPANIES) {
    const compStart = new Date().toISOString();
    setHealth({
      company: cfg.company,
      status: "pending",
      jobCount: 0,
      lastRun: compStart,
      errors: [],
    });
    let result;
    try {
      result = await crawlWorkdaySite(cfg, opts);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setHealth({
        company: cfg.company,
        status: "blocked",
        jobCount: 0,
        lastRun: new Date().toISOString(),
        errors: [msg],
      });
      perCompany[cfg.company] = {
        jobCount: 0,
        added: 0,
        removed: 0,
        staleRemoved: 0,
        errors: [msg],
        uniquePaths: 0,
        pagesFetched: 0,
        detailsFetched: 0,
      };
      continue;
    }

    const upsert = upsertCompanyJobs(cfg.company, result.jobs);
    totals.added.push(...upsert.added);
    totals.removed.push(...upsert.removed);
    totals.staleRemoved.push(...upsert.staleRemoved);

    const status =
      result.errors.length > 0 && result.jobs.length === 0
        ? "blocked"
        : result.errors.length > 0
        ? "partial"
        : result.jobs.length === 0
        ? "empty_ok"
        : "ok";

    setHealth({
      company: cfg.company,
      status,
      jobCount: result.jobs.length,
      lastRun: new Date().toISOString(),
      errors: result.errors.slice(0, 25),
    });

    perCompany[cfg.company] = {
      jobCount: result.jobs.length,
      added: upsert.added.length,
      removed: upsert.removed.length,
      staleRemoved: upsert.staleRemoved.length,
      errors: result.errors,
      uniquePaths: result.uniquePaths,
      pagesFetched: result.pagesFetched,
      detailsFetched: result.detailsFetched,
    };
  }

  setLastDiff(totals);
  const finishedAt = new Date().toISOString();
  console.log(
    `[run-now] diff added=${totals.added.length} removed=${totals.removed.length} staleRemoved=${totals.staleRemoved.length}`
  );
  return { startedAt, finishedAt, diff: totals, perCompany };
}
