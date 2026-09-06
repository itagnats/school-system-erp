import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { EnrollmentScreen } from "@/features/enrollment/components/enrollment-screen";
import {
  courseFilterOptions,
  courseSemesterOptions,
  programFilterOptions,
} from "@/server/services";

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
        description="Enter from a programme to see who is under it, or narrow to a single course, semester or evaluation group."
      />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <EnrollmentScreen
          courseOptions={courseFilterOptions()}
          programOptions={programFilterOptions()}
          semesterOptions={courseSemesterOptions()}
        />
      </Suspense>
    </>
  );
}
