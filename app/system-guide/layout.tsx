import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";

/**
 * The system guide lives outside the (dashboard) route group but inside the
 * same shell, for the same reason the design system does: what it documents is
 * shown in its real context.
 */
export default function SystemGuideLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
