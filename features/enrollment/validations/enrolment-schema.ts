import { z } from "zod";
import { newStudentSchema, type EnrolRequestInput } from "@/lib/api/contracts";

/**
 * Form shapes for the three enrolment paths (direction.md §7).
 *
 * The wire contract is a discriminated union, which is right for a request and
 * wrong for a form: react-hook-form holds one flat object per form, and a
 * union cannot be a set of default values. So each path gets a flat schema
 * here, and `toEnrolRequest` maps it onto the contract at the moment of
 * submission.
 *
 * The new-student fields are **not** redeclared. They are the contract's own
 * `newStudentSchema`, spread in, so the message under an input is the same
 * message the server would have produced if the browser had skipped the check
 * entirely. Two copies of a validation rule are two rules that drift.
 */

export const pickStudentFormSchema = z.object({
  programTermId: z.string().min(1, "Choose a programme term"),
  studentId: z.string().min(1, "Choose a student"),
});

export type PickStudentFormValues = z.infer<typeof pickStudentFormSchema>;

export const newStudentFormSchema = z.object({
  programTermId: z.string().min(1, "Choose a programme term"),
  ...newStudentSchema.shape,
});

export type NewStudentFormValues = z.infer<typeof newStudentFormSchema>;

/**
 * An empty new-student form.
 *
 * `yearLevel` starts at 1 rather than blank because the field is a number and
 * an empty number input hands back `NaN`, which reads as "Year level must be a
 * number" before the user has typed anything.
 */
export const emptyNewStudentForm: NewStudentFormValues = {
  programTermId: "",
  firstName: "",
  lastName: "",
  email: "",
  major: "",
  yearLevel: 1,
};

export function toEnrolRequest(
  values: PickStudentFormValues | NewStudentFormValues,
  source: EnrolRequestInput["source"],
): EnrolRequestInput {
  if (source === "new-student") {
    const { programTermId, ...student } = values as NewStudentFormValues;
    return { source, programTermId, student };
  }

  const { programTermId, studentId } = values as PickStudentFormValues;
  return { source, programTermId, studentId };
}
