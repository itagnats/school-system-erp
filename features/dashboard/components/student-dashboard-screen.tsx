import { BookOpen, ClipboardCheck, GraduationCap, UserRound } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback";
import { Section, StatCard, StatusBadge } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import type { StudentCourseRow, StudentDashboardSummary, StudentTaskRow } from "@/types";
import {
  ENROLLMENT_STATUS_LABEL,
  ENROLLMENT_STATUS_TONE,
  PROGRAM_STANDING_LABEL,
} from "../constants";

/**
 * The dashboard a student sees (`direction.md` §3a).
 *
 * The staff dashboard asks how the school is doing; this one asks what you are
 * enrolled in and what you still owe. It is a different screen rather than the
 * same one with panels removed, because a student reading the school's head
 * count has been shown a figure that is true and none of their business.
 *
 * **Every link here goes somewhere a student may open.** That is not a detail:
 * the version of this page they had before showed them Courses, Semesters and
 * Manage Evaluation, every one of which refused them. A dashboard whose links
 * are all dead ends is worse than no dashboard, because it teaches the reader
 * that the navigation lies.
 *
 * Layout is deliberately plain, as Your Evaluation was left - the structure and
 * the real figures, ahead of a design pass.
 */
export function StudentDashboardScreen({
  summary,
}: {
  summary: StudentDashboardSummary;
}) {
  const { student, standing, courses, tasks } = summary;

  if (!student) {
    return (
      <EmptyState
        icon={UserRound}
        title="No student record"
        description="This account is signed in as a student, but no profile could be found for it. Nothing here can be shown without one."
      />
    );
  }

  const outstanding = tasks.filter(
    (task) => task.windowOpen && task.completedCount < task.subjectCount,
  ).length;

  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          tone="pink"
          icon={GraduationCap}
          label="Programme"
          value={standing ? standing.programName : student.program}
          hint={
            standing
              ? `${PROGRAM_STANDING_LABEL[standing.status]} · ${standing.semesterCode}`
              : "No programme membership recorded"
          }
        />
        <StatCard
          tone="lavender"
          icon={BookOpen}
          label="Your courses"
          value={formatNumber(courses.length)}
          hint={
            summary.semesterCount === 1
              ? "in one semester"
              : `across ${formatNumber(summary.semesterCount)} semesters`
          }
        />
        <StatCard
          tone="blue"
          icon={ClipboardCheck}
          label="Still to assess"
          value={formatNumber(outstanding)}
          hint={
            summary.taskTotal === 0
              ? "Nothing has been assigned to you"
              : `of ${formatNumber(summary.taskTotal)} assigned`
          }
        />
      </div>

      <Section
        title="What you owe"
        description="Evaluations you have been asked to complete, least finished first."
        actions={
          <Link
            href={routes.evaluation()}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Your Evaluation
          </Link>
        }
      >
        {tasks.length === 0 ? (
          <EmptyState
            variant="empty"
            icon={ClipboardCheck}
            title="Nothing to assess"
            description="No evaluation has asked anything of you yet. It will appear here and in Your Evaluation when one opens."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {tasks.map((task) => (
              <TaskRow key={task.assignmentId} task={task} />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Your courses"
        description={
          summary.currentSemesterCode
            ? `Every semester you have been enrolled in. ${summary.currentSemesterCode} is the one running now.`
            : "Every semester you have been enrolled in."
        }
        flush
      >
        {courses.length === 0 ? (
          <EmptyState
            variant="empty"
            icon={BookOpen}
            title="No enrollments"
            description="You are not enrolled in any course yet."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Semester
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Course
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Credits
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((row) => (
                <CourseRow key={row.enrollmentId} row={row} />
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

/**
 * One course row.
 *
 * The course code is **not a link**. A student cannot open `/courses/<id>`, and
 * a link that refuses the only person who can see it is the defect this screen
 * was written to remove.
 */
function CourseRow({ row }: { row: StudentCourseRow }) {
  return (
    <TableRow className="hairline-b">
      <TableCell className="text-sm" data-numeric>
        <span className="flex items-center gap-1.5">
          {row.semesterCode}
          {row.isCurrentSemester ? (
            <Badge variant="secondary" className="text-[10px]">
              Now
            </Badge>
          ) : null}
        </span>
      </TableCell>
      <TableCell className="text-sm">
        <span className="font-medium text-foreground">{row.courseCode}</span>
        <p className="truncate text-xs text-muted-foreground">{row.courseName}</p>
      </TableCell>
      <TableCell className="text-right text-sm" data-numeric>
        {row.credits}
      </TableCell>
      <TableCell>
        <StatusBadge
          tone={ENROLLMENT_STATUS_TONE[row.status]}
          label={ENROLLMENT_STATUS_LABEL[row.status]}
        />
      </TableCell>
    </TableRow>
  );
}

/**
 * One thing still to do.
 *
 * Progress is the seeded `completedCount`, the same figure Your Evaluation
 * shows, so the two screens cannot disagree about how far through somebody is.
 * A closed window is stated rather than hidden: the work is over, and a row
 * that vanished would look like work that was never asked for.
 */
function TaskRow({ task }: { task: StudentTaskRow }) {
  const done = task.completedCount >= task.subjectCount;
  const label = `${task.courseCode} · ${task.shortName}`;
  const what = task.kind === "ranking" ? "Ranking" : "360 form";

  // A closed window outranks progress: once the evaluation is over, how far
  // through somebody got is history rather than something still to finish.
  let tone: "neutral" | "success" | "warning" = "warning";
  let state = "To do";
  if (!task.windowOpen) {
    tone = "neutral";
    state = "Closed";
  } else if (done) {
    tone = "success";
    state = "Done";
  }

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={routes.evaluation()}
          className="truncate rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {label}
        </Link>
        <StatusBadge tone={tone} label={state} />
      </div>

      <p className="text-xs text-muted-foreground" data-numeric>
        {what} on the {task.assesseeRole} · {formatNumber(task.completedCount)} of{" "}
        {formatNumber(task.subjectCount)} done
      </p>
    </li>
  );
}
