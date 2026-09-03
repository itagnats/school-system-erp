import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Courses" };

export default function Page() {
  return (
    <>
      <PageHeader title="Courses" description="Courses offered by the school, and the semesters each one runs in." />
      <ScaffoldPlaceholder
        module="Courses"
        summary="Course list with search, filtering and status."
        spec="direction.md §4"
      />
    </>
  );
}
