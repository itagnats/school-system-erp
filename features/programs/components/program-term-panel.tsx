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
import { routes } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { TERM_STATUS_LABEL, TERM_STATUS_TONE } from "../constants";
import { CurriculumEditor } from "./curriculum-editor";
import { useUpdateProgramTerm } from "../hooks/use-program-terms";
import type { ProgramTermDetailResponse } from "../services/program-service";

/**
 * One program term as the academic record (direction.md §4a).
 *
 * What the term gathers, what it charges, and who is under it. The package
 * price is here because §4a makes it a curriculum attribute — it is part of
 * what the offer *is*.
 *
 * **What the term earned is not here** (§13a, revised 2026-09-20). This screen
 * used to lead with "Revenue against cost", so repricing showed the margin
 * move underneath it. That was the strongest argument for keeping money on an
 * academic screen, and it lost to a simpler one: a reader in the Academic menu
 * is not asking a money question, and two menus that both answer it is how the
 * answers drift. Repricing now links to Cost Management instead of restating
 * the consequence here.
 */
export function ProgramTermPanel({
  initial,
}: Readonly<{ initial: ProgramTermDetailResponse }>) {
  const mutation = useUpdateProgramTerm(initial.term.id);
  const detail = mutation.data ?? initial;
  const { term, curriculum, roster } = detail;

  const [price, setPrice] = useState(String(term.packagePrice));

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;
  return (
    <>
      <Section
        title="The package"
        description="What a student pays to join this term, for the whole curriculum below rather than per course."
        actions={
          <StatusBadge tone={TERM_STATUS_TONE[term.status]} label={TERM_STATUS_LABEL[term.status]} />
        }
      >
        <dl className="grid gap-3 sm:grid-cols-3">
          <Figure label="Package price" value={formatCurrency(term.packagePrice, term.currency)} />
          <Figure label="Courses" value={String(curriculum.length)} />
          <Figure
            label="Students enrolled"
            value={String(roster.length)}
            hint="Withdrawals included"
          />
        </dl>

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
          {/* The consequence of a price is a money question, so the link goes
              to the screen that answers it rather than the figure being
              restated here (§13a). */}
          <p className="text-xs text-muted-foreground">
            Nothing is stored.{" "}
            <Link
              href={routes.programCost(term.id)}
              className="rounded-sm underline underline-offset-4"
            >
              See what this term costs and earns
            </Link>
            .
          </p>
        </form>
      </Section>

      {/* Editable since 2026-09-21. §4a promises "which courses, in teaching
          order" and nothing could change either half until then. */}
      <CurriculumEditor
        termId={term.id}
        semesterCode={term.semesterCode}
        curriculum={curriculum}
        memberCount={roster.filter((entry) => entry.status !== "withdrawn").length}
      />

      <Section
        title="Who is under this program"
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
  hint,
}: Readonly<{
  label: string;
  value: string;
  /** How the figure was reached, or what it counts. Shown under the value. */
  hint?: string;
}>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base text-foreground" data-numeric>
        {value}
      </dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}
