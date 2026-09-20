import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { EnrollmentTermsScreen } from "@/features/enrollment/components/enrollment-terms-screen";
import { courseSemesterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Enrollment" };

/**
 * Enrollment starts at the program term (direction.md §7a, decided
 * 2026-09-16).
 *
 * A student joins a program and the course enrollments follow, so the list
 * that opens first is the list of terms. Choosing one leads to its students,
 * which is where a student is added. The previous version of this page opened
 * on every course enrollment in the dataset — a fine index and a poor place to
 * begin.
 *
 * The screen reads its state from the URL through `useSearchParams`, which a
 * statically prerendered page cannot resolve at build time. The Suspense
 * boundary lets the shell prerender while the table waits for the real search
 * params, and the fallback doubles as the loading state.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="Enrollment"
        description="Choose a program term to see who is under it. A student joins the program, and the course enrollments follow from its curriculum."
      />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <EnrollmentTermsScreen semesterOptions={courseSemesterOptions()} />
      </Suspense>
    </>
  );
}
