import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader, Section } from "@/components/shared";
import { AddStudentDialog } from "@/features/enrollment/components/add-student-dialog";
import { EnrollmentScreen } from "@/features/enrollment/components/enrollment-screen";
import { TermRosterTable } from "@/features/enrollment/components/term-roster-table";
import { routes } from "@/lib/constants";
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
    title: detail ? `Enrollment · ${detail.program.code} ${detail.term.semesterCode}` : "Enrollment",
  };
}

/**
 * Who is under one program term, and how a student is added to it
 * (direction.md §6, §7, §7a).
 *
 * Two tables, because §7a names two questions and they have different grains.
 * The roster is **one row per student** — that is what a program enrollment
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
  // the enrollment refused by the server, and an action that cannot succeed is
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
        <TermRosterTable rows={roster} />
      </Section>

      <Section
        title="Course enrollments"
        description="The same term at course grain, where a drop or an evaluation group is visible. Program and semester are the page, so they are not filters here."
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
  planning: "Planning - not taking enrollments yet",
  closed: "Closed - this term is over",
  open: "",
};
