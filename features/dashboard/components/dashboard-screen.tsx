import { BookOpen, CalendarRange, ClipboardCheck, Gauge, Users } from "lucide-react";
import Link from "next/link";
import { TrendAreaChart } from "@/components/data-viz";
import { EmptyState } from "@/components/feedback";
import { Section, StatCard, StatusBadge } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/constants";
import { formatDate, formatNumber, formatScore } from "@/lib/utils";
import type { DashboardEvaluationRow, DashboardSummary } from "@/types";
import { WINDOW_STATUS_LABEL, WINDOW_STATUS_TONE } from "../constants";

/**
 * The dashboard (`direction.md` §24).
 *
 * A server component: nothing here is filtered, sorted or paged, so it reads
 * the service directly rather than making the network hop an interactive list
 * screen needs.
 *
 * Layout is deliberately plain, the way Your Evaluation was left — this is the
 * structure and the real figures, ahead of a design pass.
 *
 * Every panel ends in a link. §24 says not to turn this into an analytics
 * platform, and the line that keeps it honest is that the dashboard *states*
 * and the module *explains*: anything a reader wants to interrogate belongs to
 * the screen that owns it.
 */
export function DashboardScreen({ summary }: { summary: DashboardSummary }) {
  const { semester } = summary;

  if (!semester) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No semester is running"
        description="Every figure on this page is measured against the active semester. Open Semesters to see what is upcoming."
        action={
          <Link href={routes.semesters()} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Go to Semesters
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          tone="pink"
          icon={BookOpen}
          label="Active courses"
          value={formatNumber(summary.activeCourseCount)}
          hint={`${formatNumber(summary.courseCount)} running this semester`}
        />
        <StatCard
          tone="lavender"
          icon={CalendarRange}
          label="Current semester"
          value={semester.code}
          hint={`${formatDate(semester.startDate)} to ${formatDate(semester.endDate)}`}
        />
        <StatCard
          tone="blue"
          icon={Users}
          label="Enrolled students"
          value={formatNumber(summary.enrolledStudentCount)}
          hint="Distinct students, not enrollments"
        />
        <StatCard
          tone="green"
          icon={ClipboardCheck}
          label="Evaluation coverage"
          // A score with no submissions is null, never zero: "nobody has been
          // assessed" and "everybody scored nothing" are different claims, and
          // the tile must not turn the first into the second.
          value={summary.evaluationCoveragePercent === null ? "—" : `${formatNumber(summary.evaluationCoveragePercent, 1)}%`}
          hint={
            summary.evaluationCoveragePercent === null
              ? "No evaluation open yet"
              : "Mean share of each blend that has reported"
          }
        />
        <StatCard
          icon={Gauge}
          label="Average score"
          value={summary.averageScore === null ? "—" : formatScore(summary.averageScore)}
          hint={summary.averageScore === null ? "Nothing scored yet" : `out of ${summary.scaleMax}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendAreaChart
          title="Enrollments by semester"
          description="Every enrollment record, including those that later dropped or were cancelled."
          data={summary.enrollmentTrend}
          unit="Enrollments"
          format="integer"
        />

        <Section
          title="Evaluation progress"
          description="Evaluations running this semester, least complete first."
          actions={
            <Link
              href={routes.evaluationManage()}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Manage
            </Link>
          }
        >
          {summary.evaluations.length === 0 ? (
            <EmptyState
              variant="empty"
              icon={ClipboardCheck}
              title="Nothing to report yet"
              description="No evaluation for this semester has left draft."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {summary.evaluations.map((row) => (
                <EvaluationProgressRow key={row.setupId} row={row} />
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section
        title="Courses this semester"
        description={`The ${summary.courses.length} busiest of ${summary.courseCount} running in ${semester.code}.`}
        actions={
          <Link
            href={routes.courses()}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            All courses
          </Link>
        }
        flush
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
              <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Course
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Credits
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Enrolled
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.courses.map((course) => (
              <TableRow key={course.id} className="hairline-b">
                <TableCell className="text-sm">
                  <Link
                    href={routes.course(course.id)}
                    className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {course.code}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{course.name}</p>
                </TableCell>
                <TableCell className="text-right text-sm" data-numeric>
                  {course.credits}
                </TableCell>
                <TableCell className="text-right text-sm" data-numeric>
                  {formatNumber(course.enrolledCount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
}

function EvaluationProgressRow({ row }: { row: DashboardEvaluationRow }) {
  const label = `${row.courseCode} · ${row.shortName}`;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={routes.evaluationSetup(row.setupId)}
          className="truncate rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {label}
        </Link>
        <StatusBadge
          tone={WINDOW_STATUS_TONE[row.status]}
          label={WINDOW_STATUS_LABEL[row.status]}
        />
      </div>

      <CoverageBar label={label} percent={row.coveragePercent} />

      <p className="text-xs text-muted-foreground" data-numeric>
        {formatNumber(row.scoredCount)} of {formatNumber(row.subjectCount)} assessed ·{" "}
        {formatNumber(row.coveragePercent, 1)}% coverage
      </p>
    </li>
  );
}

/**
 * Coverage as a bar.
 *
 * A real `progressbar` role with its value on it, because the width of a div
 * says nothing to a screen reader, and the figure is repeated in text below for
 * everyone else. The track carries no motion — nothing on a PRIME screen moves
 * on its own.
 */
function CoverageBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div
      role="progressbar"
      aria-label={`Coverage for ${label}`}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}
