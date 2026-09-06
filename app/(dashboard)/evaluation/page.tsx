import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Your Evaluation" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Your Evaluation"
        description="The evaluations assigned to you, and the ones you have already submitted."
      />
      <ScaffoldPlaceholder
        module="Your Evaluation"
        summary="One queue per evaluator: outstanding criteria forms, outstanding peer orderings, and submitted work shown read-only. Who you are comes from the demo persona switcher, since there is no sign-in."
        spec="direction.md §16-20"
      />
    </>
  );
}
