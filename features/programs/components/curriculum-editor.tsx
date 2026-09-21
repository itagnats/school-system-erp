"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, RotateCcw, X } from "lucide-react";
import { Section } from "@/components/shared";
import { Button } from "@/components/ui/button";
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
import { useUpdateProgramTerm } from "../hooks/use-program-terms";
import { AddCourseDialog } from "./add-course-dialog";
import type { ProgramCurriculumEntry } from "@/types";

/**
 * Editing a term's curriculum (direction.md §4a, added 2026-09-21).
 *
 * §4a promises "which courses, in teaching order" and until now nothing could
 * change either half — the course list was read-only on every route, contract
 * and screen. This is the half that was missing.
 *
 * **The order is the array.** `courseIds` carries the teaching order, so there
 * is no position field to edit and no second place for it to disagree; moving
 * a row moves the entry. That is also why the whole array is saved at once
 * rather than add / remove / move each hitting the endpoint: a reorder has no
 * expression as a partial edit.
 *
 * **Any term is editable, and the screen says what that does not do** (decided
 * 2026-09-21). The two stricter rules were measured against the seed and both
 * fail: no term is free of members and invoices (0 of 19), and all five
 * `planning` terms already carry 25-38 members, so locking by status would
 * permit exactly the edits a lock exists to prevent. Refusing everywhere
 * demonstrates nothing, so the consequence is stated instead.
 *
 * Move up / move down rather than drag and drop, the same choice
 * `ranking-form.tsx` made and for the same reason: a reorder has to be
 * reachable without a mouse, and this needs no dependency to be so.
 */

/**
 * A row of the curriculum being edited.
 *
 * `headCount` is null for a course added since the last save. Take-up is
 * counted server-side from the enrollments, so the browser does not know it
 * yet — and inventing a zero would be a claim, not a gap.
 */
interface DraftCourse {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  headCount: number | null;
}

function toDraft(curriculum: ProgramCurriculumEntry[]): DraftCourse[] {
  return curriculum.map((entry) => ({
    courseId: entry.courseId,
    courseCode: entry.courseCode,
    courseName: entry.courseName,
    credits: entry.credits,
    headCount: entry.headCount,
  }));
}

/**
 * What editing the curriculum does not do, in the term's own numbers.
 *
 * The user chose "any term is editable, and say what it does not do" over the
 * two locking rules, so this sentence carries the whole weight of that choice
 * and has to be exact. It states the two things a reader would reasonably
 * assume: the invoices that name this term were priced from the old array
 * (§13b) and each student's course enrollments were expanded when they joined
 * (§7a). Neither is rewritten here.
 */
function consequenceNote(memberCount: number): string {
  if (memberCount === 0) return "Nobody is enrolled in this term yet.";
  const subject = memberCount === 1 ? "1 student is" : `${memberCount} students are`;
  return `${subject} already under this term. Changing the curriculum does not re-bill them and does not change what they are enrolled in.`;
}

function sameOrder(draft: DraftCourse[], curriculum: ProgramCurriculumEntry[]): boolean {
  return (
    draft.length === curriculum.length &&
    draft.every((row, index) => row.courseId === curriculum[index]?.courseId)
  );
}

export function CurriculumEditor({
  termId,
  semesterCode,
  curriculum,
  memberCount,
}: Readonly<{
  termId: string;
  semesterCode: string;
  curriculum: ProgramCurriculumEntry[];
  /** How many students are already under this term, for the honesty note. */
  memberCount: number;
}>) {
  const mutation = useUpdateProgramTerm(termId);

  const [draft, setDraft] = useState<DraftCourse[]>(() => toDraft(curriculum));
  // Re-sync when the server hands back a new curriculum, without an effect:
  // the stored baseline is compared during render, which is the pattern React
  // documents for state that follows a prop. An effect here would paint the
  // stale order for a frame first.
  const [baseline, setBaseline] = useState(curriculum);
  if (baseline !== curriculum) {
    setBaseline(curriculum);
    setDraft(toDraft(curriculum));
  }

  const [picking, setPicking] = useState(false);

  const dirty = !sameOrder(draft, curriculum);
  const fieldError =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors?.courseIds : undefined;

  function move(from: number, to: number) {
    if (to < 0 || to >= draft.length) return;
    const next = [...draft];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    setDraft(next);
  }

  function remove(courseId: string) {
    setDraft((rows) => rows.filter((row) => row.courseId !== courseId));
  }

  const credits = draft.reduce((total, row) => total + row.credits, 0);

  return (
    <Section
      title="Curriculum"
      description={`${draft.length} course${draft.length === 1 ? "" : "s"} this term, in teaching order, ${credits} credits in total.`}
      className="mt-4"
      flush
      actions={
        <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
          <Plus aria-hidden /> Add a course
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead>Course</TableHead>
            <TableHead className="text-right">Credits</TableHead>
            <TableHead className="text-right">Taking it</TableHead>
            <TableHead className="w-32 text-right" data-print="hide">
              <span className="sr-only">Reorder or remove</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {draft.map((row, index) => (
            <TableRow key={row.courseId}>
              <TableCell className="text-right text-muted-foreground" data-numeric>
                {index + 1}
              </TableCell>
              <TableCell>
                <Link
                  href={routes.course(row.courseId)}
                  className="rounded-sm font-medium underline-offset-4 hover:underline"
                >
                  {row.courseCode}
                </Link>
                <span className="ml-2 text-muted-foreground">{row.courseName}</span>
              </TableCell>
              <TableCell className="text-right" data-numeric>
                {row.credits}
              </TableCell>
              {/* A package bills the curriculum, so take-up is a real fact
                  about the term rather than a billing gap (§13b). It is a head
                  count, not a cost. */}
              <TableCell className="text-right" data-numeric>
                {row.headCount === null ? (
                  <span className="text-muted-foreground" title="Counted when this is saved">
                    &mdash;
                  </span>
                ) : (
                  row.headCount
                )}
              </TableCell>
              <TableCell className="text-right" data-print="hide">
                <div className="flex justify-end gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label={`Move ${row.courseCode} up to position ${index}`}
                  >
                    <ChevronUp aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label={`Move ${row.courseCode} down to position ${index + 2}`}
                  >
                    <ChevronDown aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    // A term with no courses has a package price for nothing,
                    // so the last row cannot be removed. The contract refuses
                    // an empty array as well; this is the courtesy half.
                    disabled={draft.length === 1}
                    onClick={() => remove(row.courseId)}
                    aria-label={`Remove ${row.courseCode} from the curriculum`}
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div
        className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline p-4"
        data-print="hide"
      >
        <div className="min-w-0">
          {fieldError ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {fieldError}
            </p>
          ) : (
            /* The consequence, stated rather than prevented. Nothing here
               reads an invoice: this is an academic screen and the count of
               who is billed belongs to Cost Management (§13a). */
            <p className="text-xs text-muted-foreground">
              {consequenceNote(memberCount)} Nothing is stored.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={!dirty || mutation.isPending}
            onClick={() => setDraft(toDraft(curriculum))}
          >
            <RotateCcw aria-hidden /> Discard
          </Button>
          <Button
            size="sm"
            disabled={!dirty}
            loading={mutation.isPending}
            onClick={() => mutation.mutate({ courseIds: draft.map((row) => row.courseId) })}
          >
            Save curriculum
          </Button>
        </div>
      </div>

      <AddCourseDialog
        semesterCode={semesterCode}
        open={picking}
        onOpenChange={setPicking}
        alreadyIn={draft.map((row) => row.courseId)}
        onAdd={(course) =>
          setDraft((rows) => [
            ...rows,
            {
              courseId: course.id,
              courseCode: course.code,
              courseName: course.name,
              credits: course.credits,
              headCount: null,
            },
          ])
        }
      />
    </Section>
  );
}
