import { APP_ROLES, type AppRole } from "@/types/identity";

/**
 * What each app role may open (direction.md §3a).
 *
 * One table, two readers. The sidebar filters itself with it so a role is not
 * offered a destination it cannot use, and `proxy.ts` enforces it so the
 * destination refuses anyway. Hiding a link is presentation; the refusal is the
 * rule. Two tables would let those disagree, and the one that disagrees
 * silently is always the server's.
 *
 * Pure and dependency-free on purpose: `server/` carries `import "server-only"`
 * and is unreachable from Vitest, and this is exactly the kind of table that
 * has to be tested rather than reasoned about.
 */

const EVERYONE: readonly AppRole[] = APP_ROLES;
const STAFF: readonly AppRole[] = ["administrator", "teacher"];
const ADMIN: readonly AppRole[] = ["administrator"];
const EVALUATORS: readonly AppRole[] = ["administrator", "teacher", "ta"];

/** Nobody - an explicit empty list, so a locked rule does not read as a typo. */
const NOBODY: readonly AppRole[] = [];

export interface AccessRule {
  /** Matches this path exactly, or any path beneath it. */
  prefix: string;
  /** Roles that may read it. A page view is a read. */
  read: readonly AppRole[];
  /** Roles that may change it. Defaults to `read` where it is absent. */
  write?: readonly AppRole[];
  /**
   * Roles that may reach a **record beneath** this prefix when that record is
   * their own.
   *
   * This is the one thing a path-to-role table cannot decide by itself: access
   * depends on *which* record the path names, and the edge has no way to know
   * whose it is. So an `owner` entry means precisely **"let this role past the
   * edge and make something downstream compare the ids"** - never "allow it".
   *
   * The collection itself is never included. `/students` stays staff-only and
   * only `/students/<id>` is reachable, because a student who could list every
   * profile has been handed the directory the ownership rule exists to prevent.
   *
   * **Adding a prefix here is a promise.** Every page and every handler beneath
   * it must assert ownership itself - `requireOwnStudent` in
   * `server/principal.ts` is the one for the two prefixes that carry it today.
   * Nothing in this file can check that the promise was kept, which is recorded
   * as `AUD-026`.
   */
  owner?: readonly AppRole[];
  /**
   * Verbs an owner may use on their own record. Reads only where it is absent.
   *
   * Spelled out rather than inherited from `write`, so the verbs an owner does
   * *not* get are visible in the table. `DELETE` is the live case: a student
   * may edit their own profile and may not delete it, and that distinction
   * belongs here rather than inside a handler nobody re-reads.
   */
  ownerMethods?: readonly string[];
}

/** Verbs that only read. A page view is one of these. */
const READ_METHODS: readonly string[] = ["GET", "HEAD"];

/** What an owner may do to their own record: read it and edit it, never remove it. */
const OWNER_EDIT: readonly string[] = ["GET", "HEAD", "PATCH"];

/**
 * Pages.
 *
 * The shape of it: an administrator runs the school, a teacher works inside
 * their courses, a TA helps run an evaluation, a student answers one.
 *
 * Two deliberate calls worth stating rather than leaving to be inferred:
 *
 * - **Dashboard is open to everyone.** It carries active courses, the current
 *   semester, enrollment and evaluation progress - no revenue, no cost, no
 *   invoice. Had it carried money it would be staff-only, and that is the test
 *   to re-run if a card is ever added to it.
 * - **Develop is open to everyone.** The design system and the system guide are
 *   the tooling PRIME is built from rather than part of the school, and this is
 *   a portfolio piece whose showcase should never be behind a role.
 */
export const PAGE_ACCESS: readonly AccessRule[] = [
  { prefix: "/", read: EVERYONE },
  { prefix: "/dashboard", read: EVERYONE },
  // Where a refusal lands. Open to everyone by necessity, not by preference:
  // a deny page that denies itself is an infinite redirect.
  { prefix: "/no-access", read: EVERYONE },

  { prefix: "/programs", read: ADMIN },
  { prefix: "/courses", read: STAFF, write: ADMIN },
  { prefix: "/semesters", read: ADMIN },

  { prefix: "/enrollment", read: ADMIN },
  // The list is staff-only; a student reaches their own profile and nobody
  // else's. `owner` lets them past the edge and `requireOwnStudent` decides.
  { prefix: "/students", read: STAFF, write: ADMIN, owner: ["student"] },

  { prefix: "/costs", read: ADMIN },
  { prefix: "/invoices", read: ADMIN },

  // Longest prefix wins, so /evaluation/manage is decided by its own rule and
  // /evaluation keeps the queue open to the person who has to fill it in.
  { prefix: "/evaluation", read: EVERYONE },
  { prefix: "/evaluation/manage", read: EVALUATORS, write: STAFF },

  { prefix: "/reports", read: STAFF },
  // A student opens their own reports and nobody else's. Longest prefix wins,
  // so this rule owns `/reports/students/<id>` while `/reports` above keeps the
  // picker and the results table staff-only - and `requireOwnStudent` is what
  // decides whose record the id names.
  { prefix: "/reports/students", read: STAFF, owner: ["student"] },

  { prefix: "/design-system", read: EVERYONE },
  { prefix: "/system-guide", read: EVERYONE },
];

/**
 * The BFF.
 *
 * Mirrors the pages, because a route that renders a screen and the endpoint
 * that fills it have to agree - a page a role can open and an endpoint that
 * refuses it is a loading spinner that never resolves.
 *
 * Where they differ, it is the write column. A TA reads Manage Evaluation to
 * see who still owes work and changes nothing; a teacher reads a student
 * profile and an administrator edits it.
 */
export const API_ACCESS: readonly AccessRule[] = [
  // Signing in has to work before there is anyone to check.
  { prefix: "/api/session", read: EVERYONE, write: EVERYONE },
  { prefix: "/api/personas", read: EVERYONE },

  { prefix: "/api/programs", read: ADMIN },
  // Its own resource since 2026-09-21, when `/api/programs` became the
  // programs. The allowlist falls closed, so a new prefix with no rule is
  // denied to everybody - including the administrator.
  { prefix: "/api/program-terms", read: ADMIN },
  { prefix: "/api/courses", read: STAFF, write: ADMIN },
  { prefix: "/api/semesters", read: ADMIN },

  { prefix: "/api/enrollment", read: ADMIN },
  // A student reads and edits their own record - the user's call on
  // 2026-09-16, recorded in direction.md §3a with what it costs. Never DELETE:
  // editing a profile and removing one are different acts.
  {
    prefix: "/api/students",
    read: STAFF,
    write: ADMIN,
    owner: ["student"],
    ownerMethods: OWNER_EDIT,
  },

  { prefix: "/api/costs", read: ADMIN },
  { prefix: "/api/program-costs", read: ADMIN },
  { prefix: "/api/cost-catalog", read: ADMIN },
  { prefix: "/api/invoices", read: ADMIN },

  // Read by everyone, changed by staff. A TA helps run an evaluation and
  // watches who still owes work; they do not reconfigure the blend.
  //
  // When submission contracts land (scaffold.md §33) a submission is a write by
  // the person being asked, so it needs its own rule at its own prefix rather
  // than a widening of this one.
  { prefix: "/api/evaluation", read: EVERYONE, write: STAFF },
  // A student's own queue. Read-only by nature: it lists what you owe.
  { prefix: "/api/evaluation/queue", read: EVERYONE, write: NOBODY },
  { prefix: "/api/questions", read: STAFF, write: ADMIN },
];

/**
 * The rule that owns a path - longest matching prefix, the same resolution
 * `findActiveNavItem` uses for navigation.
 *
 * Returns nothing where no rule matches, and every caller treats that as
 * **deny**. An allowlist that falls open on an unlisted path is not an
 * allowlist; a route added without a rule should stop working loudly rather
 * than serve everybody quietly.
 */
export function ruleFor(
  rules: readonly AccessRule[],
  path: string,
): AccessRule | undefined {
  const normalized = normalize(path);

  return rules
    .filter((rule) => {
      // The root rule matches the root and nothing else. Treating it as a
      // prefix would make it match every path, and since it is also the
      // shortest it would be the fallback for anything unlisted - turning the
      // allowlist above into an allow-all with extra steps.
      if (rule.prefix === "/") return normalized === "/";
      return normalized === rule.prefix || normalized.startsWith(`${rule.prefix}/`);
    })
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

/** Whether this role may open this page. */
export function canOpenPath(role: AppRole, path: string): boolean {
  const rule = ruleFor(PAGE_ACCESS, path);
  return rule ? rule.read.includes(role) : false;
}

/**
 * Whether this role may make this call.
 *
 * `GET` and `HEAD` are reads; everything else changes something and is checked
 * against the write column. The method matters because the difference between
 * a TA and a teacher on the same screen is entirely which verbs they may send.
 */
export function canCallApi(role: AppRole, path: string, method: string): boolean {
  const rule = ruleFor(API_ACCESS, path);
  if (!rule) return false;

  const reading = READ_METHODS.includes(method);
  const allowed = reading ? rule.read : (rule.write ?? rule.read);
  return allowed.includes(role);
}

/**
 * Whether this role may reach this path *as the owner of the record it names*.
 *
 * True means "the edge cannot refuse this, and cannot allow it either" - the
 * request goes through and something downstream compares the ids. It is
 * deliberately a separate function from `canOpenPath` and `canCallApi` rather
 * than a widening of them, because the two answers are not the same kind of
 * answer and a caller that conflates them has granted access it never checked.
 *
 * Two guards make it narrow:
 *
 *   - the path must be **strictly deeper** than the prefix, so `/students`
 *     stays the staff-only collection while `/students/<id>` is reachable;
 *   - the verb must be one the rule grants an owner, which is reads unless the
 *     rule says otherwise.
 */
export function mayPassAsOwner(
  rules: readonly AccessRule[],
  role: AppRole,
  path: string,
  method = "GET",
): boolean {
  const rule = ruleFor(rules, path);
  if (!rule?.owner?.includes(role)) return false;

  const normalized = normalize(path);
  // A record beneath the collection, never the collection itself.
  if (!normalized.startsWith(`${rule.prefix}/`)) return false;

  return (rule.ownerMethods ?? READ_METHODS).includes(method);
}

/**
 * Where a role lands after signing in.
 *
 * The first page in the table they can actually open, rather than a constant:
 * a landing page nobody has checked against the rules is how a sign-in ends on
 * a redirect loop.
 */
export function landingPathFor(role: AppRole): string {
  if (role === "student" || role === "ta") return "/evaluation";
  return "/dashboard";
}

/** Whether a string names an app role. Every cookie read goes through this. */
export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* The demo session cookie                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Name of the cookie holding the demo principal.
 *
 * Its value is `<role>:<accountId>` - two opaque tokens, no personal data and
 * nothing secret, because it is not a credential. A real session would carry a
 * signed, opaque identifier and the server would look the subject up; this one
 * is self-asserted by design and every reader of it says so.
 */
export const PRINCIPAL_COOKIE = "prime_demo_principal";

/**
 * The role each demo account holds.
 *
 * Here rather than in `server/services/account-service.ts` because `proxy.ts`
 * has to check it and cannot load the seed - and because without it the two
 * halves of the cookie were never checked against each other at the only place
 * that enforces anything. A hand-written `administrator:acc-student` was
 * accepted as an administrator: the role parsed, the id matched the character
 * allowlist, and nothing asked whether they belonged together. Found by probing
 * the running server on 2026-09-16, not by the type checker.
 *
 * The account service builds its ids from this map, so a new account cannot
 * exist without a role the proxy knows about.
 */
export const DEMO_ACCOUNT_ROLES: Readonly<Record<string, AppRole>> = {
  "acc-registrar": "administrator",
  "acc-teacher": "teacher",
  "acc-ta": "ta",
  "acc-student": "student",
};

export function formatPrincipalCookie(role: AppRole, accountId: string): string {
  return `${role}:${accountId}`;
}

/**
 * Read a cookie value as a role and an account id.
 *
 * Three checks, and the third is the one that matters: the role has to be the
 * role that account actually holds. The first two - a known role, a
 * conservative character allowlist on the id - each validate one half of a
 * claim whose halves can disagree.
 *
 * The check lives here rather than at the call sites because there are two of
 * them, `proxy.ts` and `resolvePrincipal`, and only one of them enforces
 * anything. A rule that has to be remembered by the enforcing caller is a rule
 * that is eventually not.
 *
 * The cookie is client-supplied data throughout. Anything that does not parse
 * is nobody, never a default.
 */
export function parsePrincipalCookie(
  value: string | undefined,
): { role: AppRole; accountId: string } | undefined {
  if (!value) return undefined;

  const separator = value.indexOf(":");
  if (separator < 1) return undefined;

  const role = value.slice(0, separator);
  const accountId = value.slice(separator + 1);

  if (!isAppRole(role)) return undefined;
  if (!/^[a-z0-9-]{1,64}$/i.test(accountId)) return undefined;
  if (DEMO_ACCOUNT_ROLES[accountId] !== role) return undefined;

  return { role, accountId };
}

/**
 * Where to go after signing in.
 *
 * Only a path within this application is accepted - it has to start with a
 * single slash and carry no scheme and no host. `//evil.example` is a
 * protocol-relative URL a browser will happily leave the site for, and a "where
 * were you going" parameter that is trusted is the whole of an open redirect.
 *
 * Lives here rather than beside the fetch helpers because it is the same kind
 * of decision as the table above - what a request is allowed to reach - and
 * because a rule like this is worth testing, which anything importing the
 * transport is not.
 */
export function safeReturnPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  // Protocol-relative (`//host`) and backslash variants browsers normalize into
  // one. Both leave the site while looking like a path.
  if (value.startsWith("//") || value.includes("\\")) return fallback;
  if (value.includes("://")) return fallback;
  return value;
}

/** Trailing slashes are not a different page. */
function normalize(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}
