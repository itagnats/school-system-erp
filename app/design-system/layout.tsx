import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { requirePrincipal } from "@/server/principal";

/**
 * The design system lives outside the (dashboard) route group but inside the
 * same shell, so what it documents is shown in its real context - which now
 * includes the sidebar the signed-in role actually has.
 */
export default async function DesignSystemLayout({ children }: { children: ReactNode }) {
  const principal = await requirePrincipal();

  return <AppShell principal={principal}>{children}</AppShell>;
}
