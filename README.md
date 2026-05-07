# Job Tracker (Vercel)

All-in-one US-only job tracker that pulls live postings from official ATS feeds.
Crawling is the primary path; **Report Missing Job** is a backup that hits the
same Workday CXS JSON endpoint — never HTML scraping.

## Hard rules

- US jobs only. India is filtered out at every layer (search hit hydration,
  store insert, store read).
- A job stays in the store for 5 days from the **original ATS `startDate`**.
  The crawler clock is never used for freshness.
- Apply links are the canonical Workday URL:
  `https://<tenant>.wd5.myworkdayjobs.com/en-US/<site>/job/<loc>/<slug>_<id>`
  (we also honor `externalUrl` from CXS when present).
- `/latest`, `/entry-level`, `/companies/<slug>`, `/api/jobs`,
  `/api/companies/<slug>` all read from the same validated in-memory store
  (`lib/store.ts`). The store is also persisted to `data/jobs.json` so cold
  reloads keep state.
- No hardcoded production rows. The crawler discovers everything live; the
  `npm run test:walmart` script is a probe, not a seed.

## Stack

Next.js 14 (App Router) + TypeScript. No DB — the in-memory store + JSON
snapshot is enough for a single-region serverless deployment. Drop-in
replacement candidates are listed in `lib/store.ts`.

## Layout

```
app/
  layout.tsx, page.tsx, globals.css
  latest/page.tsx
  entry-level/page.tsx
  companies/[slug]/page.tsx
  health/page.tsx
  api/
    run-now/route.ts          # POST or GET — triggers a crawl, updates store
    jobs/route.ts             # GET — entire store
    companies/[slug]/route.ts # GET — one company's jobs
    health/route.ts           # GET — sources[], totalJobs, lastDiff, lastRunAt
    report-missing/route.ts   # POST {url} — Workday CXS lookup, no HTML parse
components/
  JobTable.tsx, ReportMissingForm.tsx
lib/
  classify.ts                 # entry-level include/exclude regexes
  dates.ts                    # 5-day freshness, MM/DD/YYYY date headers
  locations.ts                # US-only filter
  store.ts                    # validated in-memory + persisted store
  runtime.ts                  # crawl orchestrator used by /api/run-now
  types.ts
  sources/
    workday.ts                # SEARCH_TERMS, crawlWorkdaySite, fetchWorkdayJobDetail
    walmart.ts                # Walmart Workday config
scripts/
  test-walmart.ts             # standalone probe for R-2495265
vercel.json                   # cron */10 * * * * → /api/run-now
```

## Commands

```bash
npm install
npm run lint
npm run build
npm start              # serve production build on :3000
npm run dev            # dev server
npm run test:walmart   # probe Walmart for R-2495265 (or pass a URL arg)
```

## Crawl tuning (dev)

`/api/run-now` accepts query params for fast local verification — these are NOT
part of the contract and are ignored in production cron calls:

- `limitTerms=N` — only run the first N entries of `SEARCH_TERMS`
- `maxOffset=N` — stop pagination at offset N
- `sleepMs=N` — override the 1500ms inter-page sleep

A full production run iterates ~117 search terms × up to 100 pages each at
1500ms = up to several hours per source. Vercel `maxDuration` is 60s; production
should split crawls across multiple cron invocations or use a queue/worker. For
now, `/api/run-now` is best-effort within `maxDuration`.

## Local verification (this build)

```
GET  /api/health                            -> 200, sources=[walmart pending], totalJobs=0
POST /api/run-now?limitTerms=2&maxOffset=80 -> 200, walmart {jobCount:6, ...}
GET  /api/jobs                              -> 6 live US Walmart jobs, all within 5 days
GET  /api/companies/walmart                 -> 6 jobs
POST /api/report-missing {bogus URL}        -> 404 workday_not_found
POST /api/report-missing {real fresh URL}   -> 200 {job:{id:WALMART-R-2401393, ...}}
```

`R-2495265` is **not** currently in Walmart's live feed (CXS search returns 0
hits). When/if it returns, a normal crawl or a Report-Missing call will pick it
up; we never seed it.

## Known limitations

- A full crawl exceeds Vercel's 60s function ceiling. The cron is set up but a
  real production deploy needs either a longer-running compute (Cloud Run /
  ECS) or a sharded scheduler (one term per invocation).
- The US-only check is heuristic — it relies on Workday returning a string
  like `"Bentonville, AR"`. Locations with no country/state suffix and no
  India/non-US tokens default to rejected.
- Workday's CXS responds 404 on some tenants and 406 on others for unknown
  paths; both are treated as "not found" by Report Missing.
