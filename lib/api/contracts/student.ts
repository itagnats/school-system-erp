import { z } from "zod";
import type { StudentSummary } from "@/types";
import { paginatedSchema } from "./list";

/** The trimmed shape a table needs. The full profile is a separate endpoint. */
export const studentSummarySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  fullName: z.string(),
  program: z.string(),
  major: z.string(),
  yearLevel: z.number(),
  avatarUrl: z.string().optional(),
}) satisfies z.ZodType<StudentSummary>;

export const studentListSchema = paginatedSchema(studentSummarySchema);
