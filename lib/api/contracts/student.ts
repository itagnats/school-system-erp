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

/**
 * Profile editing (direction.md 10).
 *
 * **One section per request, not a partial profile.** The spec asks for the
 * profile to be "separated into logical sections rather than being one giant
 * form", and the wire follows the screen: a discriminated union on `section`
 * means each request carries one complete section, so the server never has to
 * guess whether an absent field means "unchanged" or "cleared".
 *
 * That also sidesteps the trap recorded against the course contract. Building
 * an update schema as `create.partial()` keeps every `.default()` in place, so
 * a request carrying one field validates into an object with the rest filled
 * with empty defaults, and merging that over the stored record wipes them. A
 * whole section in, a whole section out, and nothing to merge.
 */
/**
 * A profile picture, carried as a `data:` URL (decided 2026-09-16).
 *
 * **Only a data URL, never an arbitrary one.** The Content-Security-Policy in
 * `next.config.ts` sets `img-src 'self' data: blob:`, so an external address
 * would be blocked by the browser and the card would render nothing with no
 * error to explain it. Accepting only what can actually be displayed keeps the
 * failure at the point of entry, and it stops a profile pointing an image tag
 * at somebody else's server.
 *
 * The limit is on the encoded string, because that is what crosses the wire.
 * Base64 costs about a third, so 300,000 characters is roughly a 200KB image -
 * generous for an avatar and small enough to travel in a JSON body.
 */
export const MAX_AVATAR_CHARS = 300_000;

const avatarUrl = z
  .string()
  .regex(
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/,
    "Choose a PNG, JPEG or WebP image",
  )
  .max(MAX_AVATAR_CHARS, "That image is too large - keep it under about 200KB");

const personalFields = {
  avatarUrl: avatarUrl.optional(),
  firstName: z.string().trim().min(1, "Give the student a first name").max(60, "That first name is too long for a table row"),
  lastName: z.string().trim().min(1, "Give the student a last name").max(60, "That last name is too long for a table row"),
  email: z.email("Use an email address like name@example.ac.th"),
  phone: z.string().trim().max(30, "That phone number is too long").optional(),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2004-05-31")
    .optional(),
};

/** A list a person types: short entries, and not an unbounded one. */
const tagList = z
  .array(z.string().trim().min(1, "Blank entries are not kept").max(60, "Keep each entry short"))
  .max(20, "Twenty entries is the maximum")
  // Typing one twice is a slip rather than an error, so it is dropped rather
  // than rejected. The form does the same on its way out; doing it here as well
  // is what makes it true of the endpoint and not only of this screen.
  .transform((entries) => [...new Set(entries)]);

const academicFields = {
  major: z.string().trim().min(2, "Name the major").max(80, "That major is too long to fit a profile"),
  yearLevel: z
    .number({ message: "Year level must be a number" })
    .int("Year level is a whole number")
    .min(1, "Year level starts at 1")
    .max(4, "Year level goes up to 4"),
  interests: tagList,
  skills: tagList,
  certifications: tagList,
};

/**
 * All three fields or none.
 *
 * A phone number with nobody attached to it is not a contact, and a name with
 * no number cannot be rung. Blanking all three is how a contact is removed,
 * which is why this is a refinement rather than three required fields.
 */
export const emergencyContactSchema = z
  .object({
    name: z.string().trim().max(80, "That name is too long"),
    relationship: z.string().trim().max(40, "Keep the relationship short"),
    phone: z.string().trim().max(30, "That phone number is too long"),
  })
  .superRefine((value, ctx) => {
    const filled = [value.name, value.relationship, value.phone].filter(Boolean).length;
    if (filled === 0 || filled === 3) return;
    for (const key of ["name", "relationship", "phone"] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Fill all three, or clear all three to remove the contact",
        });
      }
    }
  });

export const studentUpdateSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("personal"), personal: z.object(personalFields) }),
  z.object({ section: z.literal("academic"), academic: z.object(academicFields) }),
  z.object({ section: z.literal("emergency-contact"), emergencyContact: emergencyContactSchema }),
]);

export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
export type StudentSection = StudentUpdateInput["section"];
