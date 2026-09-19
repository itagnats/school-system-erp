/**
 * Who is using PRIME (direction.md §3a).
 *
 * An **app role** is not an evaluation role. `EvaluationRole` says what somebody
 * is inside one course-semester's assessment - a peer, an inspector, the
 * teacher, the TA - and it exists on both sides of an evaluation. An `AppRole`
 * says which parts of the application they may open at all, and it has to
 * include an administrator, because nobody in the evaluation model owns Cost
 * Management or Invoices.
 *
 * Keeping the two unions apart is the same correction §14 already records about
 * evaluation roles: collapsing two meanings into one name is what made an
 * earlier build hard-code the wrong side of a relationship.
 *
 * `inspector` is deliberately absent. An inspector is a student from another
 * group, so it owns no screen the student role does not - a fifth app role
 * whose sidebar was identical to another's would document nothing.
 */
export const APP_ROLES = ["administrator", "teacher", "ta", "student"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/**
 * A demo identity offered on the sign-in screen.
 *
 * There are no accounts, no passwords and no directory. Each one is a named
 * role, and where the role is one a person holds inside a cohort it carries
 * the `DemoPersona` id that gives their evaluation queue real peers.
 */
export interface DemoAccount {
  id: string;
  role: AppRole;
  displayName: string;
  /** What this role is responsible for, shown on the card. */
  title: string;
  /** Where they hold it, for a role scoped to one course-semester. */
  context?: string;
  /** The evaluation persona this account acts as, when it has one. */
  personaId?: string;
  /**
   * The student record this account *is*, for the student role only.
   *
   * Resolved server-side from the persona's enrollment, never read from the
   * cookie. It is what makes "their own profile" a checkable claim rather than
   * a path the client asserts (direction.md §3a).
   */
  studentId?: string;
}

/**
 * The principal a request is being served for.
 *
 * Resolved from the demo session cookie. It is **not** an authenticated
 * subject: the cookie is unsigned, self-asserted and worth exactly what a
 * demonstration needs it to be worth. Everything that reads it says so.
 */
export interface DemoPrincipal {
  role: AppRole;
  accountId: string;
  displayName: string;
  title: string;
  context?: string;
  personaId?: string;
  /** The student record this principal owns. Present for the student role only. */
  studentId?: string;
}
