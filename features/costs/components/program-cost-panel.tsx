import Link from "next/link";
import { Section, StatusBadge } from "@/components/shared";
import { routes } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProgramCostSheetDetail } from "@/server/services";
import { COST_STATUS_LABEL, COST_STATUS_TONE } from "../constants";

/**
 * The programme term's indirect costs, and how they reach its courses
 * (direction.md §11-13).
 *
 * A server component: nothing here is interactive, and a client component would
 * ship the whole costing to the browser to render figures the server has
 * already computed.
 *
 * A summary only. The per-course distribution is on the cost sheet itself, at
 * `routes.programCost`, rather than rendered here as well: two copies of one
 * table are two chances to disagree about what the shares are.
 */
export function ProgramCostPanel({
  detail,
}: Readonly<{ detail: ProgramCostSheetDetail }>) {
  const { breakdown: b, sheet } = detail;
  const money = (value: number) => formatCurrency(value, sheet.currency);

  return (
    <Section
      className="mt-4"
      title="Indirect costs, and how they are shared"
      description="Borne once by the programme, distributed across the curriculum by credit hours."
      actions={
        <div className="flex items-center gap-3">
          <StatusBadge
            tone={COST_STATUS_TONE[sheet.status]}
            label={COST_STATUS_LABEL[sheet.status]}
          />
          <Link
            href={routes.programCost(detail.programTermId)}
            className="rounded-sm text-xs underline-offset-4 hover:underline"
          >
            Cost sheet
          </Link>
        </div>
      }
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Indirect pool" value={money(b.indirectTotal)} strong />
        <Figure
          label="Direct costs, all courses"
          value={money(b.directTotal)}
          hint="Each course's own, summed."
        />
        <Figure
          label={`Markup, ${formatPercent(b.markupPercent)}`}
          value={money(b.markupAmount)}
        />
        <Figure label="Total programme cost" value={money(b.totalCost)} strong />
      </dl>

      <dl className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-3">
        <Figure label="Students on the programme" value={String(b.studentCount)} />
        <Figure
          label="Cost per student, programme"
          value={b.costPerStudent === null ? "Nobody enrolled" : money(b.costPerStudent)}
          hint="The whole curriculum, per head. Comparable to the package price."
          strong
        />
        <Figure
          label="Preferred price"
          value={b.preferredPrice === null ? "Nobody enrolled" : money(b.preferredPrice)}
          hint={
            b.roundingGain === null
              ? undefined
              : `${money(b.roundingGain)} over cost. Package price is ${money(detail.packagePrice)}.`
          }
          strong
        />
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        {/*
          A summary, not the working. The per-course distribution lives on the
          cost sheet itself rather than being rendered twice - two copies of one
          table are two chances to disagree about what the shares are.
        */}
        Shared across {b.courses.length} course
        {b.courses.length === 1 ? "" : "s"} by credit hours.{" "}
        <Link
          href={routes.programCost(detail.programTermId)}
          className="rounded-sm underline underline-offset-4"
        >
          See the distribution
        </Link>
        .
      </p>
    </Section>
  );
}

function Figure({
  label,
  value,
  hint,
  strong = false,
}: Readonly<{ label: string; value: string; hint?: string; strong?: boolean }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={strong ? "text-lg font-semibold text-foreground" : "text-base text-foreground"}
        data-numeric
      >
        {value}
      </dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}
