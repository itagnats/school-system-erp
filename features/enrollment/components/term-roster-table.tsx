"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog, StatusBadge } from "@/components/shared";
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
import { formatDate } from "@/lib/utils";
import type { TermRosterRow } from "@/types";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "../constants";
import { withdrawFromTerm } from "../services/enrollment-service";

/**
 * The roster of one programme term, one row per student (direction.md §7a).
 *
 * A client component only because of the Withdraw action. The rows arrive
 * server-rendered and complete; nothing is fetched here.
 *
 * **Withdrawn rows stay.** §8 makes `withdrawn` the end of the lifecycle
 * rather than an absence: the person was on this term and left, which a closed
 * term's head count, an invoice and an evaluation group all still refer to.
 * Removing the row from the table would say something the data does not.
 *
 * The row is held in state rather than refetched, for the reason every write
 * here is: the BFF validates and stores nothing, so `router.refresh()` would
 * show the student back on the roster a second after withdrawing them, which
 * reads as a bug rather than as a documented boundary.
 */
export function TermRosterTable({ rows }: { rows: TermRosterRow[] }) {
  const [roster, setRoster] = useState(rows);
  const [target, setTarget] = useState<TermRosterRow>();
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!target) return;
    setPending(true);
    try {
      const result = await withdrawFromTerm(target.enrollmentId);
      setRoster((current) =>
        current.map((row) =>
          row.enrollmentId === target.enrollmentId
            ? {
                ...row,
                status: "withdrawn",
                courseCount: 0,
                unfinishedCount: row.unfinishedCount + result.cancelled,
              }
            : row,
        ),
      );
      toast.success(`${target.student.fullName} withdrawn`, {
        description:
          result.cancelled === 1
            ? "1 course enrollment cancelled with it"
            : `${result.cancelled} course enrollments cancelled with it`,
      });
      setTarget(undefined);
    } catch {
      toast.error("That withdrawal did not go through. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (roster.length === 0) {
    return <p className="text-sm text-muted-foreground">Nobody is enrolled in this term yet.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Major</TableHead>
            <TableHead className="text-right">Courses</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roster.map((entry) => (
            <TableRow key={entry.enrollmentId}>
              <TableCell>
                <Link
                  href={routes.student(entry.student.id)}
                  className="font-medium text-primary hover:underline"
                >
                  {entry.student.studentId}
                </Link>
              </TableCell>
              <TableCell>{entry.student.fullName}</TableCell>
              <TableCell className="text-muted-foreground">{entry.student.major}</TableCell>
              <TableCell className="text-right tabular-nums">
                {entry.courseCount}
                {entry.unfinishedCount > 0 ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    +{entry.unfinishedCount} unfinished
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                <StatusBadge
                  tone={MEMBERSHIP_TONE[entry.status]}
                  label={MEMBERSHIP_LABEL[entry.status]}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(entry.enrolledAt)}
              </TableCell>
              <TableCell>
                {entry.status === "withdrawn" ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setTarget(entry)}
                  >
                    Withdraw
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) setTarget(undefined);
        }}
        title={`Withdraw ${target?.student.fullName ?? "this student"}?`}
        description={describeWithdrawal(target)}
        confirmLabel="Withdraw student"
        isPending={pending}
        onConfirm={confirm}
      />
    </>
  );
}

/**
 * What withdrawing will do, said before it happens.
 *
 * The credit rule is the part worth stating: a cancelled course gives back its
 * whole line, where a dropped one gives back half (direction.md 13b), so this
 * is a money decision as much as a roster one.
 */
function describeWithdrawal(target: TermRosterRow | undefined): string {
  if (!target) return "";
  const courses =
    target.courseCount === 1 ? "course enrollment is" : "course enrollments are";
  return `Their ${courses} cancelled with it, and a cancelled course credits its whole line on the invoice. The membership stays on the term as withdrawn.`;
}
