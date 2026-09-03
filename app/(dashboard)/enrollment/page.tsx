import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Enrollment" };

export default function Page() {
  return (
    <>
      <PageHeader title="Enrollment" description="Students enrolled in a course for a given semester." />
      <ScaffoldPlaceholder
        module="Enrollment"
        summary="Student list plus the three add-student paths."
        spec="direction.md §6-8"
      />
    </>
  );
}
