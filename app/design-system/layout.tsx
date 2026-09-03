import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";

/**
 * The design system lives outside the (dashboard) route group but inside the
 * same shell, so what it documents is shown in its real context.
 */
export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
