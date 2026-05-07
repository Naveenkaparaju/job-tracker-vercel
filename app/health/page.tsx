"use client";

import { useEffect, useState } from "react";
import type { RunDiff, SourceHealth } from "@/lib/types";

interface HealthResponse {
  sources: SourceHealth[];
  totalJobs: number;
  lastRunAt: string | null;
  lastDiff: RunDiff | null;
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/health", { cache: "no-store" });
    setData(await r.json());
  }

  async function runNow() {
    setRunning(true);
    setMsg("Crawl started — Workday pagination can take several minutes.");
    try {
      const r = await fetch("/api/run-now", { method: "POST" });
      const j = await r.json();
      setMsg(
        `Crawl complete: added ${j.diff?.added?.length ?? 0}, removed ${
          j.diff?.removed?.length ?? 0
        }, staleRemoved ${j.diff?.staleRemoved?.length ?? 0}.`
      );
      await load();
    } catch (e) {
      setMsg("Crawl failed: " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <h1>Health</h1>
      <p className="lede">
        Per-source crawler status. The cron at <code>*/10 * * * *</code> calls{" "}
        <code>/api/run-now</code> in production.
      </p>
      <div className="toolbar">
        <button
          className="btn btn--primary"
          onClick={runNow}
          disabled={running}
          data-testid="button-run-now"
        >
          {running ? "Running…" : "Run crawl now"}
        </button>
        <button className="btn" onClick={load} data-testid="button-refresh">
          Refresh
        </button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      {!data ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <div className="health-grid">
            <div className="health-card">
              <div className="health-card__company">Total jobs</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {data.totalJobs}
              </div>
            </div>
            <div className="health-card">
              <div className="health-card__company">Last run</div>
              <div className="muted">
                {data.lastRunAt ?? "never"}
              </div>
            </div>
            <div className="health-card">
              <div className="health-card__company">Last diff</div>
              <div className="muted">
                added {data.lastDiff?.added.length ?? 0} · removed{" "}
                {data.lastDiff?.removed.length ?? 0} · stale{" "}
                {data.lastDiff?.staleRemoved.length ?? 0}
              </div>
            </div>
          </div>
          <h2>Sources</h2>
          <table className="job-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Status</th>
                <th>Jobs</th>
                <th>Last run</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.company} data-testid={`row-health-${s.company}`}>
                  <td style={{ textTransform: "capitalize" }}>{s.company}</td>
                  <td>
                    <span className={`status-pill status-pill--${s.status}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>{s.jobCount}</td>
                  <td className="muted">{s.lastRun ?? "—"}</td>
                  <td className="muted">
                    {s.errors.length ? s.errors.slice(0, 3).join("; ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
