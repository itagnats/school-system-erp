import { Suspense } from "react";
import type { Metadata } from "next";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { YourEvaluationScreen } from "@/features/evaluation/components/your-evaluation-screen";

export const metadata: Metadata = { title: "Your Evaluation" };

/**
 * The evaluator's own queue (direction.md 14).
 *
 * Behind Suspense because the screen reads `?as=` for its persona; without the
 * boundary the whole route opts out of static rendering and the build says so.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="Your Evaluation"
        description="What you have been asked to assess, and how far through it you are."
      />
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <YourEvaluationScreen />
      </Suspense>
    </>
  );
}
