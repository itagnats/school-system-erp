"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course } from "@/types";
import { useCreateProgramTerm } from "../hooks/use-programs";
import { applyServerFieldErrors } from "../validations/server-errors";
import { CurriculumPicker } from "./curriculum-picker";

/**
 * Add a term to a program that already exists (direction.md §4a).
 *
 * The other half of `ProgramFormDialog`, and the one that behaves normally:
 * the program is in the store, so the term can be created against it by a
 * request of its own. The first term has to travel with its program only
 * because a program created a moment ago is not in the store at all
 * (`AUD-036`).
 *
 * Semesters the program already has a term in are not offered. A student
 * holds one program term per semester (§7a), so a second term of the same
 * program in one semester would make that unrepresentable — the server
 * refuses it, and an option that is always refused is not a choice.
 */

const formSchema = z.object({
  semesterCode: z.string().min(1, "Choose a semester"),
  packagePrice: z
    .number({ message: "The package price must be a number" })
    .min(0, "A package price cannot be negative")
    .max(1_000_000, "That is larger than any package in this demo"),
});

type FormValues = z.input<typeof formSchema>;
type ParsedValues = z.output<typeof formSchema>;

const EMPTY: FormValues = { semesterCode: "", packagePrice: 0 };

export function ProgramTermFormDialog({
  programId,
  programCode,
  open,
  onOpenChange,
  availableSemesters,
}: Readonly<{
  programId: string;
  programCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Semesters this program does not already have a term in. */
  availableSemesters: string[];
}>) {
  const create = useCreateProgramTerm(programId);

  const form = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [curriculumError, setCurriculumError] = useState<string>();

  /**
   * Cleared on close rather than on open.
   *
   * The same job an `useEffect` keyed on `open` would do, in an event handler
   * instead — `react-hooks/set-state-in-effect` is an error in this repo, and
   * it is right to be: state that follows a prop through an effect paints the
   * stale value for a frame first. Closing is always an event here, from the
   * backdrop, Cancel, or a successful submit.
   */
  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset(EMPTY);
      setCourses([]);
      setCurriculumError(undefined);
    }
    onOpenChange(next);
  }

  // `useWatch` rather than `form.watch`: the latter returns a function the
  // React Compiler cannot memoize safely. It is only a warning, and this repo
  // has already shipped a broken `aria-labelledby` behind a tolerated warning
  // of exactly that shape.
  const semesterCode = useWatch({ control: form.control, name: "semesterCode" });

  async function onSubmit(values: ParsedValues) {
    if (courses.length === 0) {
      setCurriculumError("A term has to teach at least one course");
      return;
    }
    setCurriculumError(undefined);

    try {
      await create.mutateAsync({
        programId,
        semesterCode: values.semesterCode,
        courseIds: courses.map((course) => course.id),
        packagePrice: values.packagePrice,
      });
      handleOpenChange(false);
    } catch (error) {
      if (applyServerFieldErrors(error, form.setError, setCurriculumError)) return;
      form.setError("root", {
        type: "server",
        message: "That could not be saved. Please try again.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a term to {programCode}</DialogTitle>
          <DialogDescription>
            One semester of this program: what it teaches, in what order, and
            what the package costs. It starts in planning, with an empty cost
            sheet.
          </DialogDescription>
        </DialogHeader>

        {availableSemesters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {programCode} already has a term in every semester that exists.
            Create a semester first.
          </p>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid max-h-[65vh] gap-3 overflow-y-auto px-1"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="semesterCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a semester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSemesters.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Semesters this program already runs are not listed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="packagePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          {...field}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        For the whole package, not per course.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CurriculumPicker
                semesterCode={semesterCode}
                value={courses}
                onChange={setCourses}
                error={curriculumError}
              />

              {form.formState.errors.root ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {form.formState.errors.root.message}
                </p>
              ) : null}

              <DialogFooter className="mt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleOpenChange(false)}
                  disabled={create.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={create.isPending}>
                  Add term
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
