"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { HttpError } from "@/lib/api";
import type { Course } from "@/types";
import { COURSE_STATUS_OPTIONS } from "../constants";
import { useCreateCourse, useUpdateCourse } from "../hooks/use-course-mutations";
import {
  courseCreateSchema,
  courseToForm,
  emptyCourseForm,
  type CourseCreateInput,
  type CourseFormValues,
} from "../validations/course-schema";

/**
 * Create and edit a course.
 *
 * The same dialog does both, because the fields are identical and two
 * near-duplicate forms drift. `course` being present is what switches it.
 *
 * The part worth reading is the error path: a 422 from the BFF arrives as an
 * `HttpError` carrying `fieldErrors` keyed by field name, and those are pushed
 * onto the form so each message lands under the input that caused it. A server
 * rule the client cannot know - a course code already being taken - therefore
 * surfaces in the same place as a client-side length check.
 */
export function CourseFormDialog({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Present when editing, absent when creating.
   *
   * `offeredIn` is deliberately not editable here: scheduling a course into a
   * semester is a different decision from describing it, and folding the two
   * into one dialog would make the semester field look like a formality.
   */
  course?: Course;
}) {
  const isEdit = Boolean(course);
  const create = useCreateCourse();
  const update = useUpdateCourse();
  const pending = create.isPending || update.isPending;

  const form = useForm<CourseFormValues, unknown, CourseCreateInput>({
    resolver: zodResolver(courseCreateSchema),
    defaultValues: course ? courseToForm(course) : emptyCourseForm,
  });

  // Reopening the dialog for a different row has to reload the form: react-hook
  // -form keeps its values across renders, so without this an edit would open
  // showing the previous course.
  useEffect(() => {
    if (open) form.reset(course ? courseToForm(course) : emptyCourseForm);
  }, [open, course, form]);

  async function onSubmit(values: CourseCreateInput) {
    try {
      if (course) {
        await update.mutateAsync({ courseId: course.id, input: values });
      } else {
        await create.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof HttpError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof CourseFormValues, { type: "server", message });
        }
        return;
      }
      // Anything without field detail is a transport or server fault, and the
      // form is not the place to explain it.
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
          <DialogTitle>{isEdit ? `Edit ${course?.code}` : "New course"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes are validated and returned, but this demo stores nothing."
              : "A course code identifies the course to a person, so it has to be unique."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="IT101" autoComplete="off" {...field} />
                    </FormControl>
                    <FormDescription>Two to four letters, then three digits.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={12}
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
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Introduction to Information Technology" {...field} />
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
                    <Textarea rows={3} {...field} />
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COURSE_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    A draft course is not scheduled in any semester.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormActions
              onCancel={() => onOpenChange(false)}
              submitLabel={isEdit ? "Save changes" : "Create course"}
              isSubmitting={pending}
              error={form.formState.errors.root?.message}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
