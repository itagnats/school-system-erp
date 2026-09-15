import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { ProgramCostsScreen } from "@/features/costs/components/program-costs-screen";
import { courseSemesterOptions, programFilterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Programme costs" };

/**
 * The list screen reads its state from the URL through `useSearchParams`, which
 * a statically prerendered page cannot resolve at build time. The Suspense
 * boundary is what lets the shell prerender while the table waits for the real
 * search params on the client - and the fallback doubles as the loading state.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="Programme costs"
        description="One cost sheet per programme term. Indirect costs are borne once and shared across the curriculum by credit hours; each course adds its own direct costs on top."
      />
      <Suspense fallback={<TableSkeleton columns={8} />}>
        <ProgramCostsScreen
          programOptions={programFilterOptions()}
          semesterOptions={courseSemesterOptions()}
        />
      </Suspense>
    </>
  );
}
