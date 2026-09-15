"use client";

import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/format";
import type { EnrolmentTermOption } from "@/types";

/**
 * The programme term being enrolled into (direction.md §7a).
 *
 * Every path asks this, because a student joins a programme term and the
 * course enrollments follow from its curriculum — the course is never chosen
 * by hand. The description under the control says how many enrollments the act
 * will create and what the package costs, so the consequence is visible before
 * the button is pressed rather than in a toast afterwards.
 *
 * Only open terms are in the list. `openProgramTermOptions` decides that on
 * the server; the screen does not filter a fuller list, so the two cannot
 * disagree about what is enrollable.
 *
 * Given exactly one term it stops being a question and renders as context,
 * which is what happens when the dialog is opened from a programme term rather
 * than from the flat roster.
 */
export function EnrolmentTermField({
  terms,
  value,
  onChange,
}: {
  terms: EnrolmentTermOption[];
  value: string;
  onChange: (termId: string) => void;
}) {
  const chosen = terms.find((term) => term.id === value);

  // Opened from a programme term, the term is context the screen arrived with
  // rather than a question to ask again. A select holding one option is a
  // control that cannot be used, and asking someone to re-state what the URL
  // already says is how a flow starts feeling like paperwork.
  if (terms.length === 1) {
    const only = terms[0];
    return (
      <div className="rounded-md border border-hairline bg-muted/40 px-3 py-2">
        <p className="text-sm font-medium">
          {only.programCode} · {only.semesterCode} · {only.programName}
        </p>
        <p className="text-xs text-muted-foreground">{describe(only)}</p>
      </div>
    );
  }

  return (
    <FormItem>
      <FormLabel>Programme term</FormLabel>
      <Select value={value} onValueChange={onChange}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a programme term" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {terms.map((term) => (
            <SelectItem key={term.id} value={term.id}>
              {term.programCode} · {term.semesterCode} · {term.programName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription>{describe(chosen)}</FormDescription>
      <FormMessage />
    </FormItem>
  );
}

/**
 * What choosing this term will do, in one line.
 *
 * Read before the button is pressed rather than discovered in a toast
 * afterwards: a curriculum of four courses means four enrollments, and the
 * package price is what the invoice for them will carry.
 */
function describe(term: EnrolmentTermOption | undefined): string {
  if (!term) {
    return "Enrolment is entered at the programme level; the course enrollments follow.";
  }
  const noun = term.courseCount === 1 ? "enrollment" : "enrollments";
  const price = formatCurrency(term.packagePrice, term.currency);
  return `${term.courseCount} course ${noun} will be created from the curriculum. Package ${price}.`;
}
