import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ProgramCostScreen } from "@/features/costs/components/program-cost-screen";
import { routes } from "@/lib/constants";
import { getProgramCostSheetByTerm } from "@/server/services";

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

  return (
    <>
      <PageHeader
        title={`${detail.programCode} - ${detail.semesterCode}`}
        description="Indirect costs for the program term, and how they reach each course."
        meta={
          <Link
            href={routes.programTerm(programTermId)}
            className="rounded-sm text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {detail.programName}
          </Link>
        }
      />
      <ProgramCostScreen initial={detail} />
    </>
  );
}
