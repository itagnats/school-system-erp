import "server-only";

import { DEMO_ACCOUNT_ROLES, parsePrincipalCookie } from "@/lib/access";
import { enrollmentTable } from "@/server/repositories";
import { listPersonas } from "./persona-service";
import type { AppRole, DemoAccount, DemoPersona, DemoPrincipal } from "@/types";

/**
 * The demo sign-in (direction.md §3a).
 *
 * PRIME has no accounts, no passwords and no directory - §33 rules out real SSO
 * and real identity integration, and this does not smuggle them back in. What
 * it provides is the one thing a role-aware application cannot do without: an
 * answer to "who is asking". Picking a card is the whole of it.
 *
 * Three of the four are drawn from `listPersonas`, so the person who signs in
 * as the student has a real evaluation queue with real peers rather than an
 * empty screen. The administrator is synthetic: there is no staff table, and
 * nobody in the evaluation model runs the school.
 */

/** Which persona role backs each app role, where one does. */
const BACKED_BY: Partial<Record<AppRole, DemoPersona["role"]>> = {
  teacher: "teacher",
  ta: "ta",
  student: "student",
};

const TITLES: Record<AppRole, string> = {
  administrator: "Registrar",
  teacher: "Course teacher",
  ta: "Teaching assistant",
  student: "Enrolled student",
};

/**
 * The cards on the sign-in screen.
 *
 * Ordered by reach - the administrator first, because it is the role that shows
 * the application whole and is what a reader opening PRIME for the first time
 * should land on.
 */
export function listDemoAccounts(): DemoAccount[] {
  const personas = listPersonas();

  const accounts: DemoAccount[] = [
    {
      id: idFor("administrator"),
      role: "administrator",
      displayName: "Registrar Office",
      title: TITLES.administrator,
      context: "Whole school",
    },
  ];

  for (const role of ["teacher", "ta", "student"] as const) {
    const persona = personas.find((entry) => entry.role === BACKED_BY[role]);
    if (!persona) continue;

    accounts.push({
      id: idFor(role),
      role,
      displayName: persona.displayName,
      title: TITLES[role],
      context: [persona.courseCode, persona.semesterCode, persona.groupName]
        .filter(Boolean)
        .join(" · "),
      personaId: persona.id,
      studentId: role === "student" ? studentIdFor(persona) : undefined,
    });
  }

  return accounts;
}

/**
 * The student record a persona belongs to.
 *
 * A student persona's `subjectId` is an **enrollment** id, because what a
 * persona owes depends on the cohort rather than on the person - so the profile
 * it owns is one hop away, through that enrollment.
 *
 * Resolved here, on the server, and never carried in the cookie. A cookie
 * asserting its own `studentId` would be a claim the client writes about which
 * record it may read, which is the shape of the hole `AUD-023` already records.
 */
function studentIdFor(persona: DemoPersona): string | undefined {
  return enrollmentTable.find((row) => row.id === persona.subjectId)?.studentId;
}

/**
 * The account id this role signs in with.
 *
 * Read out of `DEMO_ACCOUNT_ROLES` rather than written twice. That map is what
 * `proxy.ts` checks the cookie against, so an account whose id it does not know
 * would sign in and then be refused everywhere - a failure that looks like a
 * broken access rule rather than a mismatched pair of literals.
 */
function idFor(role: AppRole): string {
  const found = Object.entries(DEMO_ACCOUNT_ROLES).find(([, value]) => value === role);
  if (!found) throw new Error(`No demo account id is registered for the ${role} role`);
  return found[0];
}

export function findDemoAccount(accountId: string): DemoAccount | undefined {
  return listDemoAccounts().find((account) => account.id === accountId);
}

/**
 * Turn a cookie value into the principal a request is served for.
 *
 * The role in the cookie has to match the role on the account it names. They
 * are two halves of one claim and a request carrying `administrator:acc-student`
 * is asserting something no card ever issued - so it resolves to nobody rather
 * than to whichever half is read second.
 *
 * Returns `undefined` for anything that does not resolve, and every caller
 * treats that as signed out. There is no default account: a default here would
 * be a role somebody did not choose, quietly deciding what they can see.
 */
export function resolvePrincipal(cookieValue: string | undefined): DemoPrincipal | undefined {
  const parsed = parsePrincipalCookie(cookieValue);
  if (!parsed) return undefined;

  const account = findDemoAccount(parsed.accountId);
  if (!account || account.role !== parsed.role) return undefined;

  return {
    role: account.role,
    accountId: account.id,
    displayName: account.displayName,
    title: account.title,
    context: account.context,
    personaId: account.personaId,
    studentId: account.studentId,
  };
}
