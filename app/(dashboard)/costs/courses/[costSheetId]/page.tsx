import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CostBreakdownPanel } from "@/features/costs/components/cost-breakdown-panel";
import { formatDate } from "@/lib/utils";
import { getCostSheet } from "@/server/services";

interface PageParams {
  params: Promise<{ costSheetId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { costSheetId } = await params;
  const detail = getCostSheet(costSheetId);
  return { title: detail ? `${detail.courseCode} cost sheet` : "Cost sheet" };
}

/**
 * The cost sheet detail (direction.md §13).
 *
 * The page is a server component and reads the service directly - no HTTP hop
 * for data it can already reach, and the printed report needs no client.
 *
 * The panel below it is a client component so the two inputs that drive the
 * total can be changed, but it opens with the server-rendered figures rather
 * than a spinner: the first paint is complete, and interactivity arrives after.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { costSheetId } = await params;
  const detail = getCostSheet(costSheetId);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={`${detail.courseCode} cost sheet`}
        description={`${detail.courseName} - ${detail.sheet.semesterCode}`}
        meta={
          <span className="text-xs text-muted-foreground">
            Updated {formatDate(detail.sheet.updatedAt)}
          </span>
        }
      />
      <CostBreakdownPanel initial={detail} />
    </>
  );
}
