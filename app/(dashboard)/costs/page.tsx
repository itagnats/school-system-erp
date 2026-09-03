import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Cost Sheets" };

export default function Page() {
  return (
    <>
      <PageHeader title="Cost Sheets" description="Cost structure for delivering a course in a semester." />
      <ScaffoldPlaceholder
        module="Cost Management"
        summary="Cost sheet hierarchy, allocation and cost per student."
        spec="direction.md §11-13"
      />
    </>
  );
}
