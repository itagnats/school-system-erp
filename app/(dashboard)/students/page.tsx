import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { StudentsScreen } from "@/features/students/components/students-screen";
import { programOptions } from "@/server/services";

export const metadata: Metadata = { title: "Students" };

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
        title="Students"
        description="Student profiles across every program."
      />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <StudentsScreen programOptions={programOptions()} />
      </Suspense>
    </>
  );
}
