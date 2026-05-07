// Shared in-memory job store with optional persistence to disk.
// All read APIs (/latest, /entry-level, /companies/<slug>, /api/jobs,
// /api/companies/<slug>) consume this same store.
//
// To survive serverless cold starts in development we attach the store to
// globalThis so HMR and route reloads see the same data.

import fs from "node:fs";
import path from "node:path";
import type { Job, RunDiff, SourceHealth } from "./types";
import { isFresh } from "./dates";
import { isUsLocation } from "./locations";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "jobs.json");

interface StoreState {
  jobs: Map<string, Job>;
  health: Map<string, SourceHealth>;
  lastDiff: RunDiff | null;
  lastRunAt: string | null;
}

function freshState(): StoreState {
  return {
    jobs: new Map(),
    health: new Map(),
    lastDiff: null,
    lastRunAt: null,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __JOB_STORE__: StoreState | undefined;
}

function loadFromDisk(state: StoreState) {
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as {
      jobs: Job[];
      health: SourceHealth[];
      lastDiff: RunDiff | null;
      lastRunAt: string | null;
    };
    for (const j of parsed.jobs ?? []) state.jobs.set(j.id, j);
    for (const h of parsed.health ?? []) state.health.set(h.company, h);
    state.lastDiff = parsed.lastDiff ?? null;
    state.lastRunAt = parsed.lastRunAt ?? null;
  } catch (err) {
    console.warn("[store] failed to load jobs.json:", err);
  }
}

function saveToDisk(state: StoreState) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const payload = {
      jobs: Array.from(state.jobs.values()),
      health: Array.from(state.health.values()),
      lastDiff: state.lastDiff,
      lastRunAt: state.lastRunAt,
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("[store] failed to save jobs.json:", err);
  }
}

function getState(): StoreState {
  if (!globalThis.__JOB_STORE__) {
    const s = freshState();
    loadFromDisk(s);
    globalThis.__JOB_STORE__ = s;
  }
  return globalThis.__JOB_STORE__;
}

/** Validate a job before letting it into the store. Returns null if rejected. */
export function validateJob(job: Job): Job | null {
  if (!job.id || !job.title || !job.applyUrl || !job.startDate) return null;
  if (!isUsLocation(job.location)) return null;
  if (!isFresh(job.startDate)) return null;
  return job;
}

export interface UpsertResult {
  added: string[];
  removed: string[];
  staleRemoved: string[];
}

/**
 * Replace all jobs for a given company with a freshly crawled set.
 * Stale (no longer in the new set, or now > 5 days old, or no longer US-only)
 * rows are dropped. Returns a per-company diff that the caller can fold into
 * a global RunDiff.
 */
export function upsertCompanyJobs(
  company: string,
  jobs: Job[]
): UpsertResult {
  const state = getState();
  const previousIds = new Set(
    Array.from(state.jobs.values())
      .filter((j) => j.company === company)
      .map((j) => j.id)
  );

  const validatedNewIds = new Set<string>();
  const added: string[] = [];

  for (const j of jobs) {
    const v = validateJob(j);
    if (!v) continue;
    validatedNewIds.add(v.id);
    if (!state.jobs.has(v.id)) added.push(v.id);
    state.jobs.set(v.id, v);
  }

  const removed: string[] = [];
  const staleRemoved: string[] = [];
  for (const id of previousIds) {
    if (validatedNewIds.has(id)) continue;
    const existing = state.jobs.get(id);
    state.jobs.delete(id);
    if (existing && !isFresh(existing.startDate)) staleRemoved.push(id);
    else removed.push(id);
  }

  // Also sweep all rows globally to drop any that have aged out.
  for (const [id, j] of state.jobs) {
    if (!isFresh(j.startDate) || !isUsLocation(j.location)) {
      state.jobs.delete(id);
      staleRemoved.push(id);
    }
  }

  return { added, removed, staleRemoved };
}

/** Insert a single job (used by Report Missing Job). */
export function insertJob(job: Job): Job | null {
  const state = getState();
  const v = validateJob(job);
  if (!v) return null;
  state.jobs.set(v.id, v);
  saveToDisk(state);
  return v;
}

export function setHealth(h: SourceHealth) {
  const state = getState();
  state.health.set(h.company, h);
}

export function setLastDiff(diff: RunDiff) {
  const state = getState();
  state.lastDiff = diff;
  state.lastRunAt = new Date().toISOString();
  saveToDisk(state);
}

export function getAllJobs(): Job[] {
  const state = getState();
  // Defensive sweep on read in case disk-loaded rows are now stale.
  for (const [id, j] of state.jobs) {
    if (!isFresh(j.startDate) || !isUsLocation(j.location)) {
      state.jobs.delete(id);
    }
  }
  return Array.from(state.jobs.values()).sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  );
}

export function getJobsByCompany(company: string): Job[] {
  return getAllJobs().filter(
    (j) => j.company.toLowerCase() === company.toLowerCase()
  );
}

export function getHealth(): SourceHealth[] {
  const state = getState();
  return Array.from(state.health.values());
}

export function getLastDiff(): RunDiff | null {
  return getState().lastDiff;
}

export function getLastRunAt(): string | null {
  return getState().lastRunAt;
}

export function persist() {
  saveToDisk(getState());
}
