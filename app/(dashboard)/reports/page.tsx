import { Suspense } from "react";
import type { Metadata } from "next";
import { EmptyState, TableSkeleton } from "@/components/feedback";
import { PageHeader, Section } from "@/components/shared";
import { EvaluationResultsScreen } from "@/features/evaluation/components/evaluation-results-screen";
import { ReportSetupPicker } from "@/features/evaluation/components/report-setup-picker";
import { evaluationResults, reportableSetups } from "@/server/services";

export const metadata: Metadata = { title: "Student Reports" };

/**
 * Student reports (direction.md 23).
 *
 * Pick an evaluation, read the results, open a report. The table carries the
 * raw score, the calculated score, the grade and the pass status, so a report
 * is opened for the one subject a reader has a question about rather than
 * browsed through.
 *
 * The components come from `features/evaluation` rather than
 * `features/reports`, deliberately. A report is the evaluation's output and
 * speaks its vocabulary - criterion names, role labels, the assessee model - so
 * a reports feature would have to import all of that from evaluation. A page
 * importing a feature is downward and allowed; a feature importing another
 * feature's vocabulary is the coupling worth avoiding.
 */
export default async function Page({
  searchParams,
}: Readonly<{ searchParams: Promise<{ setup?: string }> }>) {
  const { setup } = await searchParams;
  const setups = reportableSetups();

  // Fall back to the first rather than 404: a pasted link may drop the
  // parameter, and the newest cohort is the right default.
  const activeId = setups.some((entry) => entry.id === setup)
    ? (setup as string)
    : setups[0]?.id;

  const results = activeId ? evaluationResults(activeId) : undefined;

  return (
    <>
      <PageHeader
        title="Student Reports"
        description="Individual evaluation reports, suitable for printing."
      />

      {setups.length === 0 || !results ? (
        <Section title="Nothing to report yet">
          <EmptyState
            variant="empty"
            title="No evaluation has results"
            description="A report needs an evaluation that has left draft, has an assessee configured and has its cohort grouped. Set one up under Manage Evaluation."
          />
        </Section>
      ) : (
        <div className="grid gap-4">
          <Section
            title="Choose an evaluation"
            description="Reports are scoped to one course and semester."
          >
            <Suspense fallback={null}>
              <ReportSetupPicker setups={setups} activeId={activeId} />
            </Suspense>
          </Section>

          <Suspense fallback={<TableSkeleton rows={8} />}>
            <EvaluationResultsScreen results={results} />
          </Suspense>
        </div>
      )}
    </>
  );
}
