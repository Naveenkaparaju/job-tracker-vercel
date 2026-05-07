import type { Job } from "@/lib/types";
import { dateHeader } from "@/lib/dates";

export function groupByDate(jobs: Job[]): { header: string; jobs: Job[] }[] {
  const groups = new Map<string, Job[]>();
  for (const j of jobs) {
    const h = dateHeader(j.startDate);
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h)!.push(j);
  }
  return Array.from(groups.entries()).map(([header, jobs]) => ({ header, jobs }));
}

export default function JobTable({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) {
    return (
      <div className="empty">
        No jobs in the store yet. Trigger a crawl from the Health page or POST{" "}
        <code>/api/run-now</code>.
      </div>
    );
  }
  const groups = groupByDate(jobs);
  return (
    <>
      {groups.map((g) => (
        <section key={g.header}>
          <div className="date-header" data-testid={`date-header-${g.header}`}>
            {g.header}
          </div>
          <table className="job-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Level</th>
                <th>Apply</th>
              </tr>
            </thead>
            <tbody>
              {g.jobs.map((j) => (
                <tr key={j.id} data-testid={`row-job-${j.id}`}>
                  <td>
                    <div className="job-title">{j.title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {j.id}
                    </div>
                  </td>
                  <td className="muted" style={{ textTransform: "capitalize" }}>
                    {j.company}
                  </td>
                  <td>{j.location}</td>
                  <td>
                    <span
                      className={`tag tag--${j.level === "entry" ? "entry" : "senior"}`}
                    >
                      {j.level}
                    </span>
                  </td>
                  <td>
                    <a
                      href={j.applyUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      data-testid={`link-apply-${j.id}`}
                    >
                      Apply →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
