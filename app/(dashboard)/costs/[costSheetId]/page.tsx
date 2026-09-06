import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Section, StatusBadge } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COST_KIND_LABEL, COST_STATUS_LABEL, COST_STATUS_TONE } from "@/features/costs/constants";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
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
 * Server-rendered from the service directly: there is nothing to interact with,
 * and it has to print. The whole point of this screen is that the arithmetic is
 * visible - every operand of every step is on the page, so a reader can check
 * the total rather than take it on trust.
 */
export default async function Page({ params }: PageParams) {
  const { costSheetId } = await params;
  const detail = getCostSheet(costSheetId);
  if (!detail) notFound();

  const { sheet, courseCode, courseName, breakdown } = detail;
  const money = (value: number) => formatCurrency(value, sheet.currency);

  return (
    <>
      <PageHeader
        title={`${courseCode} cost sheet`}
        description={`${courseName} - ${sheet.semesterCode}`}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={COST_STATUS_TONE[sheet.status]}
              label={COST_STATUS_LABEL[sheet.status]}
            />
            <span className="text-xs text-muted-foreground">
              Updated {formatDate(sheet.updatedAt)}
            </span>
          </div>
        }
      />

      <Section
        title="How the total is reached"
        description="Direct plus shared makes the course total; the total divided by head count makes the cost per student."
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CostFigure label="Direct costs" value={money(breakdown.directTotal)} />
          <CostFigure label="Shared costs, after allocation" value={money(breakdown.sharedTotal)} />
          <CostFigure label="Subtotal" value={money(breakdown.subtotal)} />
          <CostFigure
            label={`Markup, ${formatPercent(sheet.markupPercent)}`}
            value={money(breakdown.markupAmount)}
          />
        </dl>

        <div className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-3">
          <CostFigure label="Total course cost" value={money(breakdown.totalCost)} strong />
          <CostFigure label="Students" value={String(breakdown.studentCount)} />
          <CostFigure
            label="Cost per student"
            value={
              breakdown.costPerStudent === null
                ? "No students enrolled"
                : money(breakdown.costPerStudent)
            }
            strong
          />
        </div>
      </Section>

      {breakdown.groups.map((group) => (
        <Section
          key={group.groupId}
          title={group.groupName}
          description={`${money(group.total)} - ${formatPercent(group.sharePercent)} of the total course cost`}
          flush
          className="mt-4"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
                <TableHead>Item</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Allocation</TableHead>
                <TableHead className="text-right">Charged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.items.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {COST_KIND_LABEL[item.kind]}
                  </TableCell>
                  <TableCell className="text-right" data-numeric>
                    {money(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right" data-numeric>
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground" data-numeric>
                    {money(item.gross)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground" data-numeric>
                    {formatPercent(item.allocationPercent)}
                  </TableCell>
                  <TableCell className="text-right font-medium" data-numeric>
                    {money(item.allocated)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      ))}
    </>
  );
}

function CostFigure({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={strong ? "text-lg font-semibold text-foreground" : "text-base text-foreground"}
        data-numeric
      >
        {value}
      </dd>
    </div>
  );
}
