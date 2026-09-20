import { Section } from "@/components/shared";
import { breakEvenPrice } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProgramProfit } from "@/types";
import { profitToneClass } from "../constants";

/**
 * What a program term earned, against what it cost (direction.md §13a).
 *
 * Moved here from `features/programs/` on 2026-09-20. It lived on the
 * curriculum screen, where repricing showed the margin move underneath it —
 * good demo, wrong menu. The Academic screens now describe the offer and this
 * is where it is judged, so the package price and its consequence sit one
 * click apart rather than in one panel.
 *
 * A server component: every figure arrives computed, and shipping the
 * calculation to the browser would buy nothing.
 *
 * **The cost here is the attributed cost**, not the program cost sheet total
 * shown above it on this page. The sheet total is direct + indirect + markup
 * for the whole term; the attributed cost charges each curriculum course at
 * its own cost per student for the members who actually took it, which is the
 * basis §13a defines profit on. They are different numbers on purpose, and the
 * labels say which is which.
 */
export function ProgramProfitPanel({
  profit,
}: Readonly<{ profit: ProgramProfit }>) {
  const money = (value: number) => formatCurrency(value, profit.currency);
  const breakEven = breakEvenPrice(profit);

  return (
    <Section
      className="mt-4"
      title="Revenue against cost"
      description="Revenue is what the invoices say, not what the price implies. Cost is each course charged at its own cost per student, for the students from this program who actually took it."
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Package price" value={money(profit.packagePrice)} />
        <Figure label="Students enrolled" value={String(profit.enrolledCount)} />
        <Figure
          label="List revenue"
          value={money(profit.listRevenue)}
          hint="Package price x head count"
        />
        <Figure
          label="Invoiced"
          value={money(profit.revenue)}
          hint={`${profit.invoiceCount} invoice${profit.invoiceCount === 1 ? "" : "s"}`}
        />
      </dl>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          label="Collected"
          value={money(profit.collected)}
          hint={`${profit.paidCount} paid`}
        />
        <Figure
          label="Outstanding"
          value={money(profit.outstanding)}
          hint={profit.overdueCount > 0 ? `${profit.overdueCount} overdue` : "None overdue"}
          className={profit.overdueCount > 0 ? "text-warning-soft-foreground" : undefined}
        />
        <Figure
          label="Attributed cost"
          value={money(profit.totalCost)}
          hint="Per course, for the members who took it"
        />
        <Figure
          label="Break-even package price"
          value={breakEven === null ? "Nobody enrolled" : money(breakEven)}
        />
      </dl>

      {profit.coursesMissingCostSheet > 0 ? (
        // An incomplete total is a different claim from a complete one, and
        // saying so is worth more than a tidier number.
        <p className="mt-3 text-xs text-warning-soft-foreground">
          {profit.coursesMissingCostSheet} course
          {profit.coursesMissingCostSheet === 1 ? " has" : "s have"} no cost sheet this
          semester, so the attributed cost is lower than the real one.
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-2">
        <Figure
          label="Net profit, on collected"
          value={money(profit.netProfit)}
          strong
          className={profitToneClass(profit.netProfit)}
        />
        <Figure
          label="Margin, on collected"
          value={
            profit.marginPercent === null
              ? "Nothing collected"
              : formatPercent(profit.marginPercent, 1)
          }
          strong
          className={
            profit.marginPercent === null ? undefined : profitToneClass(profit.marginPercent)
          }
        />
      </dl>

      <BillingNote profit={profit} />
    </Section>
  );
}

/**
 * Why a figure above is not the claim it looks like.
 *
 * A term whose invoices are still drafts has billed nothing, and one that has
 * billed but collected nothing is not loss-making — it is early. Both read as
 * failure without a sentence saying otherwise.
 */
function BillingNote({ profit }: Readonly<{ profit: ProgramProfit }>) {
  if (profit.invoiceCount > 0 && profit.revenue === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        This term&apos;s invoices are still drafts, so nothing has been billed.
        List revenue is what it would come to.
      </p>
    );
  }

  if (profit.collected === 0 && profit.revenue > 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Nothing has been collected on this term yet, so net profit is the cost
        carried so far rather than a result.
      </p>
    );
  }

  return null;
}

function Figure({
  label,
  value,
  strong = false,
  className,
  hint,
}: Readonly<{
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
  /** How the figure was reached, or what it counts. Shown under the value. */
  hint?: string;
}>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={[
          strong ? "text-lg font-semibold" : "text-base",
          className ?? "text-foreground",
        ].join(" ")}
        data-numeric
      >
        {value}
      </dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}
