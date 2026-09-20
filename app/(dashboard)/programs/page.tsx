import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { ProgramsScreen } from "@/features/programs/components/programs-screen";
import { courseSemesterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Curriculum" };

/**
 * The list screen reads its state from the URL through `useSearchParams`, which
 * a statically prerendered page cannot resolve at build time. The Suspense
 * boundary lets the shell prerender while the table waits for the real search
 * params, and the fallback doubles as the loading state.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="Curriculum"
        description="One row per program term: the courses it includes, what the package sells for, and whether it made money."
      />
      <Suspense fallback={<TableSkeleton columns={10} />}>
        <ProgramsScreen semesterOptions={courseSemesterOptions()} />
      </Suspense>
    </>
  );
}
