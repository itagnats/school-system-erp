import {
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Layers,
  Receipt,
  Trophy,
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
    items: [{ label: "Cost Sheets", href: "/costs", icon: Receipt }],
  },
  {
    label: "Evaluation",
    items: [
      {
        label: "Evaluation Groups",
        href: "/evaluation/groups",
        icon: Layers,
      },
      { label: "Evaluations", href: "/evaluation", icon: ClipboardCheck },
      { label: "Ranking", href: "/evaluation/ranking", icon: Trophy },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Student Reports", href: "/reports", icon: FileText }],
  },
  {
    items: [{ label: "Design System", href: "/design-system", icon: Layers }],
  },
];

/** Flat lookup used by the breadcrumb and the page title. */
export const NAV_ITEMS: NavItem[] = NAVIGATION.flatMap((s) => s.items);

/**
 * Which nav item owns a pathname. Longest matching href wins, so
 * `/evaluation/ranking` resolves to Ranking rather than to Evaluations even
 * though both match, and `/courses/IT101` still resolves to Courses.
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
