import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { CoursesScreen } from "@/features/courses/components/courses-screen";
import { courseSemesterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Courses" };

/**
 * Server component. It reads the filter options straight from the service
 * rather than over HTTP, because a server component fetching its own route
 * handler is an extra hop for data it can already reach.
 *
 * The interactive part below it is a client screen and does go through /api.
 */
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
        title="Courses"
        description="Courses offered by the school, and the semesters each one runs in."
      />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <CoursesScreen semesterOptions={courseSemesterOptions()} />
      </Suspense>
    </>
  );
}
