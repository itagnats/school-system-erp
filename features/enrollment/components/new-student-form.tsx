"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { HttpError } from "@/lib/api";
import type { EnrollmentResult, EnrollmentTermOption } from "@/types";
import { useEnrolStudent } from "../hooks/use-enrol-student";
import {
  emptyNewStudentForm,
  newStudentFormSchema,
  toEnrolRequest,
  type NewStudentFormValues,
} from "../validations/enrollment-schema";
import { EnrollmentTermField } from "./enrollment-term-field";

/**
 * Create a profile and enrol it in one step (direction.md §7).
 *
 * Five fields, because the spec asks for "the minimum information necessary
 * for the initial enrollment". Everything else on a profile — date of birth,
 * phone, interests, projects, emergency contact — belongs to profile editing
 * (§10), where someone is doing that job rather than getting a student onto a
 * roster. A registration form that asks for all of §9 before anyone can be
 * enrolled is how a demo of an enrollment flow turns into a demo of a long form.
 *
 * **Program is absent on purpose.** It comes from the term, which is the only
 * way the new profile and the membership created beside it cannot disagree.
 */
export function NewStudentForm({
  terms,
  defaultTermId,
  onDone,
  onCancel,
}: {
  terms: EnrollmentTermOption[];
  /** Preselected when the screen already knows which term is meant. */
  defaultTermId?: string;
  onDone: (result: EnrollmentResult) => void;
  onCancel: () => void;
}) {
  const enrol = useEnrolStudent();

  const form = useForm<NewStudentFormValues>({
    resolver: zodResolver(newStudentFormSchema),
    defaultValues: {
      ...emptyNewStudentForm,
      programTermId: defaultTermId ?? terms[0]?.id ?? "",
    },
  });

  const termId = useWatch({ control: form.control, name: "programTermId" });
  const term = terms.find((option) => option.id === termId);

  async function onSubmit(values: NewStudentFormValues) {
    try {
      const result = await enrol.mutateAsync(toEnrolRequest(values, "new-student"));
      onDone(result);
    } catch (error) {
      if (error instanceof HttpError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          // The server keys new-student errors under `student.<field>`, because
          // that is where they sit in the request. The form is flat, so the
          // prefix comes off on the way in.
          const key = field.startsWith("student.") ? field.slice("student.".length) : field;
          form.setError(key as keyof NewStudentFormValues, { type: "server", message });
        }
        return;
      }
      form.setError("root", {
        type: "server",
        message: "That student could not be enrolled. Please try again.",
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
            <EnrollmentTermField terms={terms} value={field.value} onChange={field.onChange} />
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="off" {...field} />
              </FormControl>
              <FormDescription>
                Identifies the person to the institution, so it has to be new.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="major"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Major</FormLabel>
                <FormControl>
                  <Input placeholder="Software Engineering" autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>
                  {term ? `Program is ${term.programName}, from the term.` : "Within the program."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="yearLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year level</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    {...field}
                    // A number input still hands back a string.
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormActions
          onCancel={onCancel}
          submitLabel="Create and enrol"
          isSubmitting={enrol.isPending}
          error={form.formState.errors.root?.message}
        />
      </form>
    </Form>
  );
}
