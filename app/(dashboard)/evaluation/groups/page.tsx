import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Evaluation Groups" };

export default function Page() {
  return (
    <>
      <PageHeader title="Evaluation Groups" description="Student groups within a course and semester, the context for peer evaluation." />
      <ScaffoldPlaceholder
        module="Evaluation Groups"
        summary="Group membership and evaluator assignment."
        spec="direction.md §15-16"
      />
    </>
  );
}
