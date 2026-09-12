import type { Metadata } from "next";
import { PageHeader } from "@/components/shared";
import { CatalogueScreen } from "@/features/cost-catalogue/components/catalogue-screen";

export const metadata: Metadata = { title: "Cost catalogue" };

/**
 * The master cost catalogue (direction.md §12a).
 *
 * A static segment under `/costs`, so it resolves ahead of `/costs/[costSheetId]`
 * rather than being read as a sheet id.
 *
 * The screen is a client component throughout: it is a maintenance surface whose
 * every row can be edited, so there is no meaningful server-rendered first paint
 * to preserve — unlike a sheet or a report, which open as documents.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="Cost catalogue"
        description="Master cost groups and the items inside them. A sheet copies from here; it never reads through to it."
      />
      <CatalogueScreen />
    </>
  );
}
