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
 */
export function findActiveNavItem(pathname: string): NavItem | undefined {
  const matches = NAV_ITEMS.filter((item) => {
    if (pathname === item.href) return true;
    if (pathname.startsWith(`${item.href}/`)) return true;
    return item.matchPrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  });
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}
