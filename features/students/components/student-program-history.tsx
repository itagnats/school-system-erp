import Link from "next/link";
import { Section, StatusBadge } from "@/components/shared";
import { routes } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { StatusTone, StudentProgramTerm } from "@/types";

/**
 * Enrolment history at programme grain (direction.md §7a, §9).
 *
 * One row per programme term, not per course: a student joins a term and the
 * course enrollments follow from its curriculum, so a term is the unit a person
 * recognises as "a year of study". The course-level detail lives on the
 * enrolment screens, one click away through the term.
 *
 * The dates are the **semester's**, not the enrolment's. A term is a period,
 * and showing the day somebody was added to a roster instead would answer a
 * question nobody asked.
 */
export function StudentProgramHistory({ history }: { history: StudentProgramTerm[] }) {
  return (
    <Section
      title="Enrollment history"
      description="Every programme term this student has held a place in, newest first."
    >
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This student has not been enrolled in a programme term yet.
        </p>
      ) : (
        <ul className="grid">
          {history.map((entry, index) => (
            <li
              key={entry.programEnrollmentId}
              className={
                index === 0
                  ? "flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                  : "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline py-2.5"
              }
            >
              <StatusBadge
                tone={MEMBERSHIP_TONE[entry.status]}
                label={MEMBERSHIP_LABEL[entry.status]}
              />

              {entry.programTermId ? (
                <Link
                  href={routes.enrolmentTerm(entry.programTermId)}
                  className="font-medium text-primary hover:underline"
                >
                  {entry.programCode} {entry.semesterCode}
                </Link>
              ) : (
                <span className="font-medium">
                  {entry.programCode} {entry.semesterCode}
                </span>
              )}

              <span className="ml-auto text-sm text-muted-foreground" data-numeric>
                {formatDate(entry.startDate)} - {formatDate(entry.endDate)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/**
 * Programme membership status. `direction.md` §8: a status says where a student
 * is, never how they did — an outcome is derived from the grades and is not one
 * of these four.
 */
const MEMBERSHIP_LABEL: Record<StudentProgramTerm["status"], string> = {
  pending: "Pending",
  active: "Ongoing",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

const MEMBERSHIP_TONE: Record<StudentProgramTerm["status"], StatusTone> = {
  pending: "warning",
  active: "success",
  completed: "info",
  withdrawn: "error",
};
