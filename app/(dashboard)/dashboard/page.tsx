import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard" description="Active courses, the current semester, enrollment and evaluation progress at a glance." />
      <ScaffoldPlaceholder
        module="Dashboard"
        summary="Concise overview metrics and current-semester progress."
        spec="direction.md §24"
      />
    </>
  );
}
