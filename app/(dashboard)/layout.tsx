import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { requirePrincipal } from "@/server/principal";

/**
 * Route group for everything inside the application shell. The group has no
 * URL segment, so /dashboard and /courses both render inside this layout.
 *
 * The principal is resolved here rather than in every page (direction.md 3a),
 * which is also what keeps it off the client: the shell receives it as props
 * from the server, so no identity is shipped to the browser to be read back.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const principal = await requirePrincipal();

  return <AppShell principal={principal}>{children}</AppShell>;
}
