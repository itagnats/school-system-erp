import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Course Detail" };

export default async function Page({ params }: PageProps<"/courses/[courseId]">) {
  const { courseId } = await params;

  return (
    <>
      <PageHeader title="Course Detail" description={`Record: ${courseId}`} />
      <ScaffoldPlaceholder
        module="Courses"
        summary="Course details and the semesters it is offered in."
        spec="direction.md §4"
      />
    </>
  );
}
