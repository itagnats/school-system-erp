import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PRINCIPAL_COOKIE, canOpenPath } from "@/lib/access";
import { resolvePrincipal, subjectOwner } from "./services";
import type { DemoPrincipal } from "@/types";

/**
 * Who a server render is for (direction.md §3a).
 *
 * Three layouts put the application in its shell - `(dashboard)`, the design
 * system and the system guide - and each of them needs the same answer before
 * it can draw a sidebar. Reading the cookie in one place is what stops the
 * three drifting; the third copy of a rule is where the first mistake usually
 * arrives.
 */

/** The principal, or nothing. For anywhere that has something to show either way. */
export async function currentPrincipal(): Promise<DemoPrincipal | undefined> {
  const store = await cookies();
  return resolvePrincipal(store.get(PRINCIPAL_COOKIE)?.value);
}

/**
 * The principal, or the sign-in screen.
 *
 * `proxy.ts` has already turned away anyone without one, so this is the second
 * answer to the same question. It is still worth asking: the shell cannot
 * render without an identity, and a layout that assumes the proxy ran is a
 * layout that renders for nobody the day a matcher changes.
 */
export async function requirePrincipal(): Promise<DemoPrincipal> {
  const principal = await currentPrincipal();
  if (!principal) redirect("/login");
  return principal;
}

/**
 * The half of an owner-scoped rule the edge cannot decide (direction.md §3a).
 *
 * `PAGE_ACCESS` and `API_ACCESS` mark `/students` as owner-scoped for the
 * student role, which lets a student past `proxy.ts` to *a* profile. Which
 * profile is this function's question, and it is asked here because this is
 * where identity and data meet - the proxy sees a path and has no idea whose
 * record it names.
 *
 * So the rule is: **a role that reaches a record through `owner` has not been
 * allowed anything until this has run.** Every page and every handler beneath
 * an owner-scoped prefix calls it. Nothing enforces that automatically, which
 * is the open half of `AUD-026`.
 *
 * Staff are unaffected: they hold the record through `read`/`write` in the
 * table and never take this path.
 */
export function ownsStudent(principal: DemoPrincipal, studentId: string): boolean {
  if (principal.role !== "student") return false;
  // No record, no ownership. A student principal that failed to resolve to a
  // profile owns nothing rather than everything - the same choice the cookie
  // parser makes when it reads an unparseable value as nobody.
  return principal.studentId !== undefined && principal.studentId === studentId;
}

/**
 * Whether this principal may read the profile named by `studentId`.
 *
 * Staff read any profile; a student reads their own. Written as one question
 * with one answer so a page and its endpoint cannot come to different
 * conclusions about the same record.
 */
export function mayReadStudent(principal: DemoPrincipal, studentId: string): boolean {
  if (principal.role === "administrator" || principal.role === "teacher") return true;
  return ownsStudent(principal, studentId);
}

/** Whether this principal may change that profile. Administrators, and its owner. */
export function mayWriteStudent(principal: DemoPrincipal, studentId: string): boolean {
  if (principal.role === "administrator") return true;
  return ownsStudent(principal, studentId);
}

/**
 * Guard for a page beneath an owner-scoped prefix.
 *
 * Sends a refusal to `/no-access` rather than a 404. A student asking for
 * another student's profile has not found a missing page - they have found one
 * that exists and is not theirs, and saying so is the honest answer as well as
 * the one that does not leak which ids exist, since `/no-access` says the same
 * thing for a profile that was never there.
 */
export async function requireOwnStudent(
  studentId: string,
  from = `/students/${studentId}`,
): Promise<DemoPrincipal> {
  const principal = await requirePrincipal();
  if (!mayReadStudent(principal, studentId)) {
    redirect(refusalPath(from));
  }
  return principal;
}

/**
 * Guard for the edit route.
 *
 * Reading and editing part company here: a teacher may open a profile and may
 * not change one, so the edit page cannot reuse the read guard. An
 * administrator edits anybody, a student edits themselves, and a teacher who
 * types the `/edit` URL is refused rather than shown a form whose save would
 * come back 403.
 */
export async function requireWritableStudent(studentId: string): Promise<DemoPrincipal> {
  const principal = await requirePrincipal();
  if (!mayWriteStudent(principal, studentId)) {
    redirect(refusalPath(`/students/${studentId}/edit`));
  }
  return principal;
}

/* -------------------------------------------------------------------------- */
/* Evaluation results and reports (added 2026-09-19)                          */
/* -------------------------------------------------------------------------- */

/**
 * Whether this principal may read a whole setup's results.
 *
 * Asked of the access table rather than answered with a role list, because the
 * results table *is* the Manage Evaluation screen's data: an endpoint that
 * served somebody the page refuses would be the page's own authorization with
 * a hole cut in it. One question, one answer, in the one table.
 *
 * It is checked here rather than in `proxy.ts` because the table cannot reach
 * it. Rules match by prefix, and the part of `/api/evaluation/<id>/results`
 * that matters is a **suffix sitting behind a dynamic id** - there is no prefix
 * that names it. `{ prefix: "/api/evaluation", read: EVERYONE }` is what the
 * queue and the evaluation form need, and it was handing every signed-in
 * student the full results table: thirteen peers with names, scores and grades
 * (`AUD-029`, probed rather than reasoned about).
 */
export function mayReadEvaluationResults(principal: DemoPrincipal): boolean {
  return canOpenPath(principal.role, "/evaluation/manage");
}

/**
 * Whether this principal may read one subject's report.
 *
 * The same rule as the results table, widened by one: the student the subject
 * belongs to. That widening is what makes a student's own report theirs to read
 * without making anybody else's readable, and it is the same shape as
 * `mayReadStudent` - staff by role, one person by ownership.
 *
 * A staff subject id (`staff-<setupId>-<role>`) has no owner, so `subjectOwner`
 * returns nothing and no student can claim a teacher's report.
 */
export function mayReadSubjectReport(
  principal: DemoPrincipal,
  subjectId: string,
): boolean {
  if (mayReadEvaluationResults(principal)) return true;

  const owner = subjectOwner(subjectId);
  return owner !== undefined && ownsStudent(principal, owner);
}

/**
 * Where a refused page sends the reader.
 *
 * `/no-access` inside the shell, carrying where they came from - encoded here
 * and validated again by `safeReturnPath` before that page prints it, because
 * a path this function built is still a string arriving in a query parameter.
 */
function refusalPath(from: string): string {
  return `/no-access?from=${encodeURIComponent(from)}`;
}
