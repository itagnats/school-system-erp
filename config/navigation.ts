import { PAGE_ACCESS, canOpenPath, mayPassAsOwner } from "@/lib/access";
import { routes } from "@/lib/constants";
import type { AppRole } from "@/types/identity";
import {
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  Compass,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Library,
  Receipt,
  Settings2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Also mark this item active for these path prefixes (detail routes). */
  matchPrefixes?: string[];
}

export interface NavSection {
  /** Absent for the top-level group that needs no heading. */
  label?: string;
  items: NavItem[];
}

/**
 * Sidebar structure from direction.md §3. This is the single source of truth
 * for navigation: the sidebar, the mobile drawer and the breadcrumb labels all
 * read it, so a route added here appears in every one of them.
 */
export const NAVIGATION: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Academic",
    items: [
      { label: "Curriculum", href: "/programs", icon: GraduationCap },
      { label: "Courses", href: "/courses", icon: BookOpen },
      { label: "Semesters", href: "/semesters", icon: CalendarRange },
    ],
  },
  {
    label: "Students",
    items: [
      { label: "Enrollment", href: "/enrollment", icon: UserPlus },
      { label: "Student Profiles", href: "/students", icon: Users },
    ],
  },
  {
    label: "Cost Management",
    // Cost and billing are the two sides of the money: a sheet says what
    // delivery cost, an invoice says who owes for it (direction.md §13a, §13b).
    items: [
      // The programme term is where a costing is finished, so it leads
      // (direction.md 11, revised 2026-09-16). A course sheet is a
      // contributing part and lists second.
      { label: "Programme Costs", href: "/costs", icon: Receipt },
      { label: "Course Costs", href: "/costs/courses", icon: Receipt },
      { label: "Cost Catalogue", href: "/costs/catalogue", icon: Library },
      { label: "Invoices", href: "/invoices", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Evaluation",
    // Split by perspective rather than by feature. "Manage" is the teacher and
    // administrator view - groups, evaluator assignment, completion, results.
    // "Your Evaluation" is the evaluator's own queue of forms to fill in.
    // Ranking is not a destination: an ordering is something an evaluator
    // submits inside a form, and the computed leaderboard is a result shown
    // under Manage.
    items: [
      { label: "Manage Evaluation", href: "/evaluation/manage", icon: Settings2 },
      { label: "Your Evaluation", href: "/evaluation", icon: ClipboardCheck },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Student Reports", href: "/reports", icon: FileText }],
  },
  {
    // Its own named section rather than an unlabelled tail. The design system
    // is not a feature of the school - it is the tooling the school is built
    // from - and a heading says so where a bare item at the bottom of the list
    // read as one more destination.
    label: "Develop",
    items: [
      { label: "Design System", href: "/design-system", icon: Layers },
      { label: "System Guide", href: "/system-guide", icon: Compass },
    ],
  },
];

/** Flat lookup used by the breadcrumb and the page title. */
export const NAV_ITEMS: NavItem[] = NAVIGATION.flatMap((s) => s.items);

/**
 * Which nav item owns a pathname. Longest matching href wins, so
 * `/evaluation/manage` resolves to Manage Evaluation rather than to Your
 * Evaluation even though both match, and `/courses/IT101` still resolves to
 * Courses.
 *
 * `items` defaults to every item in the table, and the sidebar passes its own
 * filtered list instead. That matters for an item whose href is a record -
 * "My Profile" is `/students/<id>`, which is not in the static table, so a
 * student standing on it would otherwise match `/students` and highlight a link
 * their sidebar does not contain.
 */
export function findActiveNavItem(
  pathname: string,
  items: readonly NavItem[] = NAV_ITEMS,
): NavItem | undefined {
  const matches = items.filter((item) => {
    if (pathname === item.href) return true;
    if (pathname.startsWith(`${item.href}/`)) return true;
    return item.matchPrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  });
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * The sidebar one principal actually gets (direction.md §3a).
 *
 * Two things happen here, and both have to happen in one place or the sidebar
 * and the sign-in cards will disagree about how much of PRIME a role sees:
 *
 *   1. every item the role cannot open is dropped, and a section left with no
 *      items goes with them - an empty heading is worse than no heading;
 *   2. items that exist only for a particular principal are added, which today
 *      is a student's own profile.
 *
 * **The profile item is the reason this takes a principal rather than a role.**
 * Its href is a record id, so it cannot live in the static table above: there
 * is no "/my-profile" route, only `/students/<their id>`, reachable through the
 * owner-scoped rule in `lib/access/policy.ts`. Hiding it from everyone else is
 * courtesy; `requireOwnStudent` is what refuses.
 */
export function navigationFor(principal: {
  role: AppRole;
  studentId?: string;
}): NavSection[] {
  return NAVIGATION.map((section) => {
    const items = withPrincipalItems(section, principal).filter((item) =>
      mayOffer(principal.role, item.href),
    );
    return { ...section, items };
  }).filter((section) => section.items.length > 0);
}

/**
 * Whether a destination is worth offering this role.
 *
 * Both halves of the access table are consulted, and the second is the one that
 * is easy to forget: `canOpenPath` alone refuses every owner-scoped path,
 * because by design it cannot tell whose record the path names. Filtering on it
 * alone dropped the profile item this function had just added - caught by
 * `tests/access/navigation.test.ts` rather than in a browser.
 *
 * Offering is still only courtesy. `requireOwnStudent` is what refuses somebody
 * else's record, and it runs whether or not a link was ever drawn.
 */
function mayOffer(role: AppRole, href: string): boolean {
  return canOpenPath(role, href) || mayPassAsOwner(PAGE_ACCESS, role, href);
}

/**
 * Destinations whose href is a record rather than a route.
 *
 * Each one is appended to the section that already holds the staff view of the
 * same thing - profiles beside Student Profiles, reports beside Student Reports
 * - rather than gathered into a section of their own. They are the same kind of
 * destination, and a heading that repeats its single item reads as a mistake.
 *
 * `anchor` is the staff href that decides which section an item belongs to, so
 * a section renamed or reordered carries its owner item with it.
 *
 * The hrefs come from `routes` rather than being written out. The static items
 * above are string literals, which is `AUD-003`; these two are not, because a
 * record path built by hand in a second place is exactly the drift that finding
 * is about.
 */
const OWNED_ITEMS: ReadonlyArray<{
  anchor: string;
  build: (studentId: string) => NavItem;
}> = [
  {
    anchor: "/students",
    build: (studentId) => ({
      label: "My Profile",
      href: routes.student(studentId),
      icon: Users,
    }),
  },
  {
    anchor: "/reports",
    build: (studentId) => ({
      label: "My Reports",
      href: routes.studentReport(studentId),
      icon: FileText,
    }),
  },
];

/** Items that exist for one principal rather than for a role. */
function withPrincipalItems(
  section: NavSection,
  principal: { role: AppRole; studentId?: string },
): NavItem[] {
  const { role, studentId } = principal;
  if (role !== "student" || !studentId) return section.items;

  const owned = OWNED_ITEMS.filter(({ anchor }) =>
    section.items.some((item) => item.href === anchor),
  ).map(({ build }) => build(studentId));

  return owned.length === 0 ? section.items : [...section.items, ...owned];
}

/**
 * How many of PRIME a principal can reach, for the sign-in cards.
 *
 * Counted from `navigationFor` rather than written down, so the number on the
 * card cannot drift from the sidebar it is describing. Both totals move
 * together when a route is added.
 */
export function navItemCountFor(principal: { role: AppRole; studentId?: string }): number {
  return navigationFor(principal).reduce((total, section) => total + section.items.length, 0);
}

/** Every item any role could see, for a denominator that does not move per role. */
export const NAV_ITEM_TOTAL = NAV_ITEMS.length;
