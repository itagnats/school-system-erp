"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { PROGRAM_STATUS_LABEL, PROGRAM_STATUS_TONE, TERM_STATUS_LABEL, TERM_STATUS_TONE } from "../constants";
import { useProgram } from "../hooks/use-programs";
import { ProgramTermFormDialog } from "./program-term-form-dialog";
import type { ProgramDetailResponse } from "../services/program-service";

/**
 * One program and every term under it (direction.md §4a, added 2026-09-21).
 *
 * The level that was missing. `/programs` listed 19 terms and the five
 * programs had no page at all, so BSC-IT's four semesters were four unrelated
 * rows and there was nowhere to say what the program *is*.
 *
 * Server-rendered through `initialData`, then held by the query cache so a
 * term added here appears without a refetch — which matters more than usual,
 * because a refetch would not find it (`AUD-036`).
 */
export function ProgramPanel({
  initial,
  semesterOptions,
}: Readonly<{
  initial: ProgramDetailResponse;
  /** Every semester that exists, not only ones a course already runs in. */
  semesterOptions: string[];
}>) {
  const query = useProgram(initial.program.id);
  const detail = query.data ?? initial;
  const { program, terms, studentCount } = detail;

  const [adding, setAdding] = useState(false);

  const taken = new Set(terms.map((term) => term.semesterCode));
  const available = semesterOptions.filter((code) => !taken.has(code));

  return (
    <>
      <Section
        title="The program"
        description={program.description}
        actions={
          <StatusBadge
            tone={PROGRAM_STATUS_TONE[program.status]}
            label={PROGRAM_STATUS_LABEL[program.status]}
          />
        }
      >
        <dl className="grid gap-3 sm:grid-cols-3">
          <Figure label="Credential" value={program.credential} />
          <Figure label="Terms" value={String(terms.length)} />
          {/* Distinct people across every term, not a sum of memberships: a
              student holds one term per semester (§7a), so somebody here for
              four semesters is one student and four memberships. */}
          <Figure
            label="Students"
            value={String(studentCount)}
            hint="Distinct people, all terms"
          />
        </dl>
      </Section>

      <Section
        title="Terms"
        description="One row per semester this program runs. A term is what a student enrolls in and what carries the price."
        className="mt-4"
        flush
        actions={
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a term
          </Button>
        }
      >
        {terms.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            This program has never run. Add its first term.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
                <TableHead>Semester</TableHead>
                <TableHead className="text-right">Courses</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Package</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell>
                    <Link
                      href={routes.programTerm(program.id, term.id)}
                      className="rounded-sm font-medium underline-offset-4 hover:underline"
                      data-numeric
                    >
                      {term.semesterCode}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right" data-numeric>
                    {term.courseCount}
                  </TableCell>
                  <TableCell className="text-right" data-numeric>
                    {term.enrolledCount}
                  </TableCell>
                  {/* The package price is the one money field an academic
                      screen carries: §4a makes it part of what the offer is,
                      where everything that judges it reads under Cost
                      Management (§13a). */}
                  <TableCell className="text-right" data-numeric>
                    {formatCurrency(term.packagePrice, term.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={TERM_STATUS_TONE[term.status]}
                      label={TERM_STATUS_LABEL[term.status]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <ProgramTermFormDialog
        programId={program.id}
        programCode={program.code}
        open={adding}
        onOpenChange={setAdding}
        availableSemesters={available}
      />
    </>
  );
}

function Figure({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base text-foreground">{value}</dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}
