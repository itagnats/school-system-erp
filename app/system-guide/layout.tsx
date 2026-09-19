import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { requirePrincipal } from "@/server/principal";

/**
 * The system guide lives outside the (dashboard) route group but inside the
 * same shell, for the same reason the design system does: what it documents is
 * shown in its real context.
 */
export default async function SystemGuideLayout({ children }: { children: ReactNode }) {
  const principal = await requirePrincipal();

  return <AppShell principal={principal}>{children}</AppShell>;
}
