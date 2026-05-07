import { NextResponse } from "next/server";
import { getJobsByCompany } from "@/lib/store";
import { findCompany } from "@/lib/sources/walmart";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const cfg = findCompany(params.slug);
  if (!cfg) {
    return NextResponse.json({ error: "company_not_supported" }, { status: 404 });
  }
  const jobs = getJobsByCompany(cfg.company);
  return NextResponse.json({
    company: cfg.company,
    host: cfg.host,
    site: cfg.site,
    tenant: cfg.tenant,
    jobs,
    count: jobs.length,
  });
}
