import { z } from "zod";
import type { StudentUpdateInput } from "@/lib/api/contracts";
import type { Student } from "@/types";

/**
 * Form shapes for profile editing (direction.md §10).
 *
 * One schema per section, because the screen is one form per section and
 * react-hook-form holds one flat object per form. The wire contract is the
 * same three sections as a discriminated union; these convert between them.
 *
 * **Tag lists are a comma-separated string in the form and an array on the
 * wire.** A tag editor is a bigger interaction than this screen needs, and a
 * text field a person can type into is the smallest thing that demonstrates
 * the capability. The split happens at the boundary, once, rather than in
 * three components.
 */

export const personalFormSchema = z.object({
  // Validated on the server against the data-URL rule; the field itself only
  // ever holds what the picker produced or an empty string for "no picture".
  avatarUrl: z.string(),
  firstName: z.string().trim().min(1, "Give the student a first name").max(60, "That first name is too long"),
  lastName: z.string().trim().min(1, "Give the student a last name").max(60, "That last name is too long"),
  email: z.email("Use an email address like name@example.ac.th"),
  phone: z.string().trim().max(30, "That phone number is too long"),
  dateOfBirth: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Use a date like 2004-05-31"),
});

export type PersonalFormValues = z.infer<typeof personalFormSchema>;

export const academicFormSchema = z.object({
  major: z.string().trim().min(2, "Name the major").max(80, "That major is too long"),
  yearLevel: z
    .number({ message: "Year level must be a number" })
    .int("Year level is a whole number")
    .min(1, "Year level starts at 1")
    .max(4, "Year level goes up to 4"),
  interests: z.string(),
  skills: z.string(),
  certifications: z.string(),
});

export type AcademicFormValues = z.infer<typeof academicFormSchema>;

export const emergencyContactFormSchema = z.object({
  name: z.string().trim().max(80, "That name is too long"),
  relationship: z.string().trim().max(40, "Keep the relationship short"),
  phone: z.string().trim().max(30, "That phone number is too long"),
});

export type EmergencyContactFormValues = z.infer<typeof emergencyContactFormSchema>;

/** Duplicates are dropped rather than rejected: typing one twice is a slip, not an error. */
export function splitTags(value: string): string[] {
  return [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
}

export function joinTags(values: string[]): string {
  return values.join(", ");
}

export function personalToForm(student: Student): PersonalFormValues {
  return {
    avatarUrl: student.personal.avatarUrl ?? "",
    firstName: student.personal.firstName,
    lastName: student.personal.lastName,
    email: student.personal.email,
    phone: student.personal.phone ?? "",
    dateOfBirth: student.personal.dateOfBirth ?? "",
  };
}

export function academicToForm(student: Student): AcademicFormValues {
  return {
    major: student.academic.major,
    yearLevel: student.academic.yearLevel,
    interests: joinTags(student.academic.interests),
    skills: joinTags(student.academic.skills),
    certifications: joinTags(student.academic.certifications),
  };
}

export function emergencyContactToForm(student: Student): EmergencyContactFormValues {
  return {
    name: student.emergencyContact?.name ?? "",
    relationship: student.emergencyContact?.relationship ?? "",
    phone: student.emergencyContact?.phone ?? "",
  };
}

/**
 * An empty optional field is sent as absent rather than as an empty string.
 * "No phone number recorded" and "a phone number that is the empty string" are
 * different claims, and only one of them is true.
 */
export function personalToRequest(values: PersonalFormValues): StudentUpdateInput {
  return {
    section: "personal",
    personal: {
      avatarUrl: values.avatarUrl || undefined,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
    },
  };
}

export function academicToRequest(values: AcademicFormValues): StudentUpdateInput {
  return {
    section: "academic",
    academic: {
      major: values.major,
      yearLevel: values.yearLevel,
      interests: splitTags(values.interests),
      skills: splitTags(values.skills),
      certifications: splitTags(values.certifications),
    },
  };
}

export function emergencyContactToRequest(
  values: EmergencyContactFormValues,
): StudentUpdateInput {
  return { section: "emergency-contact", emergencyContact: values };
}
