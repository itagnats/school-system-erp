import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Student Reports" };

export default function Page() {
  return (
    <>
      <PageHeader title="Student Reports" description="Individual evaluation reports, suitable for printing." />
      <ScaffoldPlaceholder
        module="Reports"
        summary="Per-student report with role and criteria breakdown."
        spec="direction.md §23"
      />
    </>
  );
}
