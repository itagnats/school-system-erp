"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormActions, FormSection } from "@/components/forms";
import { Section } from "@/components/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { courseCodeSchema, requiredText } from "@/lib/validations";
import { Demo } from "../_components/demo";

/**
 * The React Hook Form bindings, wired to a real Zod schema.
 *
 * Submit with the fields empty to see what the accessibility wiring buys: the
 * message is linked by aria-describedby, the control carries aria-invalid, and
 * the label turns. A screen reader reaches the error, rather than it being red
 * text only a sighted user can find.
 */
const schema = z.object({
  code: courseCodeSchema,
  name: requiredText("Course name", 120),
  // A text input hands back a string, so the schema validates a string rather
  // than coercing. Coercion here would make the form value type `unknown`.
  credits: z
    .string()
    .regex(/^\d+$/, "Use a whole number.")
    .refine((v) => Number(v) >= 1 && Number(v) <= 12, "Between 1 and 12 credits."),
  status: z.enum(["draft", "active", "archived"]),
  description: z.string().trim().max(400).optional(),
});

type FormValues = z.input<typeof schema>;

export function FormDemo() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      credits: "3",
      status: "draft",
      description: "",
    },
  });

  return (
    <Section id="form-bindings"
      title="Form bindings"
      description="components/ui/form.tsx over React Hook Form and Zod. Submit empty to see validation, focus and announcement behavior."
    >
      <Demo
        title="Course form"
        note="Long forms are assembled from FormSection blocks, each with its own heading, rather than one continuous field list."
        contentClassName="bg-card"
      >
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
              toast.success(`Saved ${values.code}`);
            })}
            className="flex flex-col gap-6"
          >
            <FormSection
              title="Identity"
              description="How the course is referred to across the application."
            >
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="IT101"
                        style={{ height: "var(--field-h)" }}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Two to four letters, then three digits.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Introduction to Information Technology"
                        style={{ height: "var(--field-h)" }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSection title="Delivery" description="Weighting and lifecycle state.">
              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        style={{ height: "var(--field-h)" }}
                        {...field}
                      />
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
                        <SelectTrigger
                          className="w-full"
                          style={{ height: "var(--field-h)" }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-full">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormActions
              submitLabel="Save course"
              cancelLabel="Reset"
              isSubmitting={form.formState.isSubmitting}
              onCancel={() => form.reset()}
            />
          </form>
        </Form>
      </Demo>
    </Section>
  );
}
