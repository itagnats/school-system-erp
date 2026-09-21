import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { ProgramsScreen } from "@/features/programs/components/programs-screen";
import { semesterCodeOptions } from "@/server/services";

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
        description="The programs this school offers. A program gathers courses into a package per semester; open one to see its terms."
      />
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <ProgramsScreen semesterOptions={semesterCodeOptions()} />
      </Suspense>
    </>
  );
}
