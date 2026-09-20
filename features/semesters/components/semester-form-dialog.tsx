"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormActions } from "@/components/forms";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HttpError } from "@/lib/api";
import { SEMESTER_STATUS_OPTIONS } from "../constants";
import {
  useCreateSemester,
  useUpdateSemester,
} from "../hooks/use-semester-mutations";
import type { SemesterListRow } from "../types";
import {
  emptySemesterForm,
  previewSemesterCode,
  semesterCreateSchema,
  semesterToForm,
  type SemesterCreateInput,
  type SemesterFormValues,
} from "../validations/semester-schema";

/**
 * Create and edit a semester (direction.md §1, added 2026-09-20).
 *
 * One dialog for both, because the fields are identical and two near-duplicate
 * forms drift. `semester` being present is what switches it.
 *
 * **The code is shown and never typed.** `YYYYNN` is derived from the academic
 * year and the term, so a code field would be a third value that can disagree
 * with the two it is built from — and the code is what every enrollment, cost
 * sheet, program term and invoice joins on. The preview line is there so the
 * derivation is visible rather than a surprise on save.
 *
 * **Editing cannot move the code**, which is why the year and term inputs are
 * disabled on an edit rather than validated after the fact. The server refuses
 * it too (`updateSemester`); the disabled input is the courtesy and the refusal
 * is the rule, the same shape the access table takes.
 */
export function SemesterFormDialog({
  open,
  onOpenChange,
  semester,
  defaultAcademicYear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing, absent when creating. */
  semester?: SemesterListRow;
  /** The latest year in the data, so a new semester opens somewhere sensible. */
  defaultAcademicYear: number;
}) {
  const isEdit = Boolean(semester);
  const create = useCreateSemester();
  const update = useUpdateSemester();
  const pending = create.isPending || update.isPending;

  const form = useForm<SemesterFormValues, unknown, SemesterCreateInput>({
    resolver: zodResolver(semesterCreateSchema),
    defaultValues: semester
      ? semesterToForm(semester)
      : emptySemesterForm(defaultAcademicYear),
  });

  // Reopening for a different row has to reload the form: react-hook-form keeps
  // its values across renders, so without this an edit would open showing the
  // previous semester.
  useEffect(() => {
    if (open) {
      form.reset(
        semester ? semesterToForm(semester) : emptySemesterForm(defaultAcademicYear),
      );
    }
  }, [open, semester, defaultAcademicYear, form]);

  // `useWatch` rather than `form.watch`: the latter returns a function the
  // React Compiler cannot memoize safely, and it warns rather than failing -
  // the shape of warning this repo has already been bitten by once.
  const year = useWatch({ control: form.control, name: "academicYear" });
  const term = useWatch({ control: form.control, name: "term" });
  const preview = previewSemesterCode(Number(year), Number(term));

  async function onSubmit(values: SemesterCreateInput) {
    try {
      if (semester) {
        // The year and the term are not sent on an edit. They are disabled in
        // the form and refused by the server; sending them unchanged would work
        // and would still be a request to move a code. Named explicitly rather
        // than destructured away, so adding a field to the form is a decision
        // about whether it is editable rather than a silent inclusion.
        await update.mutateAsync({
          code: semester.code,
          input: {
            name: values.name,
            startDate: values.startDate,
            endDate: values.endDate,
            status: values.status,
          },
        });
      } else {
        await create.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof HttpError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof SemesterFormValues, { type: "server", message });
        }
        return;
      }
      form.setError("root", {
        type: "server",
        message: "That could not be saved. Please try again.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${semester?.code}` : "New semester"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "A semester keeps its code, so the year and the term are fixed once it exists."
              : "The code is built from the academic year and the term, not typed."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2000}
                        max={2100}
                        disabled={isEdit}
                        {...field}
                        // A number input still hands back a string, and the
                        // schema expects a number.
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        disabled={isEdit}
                        {...field}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>
                      {preview ? (
                        <>
                          Code: <span data-numeric>{preview}</span>
                        </>
                      ) : (
                        "The code appears once the year and term are valid."
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="First Semester 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SEMESTER_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Status is stored rather than computed against a clock, so a
                    semester does not close because a date passed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormActions
              onCancel={() => onOpenChange(false)}
              submitLabel={isEdit ? "Save changes" : "Create semester"}
              isSubmitting={pending}
              error={form.formState.errors.root?.message}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
