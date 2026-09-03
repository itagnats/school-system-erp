import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Cost Sheet" };

export default async function Page({ params }: PageProps<"/costs/[costSheetId]">) {
  const { costSheetId } = await params;

  return (
    <>
      <PageHeader title="Cost Sheet" description={`Record: ${costSheetId}`} />
      <ScaffoldPlaceholder
        module="Cost Management"
        summary="Cost groups, items, options and the per-student calculation."
        spec="direction.md §12-13"
      />
    </>
  );
}
