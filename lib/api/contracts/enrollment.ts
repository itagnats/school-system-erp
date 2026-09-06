import { z } from "zod";
import type { EnrollmentListItem } from "@/types";
import { paginatedSchema } from "./list";
import { studentSummarySchema } from "./student";

export const enrollmentListItemSchema = z.object({
  id: z.string(),
  student: studentSummarySchema,
  courseId: z.string(),
  courseCode: z.string(),
  semesterCode: z.string(),
  status: z.enum([
    "pending",
    "enrolled",
    "active",
    "completed",
    "dropped",
    "cancelled",
  ]),
  evaluationGroupName: z.string().optional(),
}) satisfies z.ZodType<EnrollmentListItem>;

export const enrollmentListSchema = paginatedSchema(enrollmentListItemSchema);
