"use client";

import { useState } from "react";
import Link from "next/link";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HttpError } from "@/lib/api";
import { queryKeys, routes } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { COST_STATUS_LABEL, COST_STATUS_TONE } from "../constants";
import { useUpdateCostSheet } from "../hooks/use-cost-sheet-mutations";
import { useCostSheet } from "../hooks/use-cost-sheets";
import { SheetGroupsPanel } from "./sheet-groups-panel";
import type { CostSheetDetailResponse } from "../types";

/**
 * The cost sheet, with its working shown (direction.md §13).
 *
 * Server-rendered data arrives as `initial`; the panel becomes interactive only
 * so the three inputs the derived figures depend on can be changed - markup,
 * head count, and the step the preferred price rounds up to. Every figure below
 * the form comes back from the server recalculated - none of this arithmetic is
 * repeated in the browser, which is the whole reason the endpoint returns a
 * breakdown rather than an acknowledgment.
 */
export function CostBreakdownPanel({ initial }: Readonly<{ initial: CostSheetDetailResponse }>) {
  const mutation = useUpdateCostSheet(initial.sheet.id);
  // Read through the cache rather than from this mutation's own result: the
  // line tables below are edited by a different mutation, and two local copies
  // of the sheet would disagree about what it contains.
  const { data: detail } = useCostSheet(initial.sheet.id, initial);
  const { sheet, breakdown } = detail;

  const money = (value: number) => formatCurrency(value, sheet.currency);

  const [students, setStudents] = useState(String(sheet.studentCount));

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  return (
    <>
      <Section
        title="How the total is reached"
        description="This course's own direct costs, plus its share of the program's indirect pool, divided by head count."
        actions={
          <StatusBadge
            tone={COST_STATUS_TONE[sheet.status]}
            label={COST_STATUS_LABEL[sheet.status]}
          />
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure
            label="Direct costs"
            value={money(breakdown.directTotal)}
            hint="This course's own — lecturer, materials, TA."
          />
          <Figure
            label="Indirect share"
            value={money(breakdown.indirectShare)}
            hint={
              breakdown.sharePercent === null
                ? "Costed outside any program, so no share of a pool."
                : `${formatPercent(breakdown.sharePercent)} of ${money(detail.indirectTotal)}, by credit hours.`
            }
          />
          <Figure label="Subtotal" value={money(breakdown.subtotal)} />
          <Figure
            label={`Markup, ${formatPercent(detail.markupPercent)}`}
            value={money(breakdown.markupAmount)}
            hint="Set once on the program term."
          />
        </dl>

        <div className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-3">
          <Figure label="Total course cost" value={money(breakdown.totalCost)} strong />
          <Figure label="Students" value={String(breakdown.studentCount)} />
          <Figure
            label="Cost per student"
            value={
              breakdown.costPerStudent === null
                ? "No students enrolled"
                : money(breakdown.costPerStudent)
            }
            hint="What this course costs to run, per head."
            strong
          />
        </div>

        <form
          // Inline so the event type is inferred from the JSX prop. React types
          // deprecate the named FormEvent - "FormEvent does not actually exist"
          // - and naming SyntheticEvent here would be less precise than what
          // inference already gives.
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ studentCount: Number(students) });
          }}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4"
          data-print="hide"
        >
          <NumberField
            id="studentCount"
            label="Students"
            value={students}
            onChange={setStudents}
            error={fieldErrors?.studentCount}
          />
          <Button type="submit" size="sm" loading={mutation.isPending}>
            Recalculate
          </Button>
          <p className="text-xs text-muted-foreground">
            The server recomputes every figure above. Markup and the price
            rounding live on the program term. Nothing is stored.
          </p>
        </form>
      </Section>

      {detail.programTermId ? (
        <p data-print="hide" className="mt-3 text-xs text-muted-foreground">
          The indirect share is set on the program term, not here.{" "}
          <Link
            href={routes.programCost(detail.programTermId)}
            className="rounded-sm underline underline-offset-4"
          >
            Open its cost sheet
          </Link>
          .
        </p>
      ) : null}

      <SheetGroupsPanel
        sheetId={sheet.id}
        currency={sheet.currency}
        kind="direct"
        groups={sheet.groups}
        breakdowns={breakdown.groups}
        drift={detail.drift}
        detailKey={queryKeys.costs.detail(sheet.id)}
      />
    </>
  );
}

function Figure({
  label,
  value,
  hint,
  strong = false,
}: Readonly<{
  label: string;
  value: string;
  /** One line under the figure, for a number that needs saying what it is. */
  hint?: string;
  strong?: boolean;
}>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={strong ? "text-lg font-semibold text-foreground" : "text-base text-foreground"}
        data-numeric
      >
        {value}
      </dd>
      {/* A second <dd>, not a <p>: a <div> inside a <dl> may hold one <dt> and
          several <dd>, and a stray <p> there is invalid. Matches the program
          term panel, which reached the same shape first. */}
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}>) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        className="w-28"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // Wired by hand rather than through the RHF bindings, because this is
        // two controls rather than a form: the pairing still has to be real for
        // a screen reader.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
