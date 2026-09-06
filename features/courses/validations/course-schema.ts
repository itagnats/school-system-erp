import type { z } from "zod";
import { courseCreateSchema } from "@/lib/api/contracts";
import type { CourseCreateInput } from "@/lib/api/contracts";
import type { Course } from "@/types";

/**
 * Form validation for the course dialog.
 *
 * The schema itself is the wire contract, re-exported rather than restated. A
 * second copy here would drift from the one the route handler validates
 * against, and the failure mode of that drift is a form that accepts input the
 * server rejects - which is exactly the 422 the form is meant to prevent.
 *
 * What belongs in this file is the form-shaped part: default values, and the
 * mapping from an existing record back into a form.
 */
export { courseCreateSchema, courseUpdateSchema } from "@/lib/api/contracts";

/**
 * What the form holds, which is not what the endpoint receives.
 *
 * `description` and `offeredIn` carry Zod defaults, so the schema input type
 * has them optional while the output type has them filled in. React Hook Form
 * needs the input type for its field values and the output type for the
 * submit handler; conflating the two is the resolver type error this avoids.
 */
export type CourseFormValues = z.input<typeof courseCreateSchema>;
export type { CourseCreateInput, CourseUpdateInput } from "@/lib/api/contracts";

export const emptyCourseForm: CourseCreateInput = {
  code: "",
  name: "",
  description: "",
  credits: 3,
  status: "draft",
  offeredIn: [],
};

export function courseToForm(course: Course): CourseCreateInput {
  return {
    code: course.code,
    name: course.name,
    description: course.description,
    credits: course.credits,
    status: course.status,
    offeredIn: course.offeredIn,
  };
}
