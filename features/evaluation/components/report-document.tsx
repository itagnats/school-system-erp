"use client";

import { CriteriaRadarChart } from "@/components/data-viz";
import { StatusBadge } from "@/components/shared";
import { SakuraMark } from "@/components/decor";
import { cn, formatDate } from "@/lib/utils";
import type { StudentReport } from "@/types";
import { SubjectAvatar } from "./subject-avatar";
import {
  ASSESSEE_ROLE_LABEL,
  EVALUATION_CRITERION_LABEL,
  EVALUATION_ROLE_LABEL,
} from "../constants";

/**
 * The individual report (direction.md §23).
 *
 * Two parts, following the reference document: the scored criteria and their
 * arithmetic, then the comments. It renders the same whether it is on screen or
 * on paper - which is the point of §23's "suitable for printing", and why the
 * layout avoids anything that depends on a viewport height.
 *
 * ## What it refuses to hide
 *
 * - **The arithmetic.** The total states the two shares it came from, so the
 *   headline can be checked against its parts rather than believed (§20).
 * - **The Self column, empty.** The reference report has one and every cell is
 *   a dash, because nobody assesses themselves (§16). Keeping it states the
 *   rule; dropping it would leave a reader wondering whether self-assessment
 *   happened and simply was not shown.
 * - **Coverage below 100.** A confident number over half the evidence is the
 *   most misleading thing a report can print, so an incomplete score says so.
 * - **That the data is a demo.** No real assessment produced these figures.
 */
export function ReportDocument({
  report,
}: Readonly<{ report: StudentReport }>) {
  const { score } = report;
  const provisional = score.coveragePercent < 100;

  const radarData = report.criteriaBreakdown.map((row) => ({
    label: EVALUATION_CRITERION_LABEL[row.criterion],
    value: row.score ?? 0,
  }));

  return (
    <article className="grid gap-4 text-foreground">
      <header className="rounded-lg border border-hairline bg-surface-sunken px-4 py-3.5">
        <div className="flex items-center gap-2">
          <SakuraMark className="size-4 text-seal" />
          <p className="text-xs font-medium text-muted-foreground">
            {report.evaluationName}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <SubjectAvatar displayName={report.displayName} size="lg" />
            <div className="min-w-0">
              <h3 className="text-lg font-medium">{report.displayName}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone="accent"
                  label={ASSESSEE_ROLE_LABEL[report.assesseeRole]}
                />
                {report.student ? (
                  <span className="text-xs text-muted-foreground" data-numeric>
                    {report.student.studentId}
                  </span>
                ) : null}
              </div>
              <dl className="mt-2.5 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                <Meta
                  label="Course"
                  value={`${report.courseCode} · ${report.courseName}`}
                />
                <Meta label="Semester" value={report.semesterCode} />
                {report.evaluationGroupName ? (
                  <Meta label="Group" value={report.evaluationGroupName} />
                ) : null}
                <Meta
                  label="Report date"
                  value={formatDate(report.generatedAt)}
                />
              </dl>
            </div>
          </div>

          {report.rank !== undefined ? (
            <div className="shrink-0 rounded-lg border border-hairline bg-card px-3.5 py-2.5 text-center">
              <p className="text-xs text-muted-foreground">Rank in group</p>
              <p className="text-lg font-medium" data-numeric>
                {report.rank}
                <span className="text-sm text-muted-foreground">
                  {" "}
                  / {report.rankOutOf}
                </span>
              </p>
              {/* §21: a ranking is meaningless unless it states its scope. */}
              <p className="text-[10px] text-muted-foreground">
                {report.evaluationGroupName ?? "group"}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      {provisional ? (
        <p className="rounded-md border border-warning/30 bg-warning-soft px-3.5 py-2 text-xs text-warning-soft-foreground">
          Provisional — only <span data-numeric>{score.coveragePercent}%</span>{" "}
          of the blend has been submitted. The figures below will move as the
          remaining assessors report.
        </p>
      ) : null}

      {/* -------------------------------------------------------------- */}
      <section>
        <h4 className="text-xs font-medium tracking-wide text-primary-strong uppercase">
          Part 1 · 360° evaluation score
        </h4>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline text-left text-muted-foreground">
                <th scope="col" className="py-1.5 pr-2 font-normal">
                  No.
                </th>
                <th scope="col" className="py-1.5 pr-2 font-normal">
                  Criterion
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Ratings
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Self
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  Assessors
                </th>
              </tr>
            </thead>
            <tbody>
              {report.criteriaBreakdown.map((row, index) => (
                <tr key={row.criterion} className="border-b border-hairline/60">
                  <td
                    className="py-1.5 pr-2 text-muted-foreground"
                    data-numeric
                  >
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="py-1.5 pr-2">
                    {EVALUATION_CRITERION_LABEL[row.criterion]}
                  </td>
                  <td
                    className="py-1.5 pr-2 text-right text-muted-foreground"
                    data-numeric
                  >
                    {row.ratingCount}
                  </td>
                  {/* Always a dash. See the note on CriterionBreakdown.selfScore. */}
                  <td className="py-1.5 pr-2 text-right text-muted-foreground">
                    <span aria-hidden>—</span>
                    <span className="sr-only">no self-assessment</span>
                  </td>
                  <td className="py-1.5 text-right font-medium" data-numeric>
                    {row.score ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Self is always empty: no role assesses itself.
        </p>

        {/* The working, not just the answer. */}
        <dl className="mt-3 grid gap-1.5 rounded-lg border border-hairline bg-surface-sunken px-3.5 py-3 text-xs">
          <Line
            label="Behavioural score"
            hint={`${score.behaviouralSharePercent}% of the total`}
            value={score.behaviouralScore}
          />
          <Line
            label="Forced ranking score"
            hint={`${score.rankingSharePercent}% of the total`}
            value={score.rankingScore}
          />
          <div className="mt-1 border-t border-hairline pt-2">
            <Line
              label={`Total (behavioural ${score.behaviouralSharePercent}% + ranking ${score.rankingSharePercent}%)`}
              value={score.totalScore}
              strong
            />
          </div>
        </dl>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            Total ≥ <span data-numeric>{score.passThreshold}</span> = pass ·
            below that = not pass
          </p>
          <div className="flex items-center gap-2">
            {score.grade ? (
              <span className="text-xs text-muted-foreground">
                {score.percent}% · grade{" "}
                <span className="font-medium text-foreground">
                  {score.grade}
                </span>
              </span>
            ) : (
              // §22 is student-only. A teacher is scored and reported, not graded.
              <span className="text-xs text-muted-foreground">
                {score.percent}% · not graded
              </span>
            )}
            <StatusBadge
              tone={outcomeTone(score.passed)}
              label={outcomeLabel(score.passed)}
            />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      <section>
        <h4 className="text-xs font-medium tracking-wide text-primary-strong uppercase">
          Behavioural profile
        </h4>
        <div className="mt-2">
          <CriteriaRadarChart
            title="Mean rating per criterion"
            description="Across every assessor that was asked it"
            data={radarData}
            unit="Mean rating"
            max={5}
            format="decimal"
            height={260}
          />
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Part 2 begins a new sheet, as the reference report does: the comments
          are read after the score rather than beside it. */}
      <section data-print-break="page">
        <h4 className="text-xs font-medium tracking-wide text-primary-strong uppercase">
          Part 2 · Comments
        </h4>
        <FeedbackByRole report={report} />
      </section>

      <p className="border-t border-hairline pt-2 text-[10px] text-muted-foreground">
        Demonstration data. No real assessment produced these figures, and
        nothing on this report is stored — it is recomputed from the evaluation
        configuration each time it is opened.
      </p>
    </article>
  );
}

/**
 * Comments grouped by role, with the roles that said nothing shown as such.
 *
 * An absent role is a finding: "the teacher has not commented" is information,
 * and omitting the heading would leave the reader to notice the gap themselves.
 */
function FeedbackByRole({ report }: Readonly<{ report: StudentReport }>) {
  const roles = report.score.roles.map((role) => role.role);

  return (
    <div className="mt-2 grid gap-2.5">
      {roles.map((role) => {
        const comments = report.feedback.filter((entry) => entry.role === role);
        return (
          <div
            key={role}
            className="rounded-lg border border-hairline bg-card px-3.5 py-2.5"
          >
            <p className="text-xs font-medium">
              {EVALUATION_ROLE_LABEL[role]}
              <span
                className="ml-1.5 font-normal text-muted-foreground"
                data-numeric
              >
                {comments.length}
              </span>
            </p>
            {comments.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No comments provided.
              </p>
            ) : (
              <ul className="mt-1.5 grid gap-1.5">
                {comments.map((entry, index) => (
                  <li
                    key={`${role}-${index}`}
                    className="border-l-2 border-primary/30 pl-2.5 text-xs text-muted-foreground"
                  >
                    {entry.comment}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">
        Comments are attributed to a role, never to a person — a peer who can be
        identified is a peer who can be bargained with.
      </p>
    </div>
  );
}

function Line({
  label,
  hint,
  value,
  strong = false,
}: Readonly<{
  label: string;
  hint?: string;
  value: number | null;
  strong?: boolean;
}>) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt
        className={cn(
          "min-w-0",
          strong ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {hint ? (
          <span className="ml-1.5 text-[10px] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          strong ? "text-base font-medium" : "font-medium",
        )}
        data-numeric
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function Meta({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{value}</dd>
    </div>
  );
}

function outcomeTone(passed: boolean | null) {
  if (passed === null) return "neutral" as const;
  return passed ? ("success" as const) : ("error" as const);
}

function outcomeLabel(passed: boolean | null): string {
  if (passed === null) return "Not assessed";
  return passed ? "Pass" : "Not pass";
}
