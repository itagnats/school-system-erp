import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { HttpError } from "@/lib/api";

/**
 * Put a 422's field errors where the reader can act on them.
 *
 * Shared by both create dialogs because the mapping is the same and it is
 * fiddly enough to get wrong twice. Two details, both found by probing the
 * running endpoint rather than by reading the code:
 *
 *   1. **the same failure arrives under two keys.** `programCreateSchema`
 *      nests the term, so a contract failure comes back as
 *      `firstTerm.courseIds`, while the service validates the term on its own
 *      and returns a bare `courseIds`. Matching one of them drops half the
 *      errors silently;
 *   2. **the curriculum has no form field.** It is an ordered list of whole
 *      course records held outside react-hook-form, so `setError` has nothing
 *      to attach to and the message would vanish. It goes to the picker's own
 *      error line instead.
 *
 * Returns false when the error is not a 422 with field errors, so the caller
 * can fall back to a message on the root.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  setCurriculumError: (message: string) => void,
): boolean {
  if (!(error instanceof HttpError) || !error.fieldErrors) return false;

  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const name = field.replace(/^firstTerm\./, "");

    if (name === "courseIds") {
      setCurriculumError(message);
      continue;
    }

    // `programId` is not on either form - it comes from the page. An error on
    // it is a bug rather than something the reader typed, so it belongs on
    // the root line rather than nowhere.
    setError((name === "programId" ? "root" : name) as Path<T>, {
      type: "server",
      message,
    });
  }

  return true;
}
