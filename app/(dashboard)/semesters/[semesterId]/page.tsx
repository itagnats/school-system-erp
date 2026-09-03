import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Semester Detail" };

export default async function Page({ params }: PageProps<"/semesters/[semesterId]">) {
  const { semesterId } = await params;

  return (
    <>
      <PageHeader title="Semester Detail" description={`Record: ${semesterId}`} />
      <ScaffoldPlaceholder
        module="Semesters"
        summary="Semester dates, status and the courses it carries."
        spec="direction.md §5"
      />
    </>
  );
}
