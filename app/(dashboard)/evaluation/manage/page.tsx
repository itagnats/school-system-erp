import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants";
import { ManageEvaluationScreen } from "@/features/evaluation/components/manage-evaluation-screen";
import { courseSemesterOptions, evaluationCourseOptions } from "@/server/services";

export const metadata: Metadata = { title: "Manage Evaluation" };

/**
 * The administrative half of evaluation (direction.md §14).
 *
 * Filter options are read on the server and passed down, so the screen does not
 * open with an empty course filter and fill it in a moment later.
 *
 * The screen itself is behind Suspense because it reads `useSearchParams` for
 * its list state; without the boundary the whole route opts out of static
 * rendering and the build says so.
 */
export default async function Page() {
  const courseOptions = evaluationCourseOptions();

  return (
    <>
      <PageHeader
        title="Manage Evaluation"
        description="Set up an evaluation for a course and semester: its window, its groups, and how the four evaluator roles combine into a score."
        // The bank is master data across every setup, so it hangs off the list
        // rather than off one row.
        actions={
          <Button variant="outline" asChild>
            <Link href={routes.questionBank()}>
              <ListChecks aria-hidden className="size-4" />
              Question bank
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <ManageEvaluationScreen
          semesterOptions={courseSemesterOptions()}
          courseOptions={courseOptions}
        />
      </Suspense>
    </>
  );
}
