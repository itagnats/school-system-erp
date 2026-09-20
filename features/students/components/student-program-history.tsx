import Link from "next/link";
import { Section, StatusBadge } from "@/components/shared";
import { routes } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { StatusTone, StudentProgramTerm } from "@/types";

/**
 * Enrollment history at program grain (direction.md §7a, §9).
 *
 * One row per program term, not per course: a student joins a term and the
 * course enrollments follow from its curriculum, so a term is the unit a person
 * recognizes as "a year of study". The course-level detail lives on the
 * enrollment screens, one click away through the term.
 *
 * The dates are the **semester's**, not the enrollment's. A term is a period,
 * and showing the day somebody was added to a roster instead would answer a
 * question nobody asked.
 *
 * `linked` is false for a student reading their own profile (direction.md §3a).
 * The term page lives under `/enrollment`, which is administrator-only, so for
 * them the term is a label rather than a destination - the row still says which
 * program and semester it was, which is the part that is theirs to know.
 */
export function StudentProgramHistory({
  history,
  linked = true,
}: {
  history: StudentProgramTerm[];
  linked?: boolean;
}) {
  return (
    <Section
      title="Enrollment history"
      description="Every program term this student has held a place in, newest first."
    >
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This student has not been enrolled in a program term yet.
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

              {entry.programTermId && linked ? (
                <Link
                  href={routes.enrollmentTerm(entry.programTermId)}
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
 * Program membership status. `direction.md` §8: a status says where a student
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
