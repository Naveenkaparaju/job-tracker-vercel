"use client";

import { useState } from "react";

export default function ReportMissingForm({
  defaultHostHint,
}: {
  defaultHostHint?: string;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setOk(null);
    try {
      const r = await fetch("/api/report-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();
      if (r.ok && j.job) {
        setOk(true);
        setMsg(`Added ${j.job.id} — ${j.job.title}`);
        setUrl("");
      } else {
        setOk(false);
        setMsg(j.error ? `${j.error}${j.message ? ": " + j.message : ""}` : "Failed");
      }
    } catch (e) {
      setOk(false);
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="report-form" onSubmit={submit}>
      <div>
        <label htmlFor="report-url">Report missing job</label>
      </div>
      <div className="row">
        <input
          id="report-url"
          className="input"
          type="url"
          required
          placeholder={
            defaultHostHint
              ? `https://${defaultHostHint}/en-US/.../job/...`
              : "https://<tenant>.wd5.myworkdayjobs.com/en-US/<site>/job/<loc>/<slug>_<id>"
          }
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="input-report-url"
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={busy}
          data-testid="button-report-submit"
        >
          {busy ? "Checking…" : "Submit"}
        </button>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        Paste a direct *.myworkdayjobs.com URL. We&apos;ll fetch the posting
        from Workday CXS — no HTML parsing — and add it if it&apos;s a US job
        within 5 days of the original posted date.
      </div>
      {msg && (
        <div
          className={`report-form__msg ${
            ok ? "report-form__msg--ok" : "report-form__msg--err"
          }`}
          data-testid="text-report-msg"
        >
          {msg}
        </div>
      )}
    </form>
  );
}
