"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormActions } from "@/components/forms";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HttpError } from "@/lib/api";
import type { EnrollmentTermOption, EnrollmentResult, SemesterCode } from "@/types";
import { useEnrolStudent } from "../hooks/use-enrol-student";
import {
  pickStudentFormSchema,
  toEnrolRequest,
  type PickStudentFormValues,
} from "../validations/enrollment-schema";
import { EnrollmentTermField } from "./enrollment-term-field";
import { StudentPicker } from "./student-picker";

/**
 * The two paths that enrol somebody who already has a profile
 * (direction.md §7): search for them, or pick them out of an earlier semester.
 *
 * One component, because the difference between the two is a single query
 * parameter. `source` is not cosmetic — it is stored on every enrollment row
 * the request creates, so a roster can still answer how each person got there.
 *
 * Neither path collects profile information. That is the instruction in §7 read
 * literally: reuse the existing profile rather than creating duplicate
 * information.
 */
export function PickStudentForm({
  source,
  terms,
  semesterOptions,
  defaultTermId,
  onDone,
  onCancel,
}: {
  source: "existing-profile" | "previous-course";
  terms: EnrollmentTermOption[];
  /** Preselected when the screen already knows which term is meant. */
  defaultTermId?: string;
  semesterOptions: SemesterCode[];
  onDone: (result: EnrollmentResult) => void;
  onCancel: () => void;
}) {
  const enrol = useEnrolStudent();
  const [search, setSearch] = useState("");

  const form = useForm<PickStudentFormValues>({
    resolver: zodResolver(pickStudentFormSchema),
    defaultValues: { programTermId: defaultTermId ?? terms[0]?.id ?? "", studentId: "" },
  });

  const termId = useWatch({ control: form.control, name: "programTermId" });
  const term = terms.find((option) => option.id === termId);

  // Semesters that could be "the previous one" for the chosen term. Newest
  // first, because last term is the common case and should need no scrolling.
  const earlier = semesterOptions
    .filter((code) => !term || code < term.semesterCode)
    .sort((a, b) => b.localeCompare(a));
  const [fromSemester, setFromSemester] = useState<string>("");
  const effectiveFrom = source === "previous-course" ? fromSemester || earlier[0] : undefined;

  async function onSubmit(values: PickStudentFormValues) {
    try {
      const result = await enrol.mutateAsync(toEnrolRequest(values, source));
      onDone(result);
    } catch (error) {
      if (error instanceof HttpError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof PickStudentFormValues, { type: "server", message });
        }
        return;
      }
      form.setError("root", {
        type: "server",
        message: "That enrollment could not be made. Please try again.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <FormField
          control={form.control}
          name="programTermId"
          render={({ field }) => (
            <EnrollmentTermField
              terms={terms}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                // The candidate list is scoped to the program, so a student
                // chosen under the previous term is no longer necessarily
                // enrollable. Clearing is safer than carrying it over.
                form.setValue("studentId", "");
              }}
            />
          )}
        />

        {source === "previous-course" ? (
          <FormItem>
            <FormLabel htmlFor="from-semester">Coming from</FormLabel>
            <Select
              value={effectiveFrom ?? ""}
              onValueChange={(value) => {
                setFromSemester(value);
                form.setValue("studentId", "");
              }}
            >
              <SelectTrigger id="from-semester" className="w-full">
                <SelectValue placeholder="Choose a semester" />
              </SelectTrigger>
              <SelectContent>
                {earlier.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        ) : null}

        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel id="student-picker-label">Student</FormLabel>
              <StudentPicker
                program={term?.programName}
                semester={effectiveFrom}
                search={search}
                onSearchChange={setSearch}
                value={field.value}
                onChange={field.onChange}
                labelledBy="student-picker-label"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormActions
          onCancel={onCancel}
          submitLabel="Enrol student"
          isSubmitting={enrol.isPending}
          error={form.formState.errors.root?.message}
        />
      </form>
    </Form>
  );
}
