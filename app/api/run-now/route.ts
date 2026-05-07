import { NextRequest, NextResponse } from "next/server";
import { runCrawl } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  // Allow narrowing for ad-hoc dev calls without rewriting query parsing.
  const url = new URL(req.url);
  const sleepMs = Number(url.searchParams.get("sleepMs")) || undefined;
  const maxOffset = Number(url.searchParams.get("maxOffset")) || undefined;
  const limitTerms = Number(url.searchParams.get("limitTerms")) || undefined;

  const opts: Parameters<typeof runCrawl>[0] = {};
  if (sleepMs !== undefined && !Number.isNaN(sleepMs)) opts.sleepMs = sleepMs;
  if (maxOffset !== undefined && !Number.isNaN(maxOffset)) opts.maxOffset = maxOffset;
  if (limitTerms !== undefined && !Number.isNaN(limitTerms)) {
    const { SEARCH_TERMS } = await import("@/lib/sources/workday");
    opts.searchTerms = SEARCH_TERMS.slice(0, limitTerms);
  }

  const summary = await runCrawl(opts);
  return NextResponse.json(summary);
}
