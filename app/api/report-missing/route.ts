import { NextRequest, NextResponse } from "next/server";
import {
  buildWorkdayApplyUrl,
  fetchWorkdayJobDetail,
  parseWorkdayUrl,
  parseWorkdaySlug,
} from "@/lib/sources/workday";
import { COMPANIES } from "@/lib/sources/walmart";
import { classifyLevel } from "@/lib/classify";
import { isFresh } from "@/lib/dates";
import { isUsLocation } from "@/lib/locations";
import { insertJob } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  url?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const url = (body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  const parsed = parseWorkdayUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "unsupported_url", message: "Only *.myworkdayjobs.com URLs are supported." },
      { status: 400 }
    );
  }

  const knownCompany = COMPANIES.find(
    (c) => c.host === parsed.host && c.site === parsed.site
  );
  const idPrefix = knownCompany?.idPrefix ?? parsed.tenant.toUpperCase();
  const company = knownCompany?.company ?? parsed.tenant.toLowerCase();

  let detail;
  try {
    detail = await fetchWorkdayJobDetail(
      parsed.host,
      parsed.tenant,
      parsed.site,
      parsed.externalPath
    );
  } catch (e) {
    const msg = (e as Error).message;
    // Reject only on a true 404; bubble up other failures so the user can retry.
    // Workday returns 404 for an unknown path on some tenants and 406 on
    // others. Treat both as authoritative "not found".
    if (/not_found_(404|406)$/.test(msg)) {
      return NextResponse.json(
        { error: "workday_not_found", message: "Workday CXS returned not-found for this posting." },
        { status: 404 }
      );
    }
    // Slug-only fallback never fabricates dates — we just echo the parsed
    // identity so the caller knows we recognized the URL.
    const slug = parseWorkdaySlug(parsed.externalPath);
    return NextResponse.json(
      {
        error: "workday_unreachable",
        message: msg,
        parsed: { ...parsed, slug },
      },
      { status: 502 }
    );
  }

  if (!detail.startDate || !detail.title || !detail.jobReqId) {
    return NextResponse.json(
      { error: "workday_missing_fields", detail },
      { status: 502 }
    );
  }

  if (!isUsLocation(detail.location)) {
    return NextResponse.json(
      { error: "rejected_non_us", detail },
      { status: 400 }
    );
  }
  if (!isFresh(detail.startDate)) {
    return NextResponse.json(
      { error: "rejected_stale", detail },
      { status: 400 }
    );
  }

  const applyUrl = buildWorkdayApplyUrl(
    parsed.host,
    parsed.site,
    parsed.externalPath
  );

  const job = insertJob({
    id: `${idPrefix}-${detail.jobReqId}`,
    company,
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

  if (!job) {
    return NextResponse.json({ error: "rejected_validation" }, { status: 400 });
  }
  return NextResponse.json({ job });
}
