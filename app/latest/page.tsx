import JobTable from "@/components/JobTable";
import { getAllJobs } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function LatestPage() {
  const jobs = getAllJobs();
  return (
    <>
      <h1>Latest</h1>
      <p className="lede">
        Every fresh job, newest first. Posted-date is the original ATS
        startDate.
      </p>
      <JobTable jobs={jobs} />
    </>
  );
}
