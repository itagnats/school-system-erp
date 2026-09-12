import { z } from "zod";
import { paginatedSchema } from "./list";
import type { Invoice, InvoiceLine } from "@/types";

/**
 * Invoice wire contracts (direction.md §13b).
 *
 * The list row carries the derived totals rather than the lines. A table needs
 * a total; sending every line so the browser can add them up would move the
 * arithmetic into the client, which is what the calculation layer exists to
 * prevent.
 */

export const invoiceStatusSchema = z.enum([
  "draft",
  "issued",
  "paid",
  "overdue",
  "cancelled",
]);

export const invoiceListItemSchema = z.object({
  id: z.string(),
  number: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  studentCode: z.string(),
  semesterCode: z.string(),
  programCode: z.string(),
  programName: z.string(),
  status: invoiceStatusSchema,
  issuedOn: z.string(),
  dueOn: z.string(),
  currency: z.string(),
  subtotal: z.number(),
  creditTotal: z.number(),
  total: z.number(),
});

export const invoiceListSchema = paginatedSchema(invoiceListItemSchema);

export type InvoiceListResponse = z.infer<typeof invoiceListSchema>;

const invoiceLineSchema = z.object({
  id: z.string(),
  kind: z.enum(["course", "fee", "credit"]),
  description: z.string(),
  courseId: z.string().optional(),
  courseCode: z.string().optional(),
  credits: z.number().optional(),
  creditRate: z.number().optional(),
  creditReason: z.enum(["cancelled", "dropped"]).optional(),
  creditPercent: z.number().optional(),
  amount: z.number(),
}) satisfies z.ZodType<InvoiceLine>;

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  studentId: z.string(),
  semesterCode: z.string(),
  programTermIds: z.array(z.string()),
  status: invoiceStatusSchema,
  issuedOn: z.string(),
  dueOn: z.string(),
  paidOn: z.string().optional(),
  currency: z.string(),
  lines: z.array(invoiceLineSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Invoice>;

export const invoiceDetailSchema = z.object({
  invoice: invoiceSchema,
  totals: z.object({
    subtotal: z.number(),
    creditTotal: z.number(),
    total: z.number(),
  }),
  studentName: z.string(),
  studentCode: z.string(),
  programCode: z.string(),
  programName: z.string(),
  semesterName: z.string(),
});

export type InvoiceDetailResponse = z.infer<typeof invoiceDetailSchema>;

/**
 * What a client may change on an invoice: its status, and nothing else.
 *
 * Lines are not editable here. An invoice whose lines can be edited after it
 * has been sent is not a document, it is a draft with a number on it - and
 * §13b's grain means a line only exists because a curriculum put it there.
 *
 * Declared as its own object rather than from a create schema's `.partial()`.
 * `.partial()` keeps each field's `.default()`, so a PATCH carrying one field
 * validates to an object with the rest silently filled in - which shipped once
 * on courses and is pinned by a contract test.
 */
export const invoiceStatusUpdateSchema = z.object({
  status: invoiceStatusSchema,
  /** Optional, and only meaningful when moving to paid. */
  paidOn: z.iso
    .date("A payment date must be an ISO date, e.g. 2026-10-15")
    .optional(),
});

export type InvoiceStatusUpdateInput = z.infer<typeof invoiceStatusUpdateSchema>;
