import type { Metadata } from "next";
import { PageHeader } from "@/components/shared";
import { DashboardScreen } from "@/features/dashboard/components/dashboard-screen";
import { dashboardSummary } from "@/server/services";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The landing page.
 *
 * A server component reading the service directly. There is nothing to filter,
 * sort or page here, so routing the read through `/api` would add a network hop
 * to fetch the application's own memory — the split the README sets out, and
 * the reason interactive list screens take the other path.
 *
 * No Suspense boundary: the read is synchronous and there are no search params
 * to wait for, so the page prerenders whole.
 */
export default function Page() {
  const summary = dashboardSummary();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Active courses, the current semester, enrollment and evaluation progress at a glance."
      />
      <DashboardScreen summary={summary} />
    </>
  );
}
