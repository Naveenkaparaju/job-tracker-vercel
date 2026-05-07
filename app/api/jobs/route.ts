import { NextResponse } from "next/server";
import { getAllJobs } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const jobs = getAllJobs();
  return NextResponse.json({ jobs, count: jobs.length });
}
