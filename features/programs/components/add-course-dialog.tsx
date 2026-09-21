"use client";

import { Check, CalendarPlus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/feedback";
import { useCoursePicker } from "../hooks/use-course-picker";
import type { Course } from "@/types";

/**
 * Add a course to a curriculum (direction.md §4a).
 *
 * **Putting a course here schedules it into the semester** (`AUD-035`,
 * decided 2026-09-21). The picker used to offer only courses already offered
 * in the term's semester, which made a semester created today a dead end —
 * nothing is offered in it, and no screen in the application writes
 * `offeredIn`. Choosing a course for a term *is* the act of scheduling it, so
 * every active course is offered and the ones that would be newly scheduled
 * say so.
 *
 * A course already in the curriculum stays listed and is shown as such rather
 * than hidden. Its absence would read as the catalog not having it.
 *
 * Adding is local: the course joins the end of the teaching order, and
 * nothing is sent until the caller saves. That keeps one write for the whole
 * array, which is what makes a reorder expressible at all.
 */
export function AddCourseDialog({
  semesterCode,
  open,
  onOpenChange,
  alreadyIn,
  onAdd,
}: Readonly<{
  /** The term's semester, used to say which courses it would newly schedule. */
  semesterCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Course ids in the draft, including ones not yet saved. */
  alreadyIn: string[];
  onAdd: (course: Course) => void;
}>) {
  const courses = useCoursePicker(open);
  const held = new Set(alreadyIn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a course</DialogTitle>
          <DialogDescription>
            A course joins the end of the teaching order and can be moved from
            there. One that has not run in {semesterCode || "this semester"}{" "}
            before is scheduled into it.
          </DialogDescription>
        </DialogHeader>

        {courses.isPending ? <LoadingState label="Loading courses" /> : null}

        {courses.isError ? (
          <ErrorState error={courses.error} onRetry={() => void courses.refetch()} compact />
        ) : null}

        {courses.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There are no active courses. Create one under Courses first.
          </p>
        ) : null}

        <div className="grid max-h-72 gap-2 overflow-y-auto">
          {courses.data?.map((course) => {
            const inCurriculum = held.has(course.id);
            const wouldSchedule = !course.offeredIn.includes(semesterCode);

            return (
              <div
                key={course.id}
                className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {course.code} <span className="text-muted-foreground">{course.name}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {course.credits} credits
                    {wouldSchedule ? (
                      <>
                        {" · "}
                        <CalendarPlus aria-hidden className="size-3" />
                        new to {semesterCode}
                      </>
                    ) : null}
                  </span>
                </span>
                {inCurriculum ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Check aria-hidden className="size-3.5" /> In the curriculum
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => onAdd(course)}
                    aria-label={`Add ${course.code} to the curriculum`}
                  >
                    <Plus aria-hidden /> Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
