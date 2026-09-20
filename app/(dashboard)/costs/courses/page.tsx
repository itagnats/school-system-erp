import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { CostSheetsScreen } from "@/features/costs/components/cost-sheets-screen";
import { courseFilterOptions, courseSemesterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Course costs" };

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
        title="Course costs"
        description="Direct costs, one sheet per course offering. Each course adds a share of its program's indirect pool on top - seven of these belong to no program and bear no share."
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
