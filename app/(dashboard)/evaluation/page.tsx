import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Evaluations" };

export default function Page() {
  return (
    <>
      <PageHeader title="Evaluations" description="360 degree evaluations across peer, inspector, teacher and TA roles." />
      <ScaffoldPlaceholder
        module="Evaluation"
        summary="Evaluation forms, draft and submit states, and score calculation."
        spec="direction.md §14-20"
      />
    </>
  );
}
