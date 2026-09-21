"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddCourseDialog } from "./add-course-dialog";
import type { Course } from "@/types";

/**
 * Composing a curriculum inside a form (added 2026-09-21).
 *
 * The controlled twin of `CurriculumEditor`. That one edits a term that
 * exists and saves each change through the endpoint; this one holds a list
 * the surrounding form has not submitted yet, so it owns no mutation and no
 * server state.
 *
 * They are deliberately not one component. Sharing them would mean a single
 * component that sometimes writes and sometimes does not, and every prop on
 * it would exist to say which — the seam between "editing a record" and
 * "filling in a form" is a real one.
 *
 * What they do share is `AddCourseDialog`, which is the part worth sharing:
 * one answer to "which courses may this term teach".
 */
export function CurriculumPicker({
  semesterCode,
  value,
  onChange,
  error,
}: Readonly<{
  /** The chosen semester, so the dialog can flag newly scheduled courses. */
  semesterCode: string;
  value: Course[];
  onChange: (next: Course[]) => void;
  error?: string;
}>) {
  const [picking, setPicking] = useState(false);
  const credits = value.reduce((total, course) => total + course.credits, 0);

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-1">
          <Label htmlFor="curriculum-add">Curriculum</Label>
          <p className="text-xs text-muted-foreground">
            In teaching order. {value.length} course{value.length === 1 ? "" : "s"},{" "}
            {credits} credits.
          </p>
        </div>
        <Button
          id="curriculum-add"
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setPicking(true)}
        >
          <Plus aria-hidden /> Add a course
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-hairline px-3 py-6 text-center text-sm text-muted-foreground">
          No courses yet. A term has to teach at least one.
        </p>
      ) : (
        <ol className="grid gap-1.5">
          {value.map((course, index) => (
            <li
              key={course.id}
              className="flex items-center justify-between gap-2 rounded-md border border-hairline px-3 py-2"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="text-xs text-muted-foreground" data-numeric>
                  {index + 1}
                </span>
                <span className="min-w-0 truncate text-sm font-medium">
                  {course.code}{" "}
                  <span className="font-normal text-muted-foreground">{course.name}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <span className="mr-1 text-xs text-muted-foreground" data-numeric>
                  {course.credits} cr
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label={`Move ${course.code} up to position ${index}`}
                >
                  <ChevronUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={`Move ${course.code} down to position ${index + 2}`}
                >
                  <ChevronDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange(value.filter((row) => row.id !== course.id))}
                  aria-label={`Remove ${course.code} from the curriculum`}
                >
                  <X aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <AddCourseDialog
        semesterCode={semesterCode}
        open={picking}
        onOpenChange={setPicking}
        alreadyIn={value.map((course) => course.id)}
        onAdd={(course) => onChange([...value, course])}
      />
    </div>
  );
}
