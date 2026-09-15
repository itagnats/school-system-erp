import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader, Section, StatusBadge } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddStudentDialog } from "@/features/enrollment/components/add-student-dialog";
import { EnrollmentScreen } from "@/features/enrollment/components/enrollment-screen";
import { routes } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  courseFilterOptions,
  courseSemesterOptions,
  getProgramTerm,
  openProgramTermOptions,
  programFilterOptions,
  programTermRoster,
} from "@/server/services";

interface PageParams {
  params: Promise<{ programTermId: string }>;
}

export async function generateMetadata({ params }: Readonly<PageParams>): Promise<Metadata> {
  const { programTermId } = await params;
  const detail = getProgramTerm(programTermId);
  return {
    title: detail ? `Enrolment · ${detail.program.code} ${detail.term.semesterCode}` : "Enrolment",
  };
}

/**
 * Who is under one programme term, and how a student is added to it
 * (direction.md §6, §7, §7a).
 *
 * Two tables, because §7a names two questions and they have different grains.
 * The roster is **one row per student** — that is what a programme enrolment
 * is, and what the package is billed against. Below it, the same term seen as
 * course enrollments, which is where a dropped course or an evaluation group
 * shows up. A head count and a course count are not the same number and the
 * page should not pretend otherwise.
 *
 * The money lens on the same term lives under Curriculum; the link is in the
 * header rather than the figures being repeated here.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { programTermId } = await params;
  const detail = getProgramTerm(programTermId);
  const roster = programTermRoster(programTermId);
  if (!detail || !roster) notFound();

  // Present only while the term is open. A planning or closed term would have
  // the enrolment refused by the server, and an action that cannot succeed is
  // worse than no action.
  const enrollable = openProgramTermOptions().find((term) => term.id === programTermId);

  return (
    <>
      <PageHeader
        title={`${detail.program.code} - ${detail.term.semesterCode}`}
        description={`${roster.length} student${roster.length === 1 ? "" : "s"} under ${
          detail.program.name
        }, each taking the ${detail.term.courseIds.length} courses of its curriculum.`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={routes.programTerm(programTermId)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Curriculum and cost
            </Link>
            {enrollable ? (
              <AddStudentDialog
                terms={[enrollable]}
                semesterOptions={courseSemesterOptions()}
                defaultTermId={enrollable.id}
              />
            ) : (
              // Say why the action is missing. A header that is simply empty
              // reads as a page that forgot its button, and someone will go
              // looking for it on another screen.
              <p className="text-xs text-muted-foreground">
                {TERM_NOT_OPEN[detail.term.status]}
              </p>
            )}
          </div>
        }
      />

      <Section
        title="Students"
        description="One row per student. A package is billed whole, so someone carrying two of four courses is still a member of this term."
      >
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody is enrolled in this term yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Major</TableHead>
                <TableHead className="text-right">Courses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((entry) => (
                <TableRow key={entry.enrollmentId}>
                  <TableCell>
                    <Link
                      href={routes.student(entry.student.id)}
                      className="font-medium text-primary hover:underline"
                    >
                      {entry.student.studentId}
                    </Link>
                  </TableCell>
                  <TableCell>{entry.student.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.student.major}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.courseCount}
                    {entry.unfinishedCount > 0 ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        +{entry.unfinishedCount} unfinished
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={MEMBERSHIP_TONE[entry.status]}
                      label={MEMBERSHIP_LABEL[entry.status]}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(entry.enrolledAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section
        title="Course enrollments"
        description="The same term at course grain, where a drop or an evaluation group is visible. Programme and semester are the page, so they are not filters here."
      >
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <EnrollmentScreen
            courseOptions={courseFilterOptions()}
            programOptions={programFilterOptions()}
            semesterOptions={courseSemesterOptions()}
            termOptions={[]}
            locked={{
              programId: detail.term.programId,
              semesterCode: detail.term.semesterCode,
            }}
          />
        </Suspense>
      </Section>
    </>
  );
}

/** Why Add Student is absent, in the words of the term status. */
const TERM_NOT_OPEN: Record<string, string> = {
  planning: "Planning - not taking enrolments yet",
  closed: "Closed - this term is over",
  open: "",
};

/**
 * Programme membership status, which is a different union from the course
 * enrollment status beneath it — four values against six. `direction.md` §8
 * says a status is where a student is, never how they did.
 */
const MEMBERSHIP_LABEL: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

const MEMBERSHIP_TONE = {
  pending: "warning",
  active: "success",
  completed: "info",
  withdrawn: "error",
} as const;
