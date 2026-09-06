import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { SemestersScreen } from "@/features/semesters/components/semesters-screen";
import { academicYearOptions } from "@/server/services";

export const metadata: Metadata = { title: "Semesters" };

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
        title="Semesters"
        description="Academic terms. A semester is the context for enrollment, grouping, evaluation and cost."
      />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <SemestersScreen yearOptions={academicYearOptions()} />
      </Suspense>
    </>
  );
}
