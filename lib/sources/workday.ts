// Workday CXS source.
//
// For every search term and every offset 0..2000, POST the CXS search endpoint
// and dedupe results by externalPath. After pagination completes we also
// fetch the public siteMap.xml and pull any job URL we missed. Each result is
// hydrated via fetchWorkdayJobDetail so we have the authoritative startDate
// and full location string.
//
// We run conservatively: 1500ms between paginated POSTs.

import { classifyLevel } from "../classify";
import { isFresh } from "../dates";
import { isUsLocation } from "../locations";
import type { Job } from "../types";

export const SEARCH_TERMS: string[] = [
  "software engineer",
  "software engineer I",
  "software engineer II",
  "software engineer III",
  "senior software engineer",
  "staff software engineer",
  "principal software engineer",
  "distinguished software engineer",
  "software development engineer",
  "SDE",
  "SDE I",
  "SDE II",
  "SDE III",
  "backend engineer",
  "backend software engineer",
  "frontend engineer",
  "frontend software engineer",
  "full stack engineer",
  "full stack software engineer",
  "software developer",
  "application engineer",
  "application developer",
  "systems engineer",
  "systems software engineer",
  "infrastructure engineer",
  "distributed systems engineer",
  "new grad software engineer",
  "university software engineer",
  "associate software engineer",
  "junior software engineer",
  "entry level software engineer",
  "early career software engineer",
  "data engineer",
  "data engineer I",
  "data engineer II",
  "senior data engineer",
  "staff data engineer",
  "principal data engineer",
  "data pipeline engineer",
  "data platform engineer",
  "data infrastructure engineer",
  "analytics engineer",
  "big data engineer",
  "ETL engineer",
  "data warehouse engineer",
  "database engineer",
  "data developer",
  "associate data engineer",
  "junior data engineer",
  "new grad data engineer",
  "machine learning engineer",
  "ML engineer",
  "MLE",
  "senior machine learning engineer",
  "staff machine learning engineer",
  "principal machine learning engineer",
  "AI engineer",
  "artificial intelligence engineer",
  "deep learning engineer",
  "NLP engineer",
  "natural language processing engineer",
  "computer vision engineer",
  "MLOps engineer",
  "ML platform engineer",
  "ML infrastructure engineer",
  "research engineer",
  "applied scientist",
  "applied ML scientist",
  "research scientist",
  "data scientist",
  "senior data scientist",
  "staff data scientist",
  "principal data scientist",
  "associate data scientist",
  "junior data scientist",
  "new grad machine learning engineer",
  "university machine learning engineer",
  "AI researcher",
  "generative AI engineer",
  "LLM engineer",
  "foundation model engineer",
  "prompt engineer",
  "AI platform engineer",
  "AI infrastructure engineer",
  "site reliability engineer",
  "SRE",
  "senior SRE",
  "staff SRE",
  "devops engineer",
  "senior devops engineer",
  "staff devops engineer",
  "platform engineer",
  "senior platform engineer",
  "staff platform engineer",
  "cloud engineer",
  "cloud infrastructure engineer",
  "cloud platform engineer",
  "reliability engineer",
  "production engineer",
  "systems reliability engineer",
  "build engineer",
  "release engineer",
  "release reliability engineer",
  "infrastructure software engineer",
  "network engineer",
  "security engineer",
  "application security engineer",
  "associate SRE",
  "associate devops engineer",
  "new grad devops",
  "university SRE",
  "kubernetes engineer",
  "container platform engineer",
  "observability engineer",
  "",
];

export interface WorkdaySite {
  /** e.g. "walmart" — used as company display + ID prefix */
  company: string;
  /** e.g. "walmart.wd5.myworkdayjobs.com" */
  host: string;
  /** e.g. "walmart" */
  tenant: string;
  /** e.g. "WalmartExternal" */
  site: string;
  /** ID prefix used in the store. e.g. "WALMART" */
  idPrefix: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CxsSearchHit {
  title?: string;
  externalPath?: string; // "/job/Bentonville/Software-Engineer-II_R-2495265"
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
  // some tenants expose jobReqId here too
  jobReqId?: string;
}

interface CxsSearchResponse {
  total?: number;
  jobPostings?: CxsSearchHit[];
}

interface CxsJobDetail {
  jobPostingInfo?: {
    title?: string;
    jobReqId?: string;
    location?: string;
    startDate?: string; // ISO
    postedOn?: string; // "Posted Today"
    externalUrl?: string;
  };
}

const GET_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (compatible; JobTracker/1.0; +https://example.com/bot)",
};

const POST_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (compatible; JobTracker/1.0; +https://example.com/bot)",
};

/**
 * Fetch authoritative job detail from Workday CXS. Throws an Error with code
 * `workday_not_found_<status>` on any non-200 response.
 */
export async function fetchWorkdayJobDetail(
  host: string,
  tenant: string,
  site: string,
  externalPath: string
): Promise<{
  title: string;
  jobReqId: string;
  location: string;
  startDate: string;
  postedOn: string;
  externalUrl: string;
}> {
  // externalPath looks like "/job/Bentonville-AR/Software-Engineer-II_R-2495265".
  // The CXS detail endpoint is `/wday/cxs/<tenant>/<site>/job/<...>`, so when
  // the caller passes the full "/job/..." prefix we strip it to avoid a
  // duplicate /job segment.
  let cleaned = externalPath.startsWith("/") ? externalPath : `/${externalPath}`;
  if (cleaned.startsWith("/job/")) cleaned = cleaned.slice("/job".length); // keep leading slash
  const url = `https://${host}/wday/cxs/${tenant}/${site}/job${cleaned}`;
  const res = await fetch(url, { headers: GET_HEADERS });
  if (res.status !== 200) {
    throw new Error(`workday_not_found_${res.status}`);
  }
  const data = (await res.json()) as CxsJobDetail;
  const info = data.jobPostingInfo ?? {};
  return {
    title: info.title ?? "",
    jobReqId: info.jobReqId ?? "",
    location: info.location ?? "",
    startDate: info.startDate ?? "",
    postedOn: info.postedOn ?? "",
    externalUrl: info.externalUrl ?? "",
  };
}

/** Build the canonical apply URL in the required format:
 *   https://<host>/en-US/<site>/job/<loc>/<slug>_<id>
 */
export function buildWorkdayApplyUrl(
  host: string,
  site: string,
  externalPath: string
): string {
  let cleaned = externalPath.startsWith("/") ? externalPath : `/${externalPath}`;
  if (!cleaned.startsWith("/job/")) cleaned = `/job${cleaned}`;
  return `https://${host}/en-US/${site}${cleaned}`;
}

/**
 * Run a single CXS POST search call, returning the hits.
 */
async function cxsSearch(
  host: string,
  tenant: string,
  site: string,
  searchText: string,
  offset: number
): Promise<CxsSearchResponse> {
  const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  const body = {
    appliedFacets: {},
    limit: 20,
    offset,
    searchText,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: POST_HEADERS,
    body: JSON.stringify(body),
  });
  if (res.status !== 200) {
    throw new Error(`workday_search_${res.status}`);
  }
  return (await res.json()) as CxsSearchResponse;
}

export interface CrawlOptions {
  /** Override search terms (used by tests to stay light). */
  searchTerms?: string[];
  /** Cap pagination — handy in tests/dev. Default 2000. */
  maxOffset?: number;
  /** Override sleep between paginated calls. Default 1500ms. */
  sleepMs?: number;
  /** AbortSignal to cancel a long crawl. */
  signal?: AbortSignal;
  /** Logger override. Default console.log. */
  log?: (msg: string) => void;
}

export interface CrawlResult {
  jobs: Job[];
  errors: string[];
  pagesFetched: number;
  detailsFetched: number;
  uniquePaths: number;
}

/**
 * Crawl one Workday tenant fully. Caller is responsible for upserting the
 * returned jobs into the store and updating health.
 */
export async function crawlWorkdaySite(
  cfg: WorkdaySite,
  opts: CrawlOptions = {}
): Promise<CrawlResult> {
  const log = opts.log ?? console.log;
  const terms = opts.searchTerms ?? SEARCH_TERMS;
  const maxOffset = opts.maxOffset ?? 2000;
  const sleepMs = opts.sleepMs ?? 1500;

  const seen = new Set<string>(); // dedupe on externalPath
  const errors: string[] = [];
  let pagesFetched = 0;

  for (const term of terms) {
    if (opts.signal?.aborted) break;
    let offset = 0;
    while (offset < maxOffset) {
      if (opts.signal?.aborted) break;
      let resp: CxsSearchResponse;
      try {
        resp = await cxsSearch(cfg.host, cfg.tenant, cfg.site, term, offset);
        pagesFetched++;
      } catch (e) {
        errors.push(`search "${term}" offset=${offset}: ${(e as Error).message}`);
        break;
      }
      const hits = resp.jobPostings ?? [];
      if (!hits.length) break;
      for (const h of hits) {
        if (h.externalPath) seen.add(h.externalPath);
      }
      const total = resp.total ?? 0;
      if (total && offset + 20 >= total) break;
      offset += 20;
      await sleep(sleepMs);
    }
  }

  // Sitemap cross-check.
  try {
    const sitemap = await fetchSitemapPaths(cfg);
    for (const p of sitemap) seen.add(p);
  } catch (e) {
    errors.push(`sitemap: ${(e as Error).message}`);
  }

  log(
    `[workday:${cfg.company}] discovered ${seen.size} unique paths after ` +
      `${pagesFetched} search pages`
  );

  // Hydrate every unique path. We always go through fetchWorkdayJobDetail so
  // the startDate is authoritative and we never trust the search snippet.
  const jobs: Job[] = [];
  let detailsFetched = 0;
  for (const externalPath of seen) {
    if (opts.signal?.aborted) break;
    try {
      const detail = await fetchWorkdayJobDetail(
        cfg.host,
        cfg.tenant,
        cfg.site,
        externalPath
      );
      detailsFetched++;
      if (!detail.title || !detail.startDate || !detail.jobReqId) continue;
      // US-only
      if (!isUsLocation(detail.location)) continue;
      // Within 5 days of original ATS posted date
      if (!isFresh(detail.startDate)) continue;
      const applyUrl = buildWorkdayApplyUrl(cfg.host, cfg.site, externalPath);
      jobs.push({
        id: `${cfg.idPrefix}-${detail.jobReqId}`,
        company: cfg.company,
        title: detail.title,
        location: detail.location,
        jobReqId: detail.jobReqId,
        startDate: detail.startDate,
        postedOn: detail.postedOn || undefined,
        applyUrl,
        source: "workday",
        level: classifyLevel(detail.title),
        observedAt: new Date().toISOString(),
      });
    } catch (e) {
      const msg = (e as Error).message;
      // 404s are routine — postings come and go. Log but don't blow up.
      if (!/not_found_404/.test(msg)) errors.push(`detail ${externalPath}: ${msg}`);
    }
  }

  return {
    jobs,
    errors,
    pagesFetched,
    detailsFetched,
    uniquePaths: seen.size,
  };
}

/**
 * Pull job paths out of the public siteMap.xml. We use a very small regex
 * parse; we don't need full XML semantics.
 */
export async function fetchSitemapPaths(cfg: WorkdaySite): Promise<string[]> {
  const url = `https://${cfg.host}/en-US/${cfg.site}/siteMap.xml`;
  const res = await fetch(url, { headers: { ...GET_HEADERS, Accept: "application/xml" } });
  if (res.status !== 200) throw new Error(`sitemap_${res.status}`);
  const text = await res.text();
  const out: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  const sitePrefix = `/en-US/${cfg.site}`;
  while ((m = re.exec(text))) {
    const u = m[1];
    if (!u.includes(`${cfg.host}${sitePrefix}/job/`)) continue;
    const idx = u.indexOf(sitePrefix);
    if (idx < 0) continue;
    const after = u.slice(idx + sitePrefix.length); // "/job/<loc>/<slug>_<id>"
    if (after.startsWith("/job/")) out.push(after);
  }
  return Array.from(new Set(out));
}

/**
 * Slug-only fallback: for a /job/<loc>/<slug>_<id> path, pull out the title
 * slug and the requisition id. Used by /api/report-missing as a last-resort
 * parse if the user gave us a URL but we still want a canonical id when
 * Workday is unreachable. We only return the parts; we never persist a job
 * from this alone.
 */
export function parseWorkdaySlug(externalPath: string): {
  titleSlug: string;
  jobReqId: string;
} | null {
  const tail = externalPath.split("/").filter(Boolean).pop() ?? "";
  const m = /^(?<titleSlug>.+?)_(?<jobReqId>J?R-\d[\w-]*)$/.exec(tail);
  if (!m || !m.groups) return null;
  return { titleSlug: m.groups.titleSlug, jobReqId: m.groups.jobReqId };
}

/**
 * Parse a public Workday URL into its CXS coordinates.
 * Accepts shapes like:
 *   https://walmart.wd5.myworkdayjobs.com/en-US/WalmartExternal/job/Bentonville/Software-Engineer-II_R-2495265
 */
export function parseWorkdayUrl(input: string): {
  host: string;
  tenant: string;
  site: string;
  externalPath: string;
} | null {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  const host = u.host;
  if (!/\.myworkdayjobs\.com$/i.test(host)) return null;
  const m = /^([^.]+)\.wd\d+\.myworkdayjobs\.com$/i.exec(host);
  if (!m) return null;
  const tenant = m[1];
  const parts = u.pathname.split("/").filter(Boolean);
  // parts: ["en-US", "<site>", "job", "<loc>", "<slug>_<id>"]
  const enIdx = parts.findIndex((p) => /^en-US$/i.test(p));
  if (enIdx < 0 || parts.length < enIdx + 4) return null;
  const site = parts[enIdx + 1];
  const externalPath = "/" + parts.slice(enIdx + 2).join("/");
  if (!externalPath.startsWith("/job/")) return null;
  return { host, tenant, site, externalPath };
}
