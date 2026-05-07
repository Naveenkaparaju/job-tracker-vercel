import { notFound } from "next/navigation";
import JobTable from "@/components/JobTable";
import ReportMissingForm from "@/components/ReportMissingForm";
import { getJobsByCompany } from "@/lib/store";
import { findCompany, COMPANIES } from "@/lib/sources/walmart";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return COMPANIES.map((c) => ({ slug: c.company }));
}

export default function CompanyPage({ params }: { params: { slug: string } }) {
  const cfg = findCompany(params.slug);
  if (!cfg) return notFound();
  const jobs = getJobsByCompany(cfg.company);
  return (
    <>
      <h1 style={{ textTransform: "capitalize" }}>{cfg.company}</h1>
      <p className="lede">
        Pulled from <code>{cfg.host}</code> · tenant <code>{cfg.tenant}</code> ·
        site <code>{cfg.site}</code>. {jobs.length} live US jobs.
      </p>
      <ReportMissingForm defaultHostHint={cfg.host} />
      <JobTable jobs={jobs} />
    </>
  );
}
