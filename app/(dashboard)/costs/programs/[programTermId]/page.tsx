import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ProgramCostScreen } from "@/features/costs/components/program-cost-screen";
import { ProgramProfitPanel } from "@/features/costs/components/program-profit-panel";
import { routes } from "@/lib/constants";
import { getProgramCostSheetByTerm, programProfitFor } from "@/server/services";

interface PageParams {
  params: Promise<{ programTermId: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<PageParams>): Promise<Metadata> {
  const { programTermId } = await params;
  const detail = getProgramCostSheetByTerm(programTermId);
  return {
    title: detail
      ? `${detail.programCode} ${detail.semesterCode} costs`
      : "Program costs",
  };
}

/**
 * The indirect cost sheet for one program term (direction.md 11, 13).
 *
 * A server component reading the service directly - no HTTP hop for data it can
 * already reach. The screen below is a client component only so the markup, the
 * rounding step and the sheet's own lines can be changed, and it opens with the
 * server-rendered figures rather than a spinner.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { programTermId } = await params;
  const detail = getProgramCostSheetByTerm(programTermId);
  if (!detail) notFound();
  // What the term earned, which moved here from the curriculum screen on
  // 2026-09-20 (direction.md 13a). Read separately from the cost sheet
  // because it is a different join - invoices and the roster, not sheet lines.
  const profit = programProfitFor(programTermId);

  return (
    <>
      <PageHeader
        title={`${detail.programCode} - ${detail.semesterCode}`}
        description="What this term earned against what it cost, and how the indirect pool reaches each course."
        meta={
          <Link
            href={routes.programTerm(detail.programId, programTermId)}
            className="rounded-sm text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {detail.programName}
          </Link>
        }
      />
      {profit ? <ProgramProfitPanel profit={profit} /> : null}
      <ProgramCostScreen initial={detail} />
    </>
  );
}
