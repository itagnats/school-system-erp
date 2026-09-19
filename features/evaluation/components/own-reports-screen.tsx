"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/feedback";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { StudentReport } from "@/types";
import { ReportDocument } from "./report-document";
import { ReportSheetDialog } from "./report-sheet-dialog";

/**
 * One student's own reports (direction.md §3a, §23; added 2026-09-19).
 *
 * §23 delivers a report from the results table - a reader with a question about
 * one subject among dozens. A student has no results table and never will, so
 * this is the second delivery path, and it is deliberately the smaller one: the
 * cohorts they were assessed in, and the same document staff would open about
 * them. **The document is not a different document.** A version trimmed for the
 * subject would be a second thing to maintain and a quiet invitation to decide
 * later what somebody may know about their own assessment.
 *
 * **Published setups only.** A closed evaluation is scored and not yet handed
 * over; releasing a report is a deliberate act and the window status is where
 * that act is recorded. The filtering happens in `ownStudentReports`, on the
 * server - this component renders what it is given.
 *
 * Every report arrives with the page. There is no fetch, which is what keeps
 * the list and the document from disagreeing, and it is why the endpoint under
 * `/api/evaluation/<id>/report/<subject>` is not on this path at all.
 */
export function OwnReportsScreen({
  reports,
  owned,
}: Readonly<{ reports: StudentReport[]; owned: boolean }>) {
  const [openSetupId, setOpenSetupId] = useState<string | undefined>();
  const active = reports.find((report) => report.setupId === openSetupId);

  return (
    <>
      <Section
        title={owned ? "Your reports" : "Reports"}
        description="One per published evaluation, newest semester first. Each opens the full report, ready to print."
      >
        {reports.length === 0 ? (
          <EmptyState
            variant="empty"
            icon={FileText}
            title="No report has been published yet"
            description={
              owned
                ? "A report appears here once the evaluation it belongs to has been published. Until then there is nothing to read - not a result of zero."
                : "No evaluation covering this student has been published yet."
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <ReportRow
                key={report.setupId}
                report={report}
                onOpen={() => setOpenSetupId(report.setupId)}
              />
            ))}
          </ul>
        )}
      </Section>

      <ReportSheetDialog
        open={Boolean(active)}
        onClose={() => setOpenSetupId(undefined)}
        subtitle={
          active
            ? `${active.displayName} · ${active.courseCode} ${active.semesterCode}`
            : ""
        }
        printable={Boolean(active)}
      >
        {active ? <ReportDocument report={active} /> : null}
      </ReportSheetDialog>
    </>
  );
}

/**
 * One line per report: where it came from, what it says, and the way in.
 *
 * The headline figure states its denominator. "4.08" is not a result until
 * something says out of what, and the scale is per setup rather than a
 * constant - which is why `scaleMax` travels on the report.
 *
 * Coverage below 100 is on this row as well as inside the document. Somebody
 * scanning a list should not have to open a report to learn that its number is
 * provisional.
 */
function ReportRow({
  report,
  onOpen,
}: Readonly<{ report: StudentReport; onOpen: () => void }>) {
  const { score } = report;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-card px-3.5 py-3 shadow-xs">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {report.courseCode} · {report.courseName}
        </p>
        <p className="truncate text-xs text-muted-foreground" data-numeric>
          {[report.semesterCode, report.evaluationGroupName, report.shortName]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium" data-numeric>
            {score.totalScore ?? "—"}
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              / {report.scaleMax}
            </span>
          </p>
          <p className="text-xs text-muted-foreground" data-numeric>
            {/* §22 is student-only, so a grade is not guaranteed to be here. */}
            {score.grade ? `Grade ${score.grade}` : "Not graded"}
            {score.coveragePercent < 100
              ? ` · ${score.coveragePercent}% assessed`
              : null}
          </p>
        </div>

        <StatusBadge tone={tone(score.passed)} label={label(score.passed)} />

        <Button size="xs" variant="outline" onClick={onOpen}>
          <FileText aria-hidden className="size-3.5" />
          Open report
        </Button>
      </div>
    </li>
  );
}

function tone(passed: boolean | null) {
  if (passed === null) return "neutral" as const;
  return passed ? ("success" as const) : ("error" as const);
}

/**
 * "Not assessed" is not "not pass".
 *
 * A score with no submissions is null (§21), and printing a failure where
 * nobody reported would be an accusation the data does not support - the more
 * so on the subject's own copy.
 */
function label(passed: boolean | null): string {
  if (passed === null) return "Not assessed";
  return passed ? "Pass" : "Not pass";
}
