import type { Metadata } from "next";
import { PageHeader } from "@/components/shared";
import { OwnReportsScreen } from "@/features/evaluation/components/own-reports-screen";
import { ownsStudent, requireOwnStudent } from "@/server/principal";
import { getStudent, ownStudentReports } from "@/server/services";

export const metadata: Metadata = { title: "Reports" };

/**
 * One student's reports (direction.md §3a, §23; added 2026-09-19).
 *
 * This route existed as a placeholder from the scaffold and was recorded as a
 * dead end - `AUD-002`, open since 2026-09-07, asking for exactly one of two
 * things: delete it, or point it at the live report. This is the second.
 *
 * **Owner-scoped, like the profile.** `/reports` stays staff-only: it is the
 * picker and the results table, and a student has no business in either. The
 * deeper rule in `lib/access/policy.ts` lets a student past the edge to *a*
 * record beneath `/reports/students`, and `requireOwnStudent` decides whose -
 * the same two halves, for the same reason, as `/students/<id>`. Staff keep
 * `read` here, so this doubles as one person's reports across cohorts.
 *
 * The documents are built on the server and handed to the screen whole. A
 * student's own report therefore never travels over the API, which is one less
 * endpoint that has to remember who is asking.
 */
export default async function Page({
  params,
}: PageProps<"/reports/students/[studentId]">) {
  const { studentId } = await params;
  const principal = await requireOwnStudent(
    studentId,
    `/reports/students/${studentId}`,
  );

  const student = getStudent(studentId);
  const reports = ownStudentReports(studentId);
  const owned = ownsStudent(principal, studentId);

  return (
    <>
      <PageHeader
        title={owned ? "My Reports" : "Student Reports"}
        description={
          student
            ? `${student.personal.firstName} ${student.personal.lastName} · ${student.studentId}`
            : `Record: ${studentId}`
        }
      />

      <OwnReportsScreen reports={reports} owned={owned} />
    </>
  );
}
