import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Student Report" };

export default async function Page({ params }: PageProps<"/reports/students/[studentId]">) {
  const { studentId } = await params;

  return (
    <>
      <PageHeader title="Student Report" description={`Record: ${studentId}`} />
      <ScaffoldPlaceholder
        module="Reports"
        summary="Score, grade, rank, role and criteria breakdown, and feedback."
        spec="direction.md §23"
      />
    </>
  );
}
