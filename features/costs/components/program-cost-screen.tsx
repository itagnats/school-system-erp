"use client";

import { useState } from "react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HttpError } from "@/lib/api";
import { queryKeys } from "@/lib/constants";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { COST_STATUS_LABEL, COST_STATUS_TONE } from "../constants";
import {
  useProgramCostSheet,
  useUpdateProgramCostSheet,
} from "../hooks/use-program-cost-sheet";
import { SheetGroupsPanel } from "./sheet-groups-panel";
import type { ProgramCostSheetDetailResponse } from "../types";

/**
 * The programme term's cost sheet (direction.md §11-13).
 *
 * The screen the whole revision was for. Indirect costs are entered once here
 * and shared across the curriculum by credit hours; the distribution table
 * below is the arithmetic, shown rather than asserted (§13).
 *
 * Both halves read one cached sheet. The markup form and the line tables are
 * different mutations, and two local copies would let the distribution and the
 * totals disagree about what is on the sheet — the same trap the course sheet
 * hit when its two panels each held `mutation.data ?? initial`.
 */
export function ProgramCostScreen({
  initial,
}: Readonly<{ initial: ProgramCostSheetDetailResponse }>) {
  const { data: detail } = useProgramCostSheet(initial.programTermId, initial);
  const mutation = useUpdateProgramCostSheet(initial.programTermId);
  const { sheet, breakdown: b } = detail;

  const money = (value: number) => formatCurrency(value, sheet.currency);

  const [markup, setMarkup] = useState(String(sheet.markupPercent));
  const [step, setStep] = useState(String(sheet.priceRoundingStep));

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  return (
    <>
      <Section
        title="How the programme cost is reached"
        description="Indirect costs are borne once by the term and shared across the curriculum by credit hours; each course adds its own direct costs on top."
        actions={
          <StatusBadge
            tone={COST_STATUS_TONE[sheet.status]}
            label={COST_STATUS_LABEL[sheet.status]}
          />
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure
            label="Indirect pool"
            value={money(b.indirectTotal)}
            hint="Entered below, once for the whole term."
            strong
          />
          <Figure
            label="Direct costs, all courses"
            value={money(b.directTotal)}
            hint="Each course's own sheet, summed."
          />
          <Figure
            label={`Markup, ${formatPercent(b.markupPercent)}`}
            value={money(b.markupAmount)}
          />
          <Figure label="Total programme cost" value={money(b.totalCost)} strong />
        </dl>

        <div className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-3">
          <Figure label="Students on the programme" value={String(b.studentCount)} />
          <Figure
            label="Cost per student"
            value={
              b.costPerStudent === null ? "Nobody enrolled" : money(b.costPerStudent)
            }
            hint="The whole curriculum, per head."
            strong
          />
          <Figure
            label="Preferred price"
            value={b.preferredPrice === null ? "Nobody enrolled" : money(b.preferredPrice)}
            hint={
              b.roundingGain === null
                ? undefined
                : `${money(b.roundingGain)} over cost, rounded up to the nearest ${formatNumber(b.priceRoundingStep)}. Package price is ${money(detail.packagePrice)}.`
            }
            strong
          />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              markupPercent: Number(markup),
              priceRoundingStep: Number(step),
            });
          }}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4"
          data-print="hide"
        >
          <NumberField
            id="markupPercent"
            label="Markup %"
            value={markup}
            onChange={setMarkup}
            error={fieldErrors?.markupPercent}
          />
          <NumberField
            id="priceRoundingStep"
            label="Round price to"
            value={step}
            onChange={setStep}
            error={fieldErrors?.priceRoundingStep}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="driver">Driver</Label>
            {/*
              A disabled control rather than a hidden one. Credits is the only
              driver, and saying so on the screen is what makes the split
              explicable; hiding it would leave a reader wondering what decided
              the shares below.
            */}
            <Input id="driver" value="Credit hours" disabled className="w-36" />
          </div>
          <Button type="submit" size="sm" loading={mutation.isPending}>
            Recalculate
          </Button>
          <p className="text-xs text-muted-foreground">
            The server recomputes every share below. Nothing is stored.
          </p>
        </form>
      </Section>

      <Section
        title="How it reaches each course"
        description={`The pool over ${formatNumber(
          b.courses.reduce((sum, c) => sum + c.credits, 0),
        )} credit hours. The shares total the pool exactly, by construction rather than by luck.`}
        className="mt-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline text-left text-muted-foreground">
                <th scope="col" className="py-1.5 pr-2 font-normal">
                  Course
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Credits
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Share
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Direct
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Indirect
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Total
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  Per student
                </th>
              </tr>
            </thead>
            <tbody>
              {b.courses.map((course) => (
                <tr key={course.courseId} className="border-b border-hairline/60">
                  <td className="py-1.5 pr-2">
                    <span className="font-medium">{course.courseCode}</span>
                    <span className="ml-2 text-muted-foreground">
                      {course.courseName}
                    </span>
                    {b.coursesMissingCostSheet.includes(course.courseId) ? (
                      // Unknown, never zero (§13a). It still takes its share —
                      // the room was booked for it — but nobody has stated its
                      // direct cost.
                      <span className="ml-2 text-warning-soft-foreground">
                        no direct cost sheet
                      </span>
                    ) : null}
                  </td>
                  <td
                    className="py-1.5 pr-2 text-right text-muted-foreground"
                    data-numeric
                  >
                    {course.credits}
                  </td>
                  <td className="py-1.5 pr-2 text-right" data-numeric>
                    {course.sharePercent === null
                      ? "—"
                      : formatPercent(course.sharePercent)}
                  </td>
                  <td
                    className="py-1.5 pr-2 text-right text-muted-foreground"
                    data-numeric
                  >
                    {money(course.directTotal)}
                  </td>
                  <td className="py-1.5 pr-2 text-right" data-numeric>
                    {money(course.indirectShare)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-medium" data-numeric>
                    {money(course.totalCost)}
                  </td>
                  <td className="py-1.5 text-right" data-numeric>
                    {course.costPerStudent === null
                      ? "No students"
                      : money(course.costPerStudent)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* The row that makes the claim checkable rather than asserted. */}
              <tr className="border-t border-hairline font-medium">
                <td className="py-2 pr-2">Totals</td>
                <td className="py-2 pr-2 text-right" data-numeric>
                  {b.courses.reduce((sum, c) => sum + c.credits, 0)}
                </td>
                <td className="py-2 pr-2 text-right" data-numeric>
                  100%
                </td>
                <td className="py-2 pr-2 text-right" data-numeric>
                  {money(b.directTotal)}
                </td>
                <td className="py-2 pr-2 text-right" data-numeric>
                  {money(b.indirectTotal)}
                </td>
                <td className="py-2 pr-2 text-right" data-numeric>
                  {money(b.totalCost)}
                </td>
                <td className="py-2 text-right" data-numeric>
                  {b.costPerStudent === null ? "—" : money(b.costPerStudent)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <SheetGroupsPanel
        sheetId={sheet.id}
        currency={sheet.currency}
        kind="indirect"
        groups={sheet.groups}
        breakdowns={b.indirectGroups}
        drift={detail.drift}
        detailKey={queryKeys.programCosts.detail(detail.programTermId)}
      />
    </>
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
        className={
          strong ? "text-lg font-semibold text-foreground" : "text-base text-foreground"
        }
        data-numeric
      >
        {value}
      </dd>
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
