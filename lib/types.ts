// Shared types for the job tracker.

export type JobLevel = "entry" | "senior" | "unknown";

export interface Job {
  /** Stable internal ID, e.g. WALMART-R-2495265 */
  id: string;
  /** Human-readable company slug like "walmart" */
  company: string;
  /** Display title from the ATS */
  title: string;
  /** Display location from the ATS */
  location: string;
  /** ATS job requisition ID like "R-2495265" */
  jobReqId: string;
  /** ISO date string of the ORIGINAL ATS posted date (authoritative) */
  startDate: string;
  /** Optional human-readable "Posted X days ago" from the ATS */
  postedOn?: string;
  /** Direct apply URL — must point at the canonical ATS posting */
  applyUrl: string;
  /** Source name like "workday" */
  source: string;
  /** Classification used by /entry-level filter */
  level: JobLevel;
  /** When the crawler last observed this row */
  observedAt: string;
}

export interface SourceHealth {
  company: string;
  status: "ok" | "partial" | "blocked" | "pending" | "empty_ok";
  jobCount: number;
  lastRun: string | null;
  errors: string[];
}

export interface RunDiff {
  added: string[];
  removed: string[];
  staleRemoved: string[];
}
