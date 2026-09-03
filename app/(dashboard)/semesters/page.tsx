import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Semesters" };

export default function Page() {
  return (
    <>
      <PageHeader title="Semesters" description="Academic periods that provide the context for enrollment, evaluation and cost." />
      <ScaffoldPlaceholder
        module="Semesters"
        summary="Semester list with academic year, term and status."
        spec="direction.md §5"
      />
    </>
  );
}
