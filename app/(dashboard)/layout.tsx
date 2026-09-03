import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";

/**
 * Route group for everything inside the application shell. The group has no
 * URL segment, so /dashboard and /courses both render inside this layout.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
