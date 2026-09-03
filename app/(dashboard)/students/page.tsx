import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Student Profiles" };

export default function Page() {
  return (
    <>
      <PageHeader title="Student Profiles" description="Student records, academic information and experience." />
      <ScaffoldPlaceholder
        module="Students"
        summary="Profile list, detail and sectioned profile editing."
        spec="direction.md §9-10"
      />
    </>
  );
}
