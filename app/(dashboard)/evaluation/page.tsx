import { Suspense } from "react";
import type { Metadata } from "next";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { YourEvaluationScreen } from "@/features/evaluation/components/your-evaluation-screen";
import { requirePrincipal } from "@/server/principal";

export const metadata: Metadata = { title: "Your Evaluation" };

/**
 * The evaluator's own queue (direction.md 14).
 *
 * Behind Suspense because the screen reads `?as=` for its persona; without the
 * boundary the whole route opts out of static rendering and the build says so.
 *
 * The signed-in account's own persona is passed in as the default, so somebody
 * who signed in as the student lands on the student's queue (direction.md 3a).
 * An administrator has no persona and still gets the switcher, which is right:
 * they are reading somebody else's queue and the screen should say so.
 */
export default async function Page() {
  const principal = await requirePrincipal();

  return (
    <>
      <PageHeader
        title="Your Evaluation"
        description="What you have been asked to assess, and how far through it you are."
      />
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <YourEvaluationScreen signedInPersonaId={principal.personaId} />
      </Suspense>
    </>
  );
}
