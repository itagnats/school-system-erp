"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormActions } from "@/components/forms";
import { Section } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HttpError } from "@/lib/api";
import { routes } from "@/lib/constants";
import type { Student } from "@/types";
import { updateStudent } from "../services/student-service";
import { AvatarField } from "./avatar-field";
import {
  academicFormSchema,
  academicToForm,
  academicToRequest,
  emergencyContactFormSchema,
  emergencyContactToForm,
  emergencyContactToRequest,
  personalFormSchema,
  personalToForm,
  personalToRequest,
  type AcademicFormValues,
  type EmergencyContactFormValues,
  type PersonalFormValues,
} from "../validations/student-schema";

/**
 * Profile editing, one section per tab (direction.md §10).
 *
 * §10 asks for the profile to be "separated into logical sections rather than
 * being one giant form", and the tabs are that separation made navigable: each
 * tab is its own form, its own validation and its own save. Correcting a phone
 * number does not re-submit a major, and an email the server rejects does not
 * hold the rest of the profile hostage.
 *
 * **Three tabs, not four.** Personal, academic and emergency contact are field
 * editing. Experience is list management — adding and removing projects, clubs
 * and achievements — which is a different interaction and is not built; it
 * stays visible and read-only on the profile rather than appearing here as a
 * tab that looks editable and is not.
 *
 * **The saved profile is held in state.** The page that renders this is server
 * -rendered, so there is no query cache to patch; without this, a saved section
 * would show the server's copy again on the next render. Same decision as
 * `setQueryData` after a mutation elsewhere, and for the same reason — the BFF
 * validates a write and stores nothing, so the client carries the result until
 * reload.
 */
export function StudentEditScreen({ initial }: { initial: Student }) {
  const [student, setStudent] = useState(initial);
  const router = useRouter();

  const fullName = `${student.personal.firstName} ${student.personal.lastName}`;
  const initials = `${student.personal.firstName.at(0) ?? ""}${
    student.personal.lastName.at(0) ?? ""
  }`;

  function done() {
    router.push(routes.student(student.id));
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Avatar className="size-12">
          {student.personal.avatarUrl ? (
            <AvatarImage src={student.personal.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="font-medium">{initials.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Edit profile</h1>
          <p className="text-sm text-muted-foreground">
            {fullName} · <span data-numeric>{student.studentId}</span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="emergency" className="gap-1.5">
            Emergency contact
            {student.emergencyContact ? null : (
              // Marks a section with nothing recorded, which is the one piece
              // of this profile a reader might reasonably expect to be filled
              // in. Not a validation error: an emergency contact is optional
              // (direction.md §9, "where appropriate").
              <span
                className="size-1.5 rounded-full bg-primary"
                aria-label="nothing recorded"
              />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-3">
          <Section title="Personal information">
            <PersonalForm student={student} onSaved={setStudent} onDone={done} />
          </Section>
        </TabsContent>

        <TabsContent value="academic" className="mt-3">
          <Section
            title="Academic information"
            description={`Programme is ${student.academic.program}, set by enrolment rather than here.`}
          >
            <AcademicForm student={student} onSaved={setStudent} onDone={done} />
          </Section>
        </TabsContent>

        <TabsContent value="emergency" className="mt-3">
          <Section title="Emergency contact">
            <EmergencyContactForm student={student} onSaved={setStudent} onDone={done} />
          </Section>
        </TabsContent>
      </Tabs>
    </>
  );
}

interface SectionFormProps {
  student: Student;
  onSaved: (student: Student) => void;
  onDone: () => void;
}

/**
 * The one place a server rejection becomes form state.
 *
 * A 422 arrives as an `HttpError` carrying `fieldErrors` keyed by field name,
 * and those go onto the form so each message lands under the input that caused
 * it — a rule the client cannot know, such as another student already holding
 * an email address, then surfaces in the same place as a length check.
 * Anything without field detail is a transport fault, and a form is not the
 * place to explain one.
 *
 * Two key shapes arrive and both have to land on a flat form. Zod reports the
 * path it validated — `emergencyContact.relationship`, `personal.email` — while
 * the service reports the field it rejected — `email`. And an array issue
 * carries its index, `skills.3`, where the form has one control for the whole
 * list. So: drop a leading section name if there is one, then keep the first
 * segment of what is left.
 *
 * Found by curling the endpoint rather than by reading it. Taking segment zero
 * looked obviously right and silently dropped every prefixed message, which on
 * screen is a form that rejects a save and explains nothing.
 */
const SECTION_KEYS = new Set(["personal", "academic", "emergencyContact"]);

function formFieldFor(path: string): string {
  const parts = path.split(".");
  if (parts.length > 1 && SECTION_KEYS.has(parts[0])) parts.shift();
  return parts[0];
}

function applyServerErrors<T extends Record<string, unknown>>(
  error: unknown,
  setError: (field: keyof T & string, message: string) => void,
  setRootError: (message: string) => void,
): void {
  if (error instanceof HttpError && error.fieldErrors) {
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      setError(formFieldFor(field) as keyof T & string, message);
    }
    return;
  }
  setRootError("That could not be saved. Please try again.");
}

function PersonalForm({ student, onSaved, onDone }: SectionFormProps) {
  const [pending, setPending] = useState(false);
  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: personalToForm(student),
  });

  async function onSubmit(values: PersonalFormValues) {
    setPending(true);
    try {
      const saved = await updateStudent(student.id, personalToRequest(values));
      onSaved(saved);
      form.reset(personalToForm(saved));
      toast.success("Personal information saved");
    } catch (error) {
      applyServerErrors<PersonalFormValues>(
        error,
        (field, message) => form.setError(field, { type: "server", message }),
        (message) => form.setError("root", { type: "server", message }),
      );
    } finally {
      setPending(false);
    }
  }

  const initials = `${student.personal.firstName.at(0) ?? ""}${
    student.personal.lastName.at(0) ?? ""
  }`.toUpperCase();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile picture</FormLabel>
              <AvatarField
                value={field.value}
                initials={initials}
                onChange={field.onChange}
              />
              {/* The server rejects anything that is not a small data URL, and
                  that message belongs under this control rather than in the
                  form-level slot. */}
              <FormMessage />
            </FormItem>
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
                Identifies the student to the institution, so no two profiles share one.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Optional.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>Optional.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormActions
          onCancel={onDone}
          cancelLabel="Back to profile"
          submitLabel="Save personal"
          isSubmitting={pending}
          error={form.formState.errors.root?.message}
        />
      </form>
    </Form>
  );
}

function AcademicForm({ student, onSaved, onDone }: SectionFormProps) {
  const [pending, setPending] = useState(false);
  const form = useForm<AcademicFormValues>({
    resolver: zodResolver(academicFormSchema),
    defaultValues: academicToForm(student),
  });

  async function onSubmit(values: AcademicFormValues) {
    setPending(true);
    try {
      const saved = await updateStudent(student.id, academicToRequest(values));
      onSaved(saved);
      form.reset(academicToForm(saved));
      toast.success("Academic information saved");
    } catch (error) {
      applyServerErrors<AcademicFormValues>(
        error,
        (field, message) => form.setError(field, { type: "server", message }),
        (message) => form.setError("root", { type: "server", message }),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="major"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Major</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
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

        {(
          [
            ["skills", "Skills"],
            ["interests", "Interests"],
            ["certifications", "Certifications"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Separate with commas.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <FormActions
          onCancel={onDone}
          cancelLabel="Back to profile"
          submitLabel="Save academic"
          isSubmitting={pending}
          error={form.formState.errors.root?.message}
        />
      </form>
    </Form>
  );
}

function EmergencyContactForm({ student, onSaved, onDone }: SectionFormProps) {
  const [pending, setPending] = useState(false);
  const form = useForm<EmergencyContactFormValues>({
    resolver: zodResolver(emergencyContactFormSchema),
    defaultValues: emergencyContactToForm(student),
  });

  async function onSubmit(values: EmergencyContactFormValues) {
    setPending(true);
    try {
      const saved = await updateStudent(student.id, emergencyContactToRequest(values));
      onSaved(saved);
      form.reset(emergencyContactToForm(saved));
      toast.success(
        saved.emergencyContact ? "Emergency contact saved" : "Emergency contact removed",
      );
    } catch (error) {
      applyServerErrors<EmergencyContactFormValues>(
        error,
        (field, message) => form.setError(field, { type: "server", message }),
        (message) => form.setError("root", { type: "server", message }),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <FormControl>
                  <Input autoComplete="off" placeholder="Parent" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Fill all three, or clear all three to remove the contact. A phone number with
          nobody attached to it is not a contact.
        </p>

        <FormActions
          onCancel={onDone}
          cancelLabel="Back to profile"
          submitLabel="Save contact"
          isSubmitting={pending}
          error={form.formState.errors.root?.message}
        />
      </form>
    </Form>
  );
}
