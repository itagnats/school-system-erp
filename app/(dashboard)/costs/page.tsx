import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { CostSheetsScreen } from "@/features/costs/components/cost-sheets-screen";
import { courseFilterOptions, courseSemesterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Cost management" };

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
        title="Cost management"
        description="One cost sheet per course offering. Direct plus shared makes the total; the total divided by head count makes the per-student figure."
      />
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <CostSheetsScreen
          courseOptions={courseFilterOptions()}
          semesterOptions={courseSemesterOptions()}
        />
      </Suspense>
    </>
  );
}
