import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Student Profile" };

export default async function Page({ params }: PageProps<"/students/[studentId]">) {
  const { studentId } = await params;

  return (
    <>
      <PageHeader title="Student Profile" description={`Record: ${studentId}`} />
      <ScaffoldPlaceholder
        module="Students"
        summary="Personal, academic and experience sections with editing."
        spec="direction.md §9-10"
      />
    </>
  );
}
