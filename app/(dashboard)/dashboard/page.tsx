import type { Metadata } from "next";
import { PageHeader } from "@/components/shared";
import { DashboardScreen } from "@/features/dashboard/components/dashboard-screen";
import { StudentDashboardScreen } from "@/features/dashboard/components/student-dashboard-screen";
import { requirePrincipal } from "@/server/principal";
import { dashboardSummary, studentDashboard } from "@/server/services";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The landing page.
 *
 * A server component reading the service directly. There is nothing to filter,
 * sort or page here, so routing the read through `/api` would add a network hop
 * to fetch the application's own memory — the split the README sets out, and
 * the reason interactive list screens take the other path.
 *
 * **Two dashboards, chosen by role** (direction.md §3a). A student gets their
 * own record; everybody else gets the school. They are separate screens rather
 * than one screen with panels removed, because they answer different questions
 * — and because the shared version was a page of dead ends for a student, every
 * link on it pointing at a route their role refuses.
 *
 * The staff screen takes the role as well, for the same reason at a smaller
 * scale: a TA cannot open Courses or Semesters either, so the links have to
 * know who is reading them.
 */
export default async function Page() {
  const principal = await requirePrincipal();

  if (principal.role === "student") {
    const summary = studentDashboard(principal.studentId ?? "", principal.personaId);

    return (
      <>
        <PageHeader
          title={summary.student ? summary.student.fullName : "Dashboard"}
          description={
            summary.student
              ? `${summary.student.studentId} · ${summary.student.program} · ${summary.student.major}`
              : "Your courses and what you have been asked to assess."
          }
        />
        <StudentDashboardScreen summary={summary} />
      </>
    );
  }

  const summary = dashboardSummary();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Active courses, the current semester, enrollment and evaluation progress at a glance."
      />
      <DashboardScreen summary={summary} role={principal.role} />
    </>
  );
}
