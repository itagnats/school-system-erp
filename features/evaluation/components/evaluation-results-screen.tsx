"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { EvaluationResultRow, EvaluationResults } from "@/types";
import { ASSESSEE_ROLE_LABEL } from "../constants";
import { useStudentReport } from "../hooks/use-results";
import { ReportDocument } from "./report-document";
import { ReportSheetDialog } from "./report-sheet-dialog";
import { SubjectAvatar } from "./subject-avatar";

/**
 * The results of one evaluation, and the way into each report (§21-23).
 *
 * A row per subject per assessee role, so a setup that assesses students and
 * its teacher shows both in one table - the assessee model made visible at a
 * glance rather than only in the configuration.
 *
 * **Raw beside calculated.** The raw figure is the plain mean of every rating
 * received; the calculated one is the §20 weighted blend. Showing both makes
 * the weighting visible as a difference rather than asserted: where they
 * diverge, the blend is doing something and a reader can see what.
 */
export function EvaluationResultsScreen({
  results,
}: Readonly<{ results: EvaluationResults }>) {
  const [openSubject, setOpenSubject] = useState<string | undefined>();

  const scored = results.rows.filter((row) => row.passed !== null);
  const passed = scored.filter((row) => row.passed).length;

  return (
    <>
      <Section
        title="Results"
        description={`Scored on a 1 to ${results.scaleMax} scale. A total of ${results.passThreshold} or above passes.`}
        actions={
          scored.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              <span data-numeric>{passed}</span> of{" "}
              <span data-numeric>{scored.length}</span> passed
            </span>
          ) : null
        }
      >
        {results.rows.length === 0 ? (
          <EmptyState
            variant="empty"
            title="Nobody is assessed yet"
            description="This evaluation has no assessee configured, so there is nothing to score. Add one under Setup."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Evaluation results for {results.courseCode}{" "}
                {results.semesterCode}
              </caption>
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-normal">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    Assessed as
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">
                    Raw
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">
                    Calculated
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">
                    Grade
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    Status
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Report
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row) => (
                  <ResultRow
                    key={`${row.assesseeRole}-${row.subjectId}`}
                    row={row}
                    onOpen={() => setOpenSubject(row.subjectId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <ReportDialog
        setupId={results.setupId}
        subjectId={openSubject}
        onClose={() => setOpenSubject(undefined)}
      />
    </>
  );
}

function ResultRow({
  row,
  onOpen,
}: Readonly<{ row: EvaluationResultRow; onOpen: () => void }>) {
  return (
    <tr className="border-b border-hairline/60">
      <td className="py-2 pr-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <SubjectAvatar displayName={row.displayName} size="sm" />
          <div className="min-w-0">
            <p className="truncate">{row.displayName}</p>
            {row.groupName ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.groupName}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="py-2 pr-3 text-xs text-muted-foreground">
        {ASSESSEE_ROLE_LABEL[row.assesseeRole]}
      </td>
      <td className="py-2 pr-3 text-right text-muted-foreground" data-numeric>
        {row.rawScore ?? "—"}
      </td>
      <td className="py-2 pr-3 text-right font-medium" data-numeric>
        {row.calculatedScore ?? "—"}
        {row.coveragePercent < 100 && row.calculatedScore !== null ? (
          // A score over partial evidence is provisional, and a bare number
          // would not say so.
          <span
            className="ml-1.5 text-[10px] font-normal text-warning-soft-foreground"
            title={`Only ${row.coveragePercent}% of the blend has been submitted`}
          >
            {row.coveragePercent}%
          </span>
        ) : null}
      </td>
      <td className="py-2 pr-3 text-right text-muted-foreground" data-numeric>
        {/* §22 is student-only: staff are scored and reported, never graded. */}
        {row.grade ?? "—"}
      </td>
      <td className="py-2 pr-3">
        <StatusBadge tone={tone(row.passed)} label={label(row.passed)} />
      </td>
      <td className="py-2 text-right">
        <Button size="xs" variant="outline" onClick={onOpen}>
          <FileText aria-hidden className="size-3.5" />
          Report
        </Button>
      </td>
    </tr>
  );
}

/**
 * The report, fetched when it opens.
 *
 * Lazy on purpose: a course-semester has dozens of subjects and each report
 * carries a criteria breakdown and every comment. The sheet itself is
 * `ReportSheetDialog`, shared with a student's own reports so the two cannot
 * print differently.
 */
function ReportDialog({
  setupId,
  subjectId,
  onClose,
}: Readonly<{ setupId: string; subjectId?: string; onClose: () => void }>) {
  const query = useStudentReport(setupId, subjectId);

  return (
    <ReportSheetDialog
      open={Boolean(subjectId)}
      onClose={onClose}
      subtitle={
        query.data
          ? `${query.data.displayName} · ${query.data.courseCode} ${query.data.semesterCode}`
          : "Loading the report."
      }
      printable={Boolean(query.data)}
    >
      {query.isPending ? <LoadingState label="Building the report" /> : null}
      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : null}
      {query.data ? <ReportDocument report={query.data} /> : null}
    </ReportSheetDialog>
  );
}

function tone(passed: boolean | null) {
  if (passed === null) return "neutral" as const;
  return passed ? ("success" as const) : ("error" as const);
}

function label(passed: boolean | null): string {
  if (passed === null) return "Not assessed";
  return passed ? "Pass" : "Not pass";
}
