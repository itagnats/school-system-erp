"use client";

import Link from "next/link";
import { useState } from "react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HttpError } from "@/lib/api";
import { breakEvenPrice } from "@/lib/calculations";
import { routes } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TERM_STATUS_LABEL, TERM_STATUS_TONE, profitToneClass } from "../constants";
import { useUpdateProgramTerm } from "../hooks/use-program-terms";
import type { ProgramTermDetailResponse } from "../services/program-service";

/**
 * Revenue against cost for one programme term (direction.md §13a).
 *
 * The pricing control is the point of the screen. Cost is largely fixed by the
 * cost sheets; price is the decision, so the reader should be able to move it
 * and watch the margin move with it. Every figure is recomputed by the server.
 */
export function ProgramTermPanel({
  initial,
}: Readonly<{ initial: ProgramTermDetailResponse }>) {
  const mutation = useUpdateProgramTerm(initial.term.id);
  const detail = mutation.data ?? initial;
  const { term, profit, roster } = detail;

  const money = (value: number) => formatCurrency(value, term.currency);
  const [price, setPrice] = useState(String(term.packagePrice));

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;
  const breakEven = breakEvenPrice(profit);

  return (
    <>
      <Section
        title="Revenue against cost"
        description="Package price times head count is revenue. Cost is each course charged at its own cost per student, for the students from this programme who actually took it."
        actions={
          <StatusBadge tone={TERM_STATUS_TONE[term.status]} label={TERM_STATUS_LABEL[term.status]} />
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Package price" value={money(profit.packagePrice)} />
          <Figure label="Students enrolled" value={String(profit.enrolledCount)} />
          <Figure label="Revenue" value={money(profit.revenue)} />
          <Figure label="Attributed cost" value={money(profit.totalCost)} />
        </dl>

        <div className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-3">
          <Figure
            label="Net profit"
            value={money(profit.netProfit)}
            strong
            className={profitToneClass(profit.netProfit)}
          />
          <Figure
            label="Margin"
            value={profit.marginPercent === null ? "No revenue" : formatPercent(profit.marginPercent, 1)}
            strong
            className={
              profit.marginPercent === null ? undefined : profitToneClass(profit.marginPercent)
            }
          />
          <Figure
            label="Break-even package price"
            value={breakEven === null ? "Nobody enrolled" : money(breakEven)}
          />
        </div>

        {profit.coursesMissingCostSheet > 0 ? (
          // An incomplete total is a different claim from a complete one, and
          // saying so is worth more than a tidier number.
          <p className="mt-3 text-xs text-warning-soft-foreground">
            {profit.coursesMissingCostSheet} course
            {profit.coursesMissingCostSheet === 1 ? " has" : "s have"} no cost sheet this
            semester, so the cost above is lower than the real one.
          </p>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ packagePrice: Number(price) });
          }}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4"
          data-print="hide"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="packagePrice">Package price</Label>
            <Input
              id="packagePrice"
              type="number"
              inputMode="numeric"
              className="w-36"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-invalid={fieldErrors?.packagePrice ? true : undefined}
              aria-describedby={fieldErrors?.packagePrice ? "packagePrice-error" : undefined}
            />
            {fieldErrors?.packagePrice ? (
              <p id="packagePrice-error" role="alert" className="text-xs font-medium text-destructive">
                {fieldErrors.packagePrice}
              </p>
            ) : null}
          </div>
          <Button type="submit" size="sm" loading={mutation.isPending}>
            Reprice
          </Button>
          <p className="text-xs text-muted-foreground">
            The server recomputes revenue, profit and margin. Nothing is stored.
          </p>
        </form>
      </Section>

      <Section
        title="Curriculum"
        description={`${term.courseIds.length} courses this term, each charged at its own cost per student.`}
        flush
        className="mt-4"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Cost per student</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Attributed cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profit.courses.map((course) => (
              <TableRow key={course.courseId}>
                <TableCell>
                  <Link
                    href={routes.course(course.courseId)}
                    className="rounded-sm font-medium underline-offset-4 hover:underline"
                  >
                    {course.courseCode}
                  </Link>
                  <span className="ml-2 text-muted-foreground">{course.courseName}</span>
                </TableCell>
                <TableCell className="text-right" data-numeric>
                  {course.costPerStudent === null ? (
                    <span className="text-muted-foreground">No cost sheet</span>
                  ) : (
                    money(course.costPerStudent)
                  )}
                </TableCell>
                <TableCell className="text-right" data-numeric>
                  {course.headCount}
                </TableCell>
                <TableCell className="text-right font-medium" data-numeric>
                  {course.attributedCost === null ? (
                    <span className="font-normal text-muted-foreground">Unknown</span>
                  ) : (
                    money(course.attributedCost)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title="Who is under this programme"
        description={`${roster.length} student${roster.length === 1 ? "" : "s"} enrolled this term.`}
        flush
        className="mt-4"
      >
        {roster.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nobody has enrolled in this term yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((entry) => (
                <TableRow key={entry.enrollmentId}>
                  <TableCell data-numeric>
                    <Link
                      href={routes.student(entry.student.id)}
                      className="rounded-sm font-medium underline-offset-4 hover:underline"
                    >
                      {entry.student.studentId}
                    </Link>
                  </TableCell>
                  <TableCell>{entry.student.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    Year {entry.student.yearLevel}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </>
  );
}

function Figure({
  label,
  value,
  strong = false,
  className,
}: Readonly<{
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
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
    </div>
  );
}
