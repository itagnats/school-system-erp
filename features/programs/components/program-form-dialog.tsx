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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { programCreateSchema } from "@/lib/api/contracts";
import type { Course, SemesterCode } from "@/types";
import { PROGRAM_STATUS_OPTIONS } from "../constants";
import { useCreateProgram } from "../hooks/use-programs";
import { applyServerFieldErrors } from "../validations/server-errors";
import { CurriculumPicker } from "./curriculum-picker";

/**
 * Create a program and its first term (direction.md §4a, added 2026-09-21).
 *
 * **One form, two records, and that is `AUD-036` showing through the design.**
 * The natural flow is "create the program, open it, add a term" — and its
 * second step cannot work here. Nothing written reaches the store, so the new
 * program's page, which is a server component reading that store, would 404
 * on the record created a moment earlier. Creating both together means
 * nothing has to be navigated into, and the one response carries everything
 * the client will ever have.
 *
 * The package price is typed rather than suggested. The computed figure is
 * the *preferred price* — cost per student, rounded up — and it cannot exist
 * for a term whose cost sheets are empty, which a term created here always
 * has. It appears on the term page later, once there is something to compute
 * it from (§13).
 */

/** The scalar half. The curriculum is held outside the form - see below. */
const formSchema = programCreateSchema.omit({ firstTerm: true }).extend({
  semesterCode: z.string().min(1, "Choose a semester"),
  packagePrice: z
    .number({ message: "The package price must be a number" })
    .min(0, "A package price cannot be negative")
    .max(1_000_000, "That is larger than any package in this demo"),
});

type FormValues = z.input<typeof formSchema>;
type ParsedValues = z.output<typeof formSchema>;

const EMPTY: FormValues = {
  code: "",
  name: "",
  description: "",
  credential: "",
  status: "draft",
  semesterCode: "",
  packagePrice: 0,
};

export function ProgramFormDialog({
  open,
  onOpenChange,
  semesterOptions,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every semester that exists, not only the ones courses already run in. */
  semesterOptions: SemesterCode[];
}>) {
  const create = useCreateProgram();

  const form = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  /**
   * The curriculum sits outside react-hook-form on purpose.
   *
   * It is an ordered list of whole `Course` records, because the picker shows
   * a code, a name and a credit count, while the wire wants ids alone. Putting
   * that in the form would mean either registering a field the schema does not
   * describe or storing ids and re-fetching every course to render a row.
   */
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
        code: values.code,
        name: values.name,
        description: values.description,
        credential: values.credential,
        status: values.status,
        firstTerm: {
          semesterCode: values.semesterCode,
          courseIds: courses.map((course) => course.id),
          packagePrice: values.packagePrice,
        },
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
          <DialogTitle>New program</DialogTitle>
          <DialogDescription>
            A program and the first semester it runs, created together. Nothing
            is stored, so this is the only copy — a reload loses it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid max-h-[65vh] gap-3 overflow-y-auto px-1"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="BSC-IT" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credential"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credential</FormLabel>
                    <FormControl>
                      <Input placeholder="Bachelor of Science" {...field} />
                    </FormControl>
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
                    <Input placeholder="BSc Information Technology" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROGRAM_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    A draft program is not offered to anyone yet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-1 grid gap-3 border-t border-hairline pt-3">
              <p className="text-sm font-medium">The first term</p>

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
                          {semesterOptions.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
            </div>

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
                Create program
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
