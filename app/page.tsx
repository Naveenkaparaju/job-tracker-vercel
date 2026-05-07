import Link from "next/link";
import { getAllJobs } from "@/lib/store";
import { COMPANIES } from "@/lib/sources/walmart";

export const dynamic = "force-dynamic";

export default function Home() {
  const jobs = getAllJobs();
  const entry = jobs.filter((j) => j.level === "entry").length;
  return (
    <>
      <h1>All-in-one job tracker</h1>
      <p className="lede">
        US jobs only. Listings come straight from official ATS feeds. Listings
        live for 5 days from the original ATS posted date. Direct apply links
        only — no middlemen.
      </p>
      <div className="health-grid">
        <div className="health-card">
          <div className="health-card__company">Total jobs</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{jobs.length}</div>
        </div>
        <div className="health-card">
          <div className="health-card__company">Entry-level</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{entry}</div>
        </div>
        <div className="health-card">
          <div className="health-card__company">Sources</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{COMPANIES.length}</div>
        </div>
      </div>
      <h2>Browse</h2>
      <ul>
        <li>
          <Link href="/latest">/latest</Link> — every fresh job, newest first
        </li>
        <li>
          <Link href="/entry-level">/entry-level</Link> — Software Engineer II,
          Associate, Junior, New Grad, etc.
        </li>
        {COMPANIES.map((c) => (
          <li key={c.company}>
            <Link href={`/companies/${c.company}`}>/companies/{c.company}</Link>
          </li>
        ))}
        <li>
          <Link href="/health">/health</Link> — crawler status & last run diff
        </li>
      </ul>
    </>
  );
}
