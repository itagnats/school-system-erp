"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EnrolmentResult, EnrolmentTermOption, SemesterCode } from "@/types";
import { NewStudentForm } from "./new-student-form";
import { PickStudentForm } from "./pick-student-form";

/**
 * Add Student (direction.md §7).
 *
 * Three paths — an existing profile, someone from a previous semester, or a
 * new student — and they are genuinely three ways of answering one question:
 * who. Everything after that is identical, which is why the request they send
 * is one contract discriminated on `source` rather than three endpoints.
 *
 * Tabs rather than a wizard. A wizard would be right if the paths shared steps
 * in sequence; they do not — you know which one you are on before you open the
 * dialog, and making someone click Next to reach it would be ceremony.
 *
 * Each tab owns its own form state, which is why they are separate components:
 * switching tabs abandons a half-typed new student rather than carrying its
 * values into a path that has no fields for them.
 */
export function AddStudentDialog({
  terms,
  semesterOptions,
  defaultTermId,
  label = "Add student",
}: {
  terms: EnrolmentTermOption[];
  semesterOptions: SemesterCode[];
  /**
   * Preselected term. Set from the route on a programme term page, and from
   * the active filters on the roster — in both cases the screen already knows
   * the answer, and asking again is the flaw this prop exists to remove.
   */
  defaultTermId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<EnrolmentResult>();

  function close() {
    setOpen(false);
    // Let the dialog finish closing before the body swaps back, so the last
    // frame of the animation is not the form reappearing.
    setTimeout(() => setResult(undefined), 200);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={terms.length === 0}>
        {label}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setOpen(true);
          else close();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{result ? "Enrolled" : "Add student"}</DialogTitle>
            <DialogDescription>
              {result
                ? "Validated and returned by the BFF. This demo stores nothing, so it lasts until reload."
                : "A student joins a programme term, and the course enrollments follow from its curriculum."}
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <EnrolmentReceipt result={result} onClose={close} />
          ) : (
            <Tabs defaultValue="existing-profile">
              <TabsList className="w-full">
                <TabsTrigger value="existing-profile">Existing profile</TabsTrigger>
                <TabsTrigger value="previous-course">Previous course</TabsTrigger>
                <TabsTrigger value="new-student">New student</TabsTrigger>
              </TabsList>

              <TabsContent value="existing-profile" className="pt-3">
                <PickStudentForm
                  source="existing-profile"
                  terms={terms}
                  semesterOptions={semesterOptions}
                  defaultTermId={defaultTermId}
                  onDone={setResult}
                  onCancel={close}
                />
              </TabsContent>

              <TabsContent value="previous-course" className="pt-3">
                <PickStudentForm
                  source="previous-course"
                  terms={terms}
                  semesterOptions={semesterOptions}
                  defaultTermId={defaultTermId}
                  onDone={setResult}
                  onCancel={close}
                />
              </TabsContent>

              <TabsContent value="new-student" className="pt-3">
                <NewStudentForm
                  terms={terms}
                  defaultTermId={defaultTermId}
                  onDone={setResult}
                  onCancel={close}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * What the enrolment actually did.
 *
 * One act produced several records, and a toast saying "enrolled" would hide
 * that. Listing the courses is the difference between a user believing the
 * curriculum was applied and seeing that it was.
 */
function EnrolmentReceipt({
  result,
  onClose,
}: {
  result: EnrolmentResult;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-2 rounded-md border border-hairline bg-tone-mint/40 p-3">
        <CheckCircle2 className="mt-0.5 size-4 text-success" aria-hidden />
        <div className="grid gap-0.5 text-sm">
          <p className="font-medium">
            {result.student.fullName} · {result.student.studentId}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.programName} · {result.semesterCode}
          </p>
        </div>
      </div>

      <div className="grid gap-1">
        <p className="text-xs font-medium text-muted-foreground">
          {result.enrollments.length} course{" "}
          {result.enrollments.length === 1 ? "enrollment" : "enrollments"} created
        </p>
        <ul className="grid gap-1">
          {result.enrollments.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded-md border border-hairline px-2.5 py-1.5 text-sm"
            >
              <span className="font-medium">{row.courseCode}</span>
              <span className="text-xs text-muted-foreground">{row.semesterCode}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
