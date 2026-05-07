import JobTable from "@/components/JobTable";
import { getAllJobs } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function EntryLevelPage() {
  const jobs = getAllJobs().filter((j) => j.level === "entry");
  return (
    <>
      <h1>Entry-level</h1>
      <p className="lede">
        Includes Software Engineer I/II, Associate, Junior, New Grad, Early
        Career, University, Intern, Apprentice. Excludes Senior / Staff /
        Principal / Lead / Manager / Director / VP / Distinguished and III/IV/V.
      </p>
      <JobTable jobs={jobs} />
    </>
  );
}
