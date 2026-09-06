import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { EnrollmentScreen } from "@/features/enrollment/components/enrollment-screen";
import { courseFilterOptions, courseSemesterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Enrollment" };

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
        title="Enrollment"
        description="Which students are taking which course, in which semester, and in which evaluation group."
      />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <EnrollmentScreen
          courseOptions={courseFilterOptions()}
          semesterOptions={courseSemesterOptions()}
        />
      </Suspense>
    </>
  );
}
