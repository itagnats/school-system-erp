"use client";

import { UserRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DemoPersona } from "@/types";
import { EVALUATION_ROLE_LABEL } from "../constants";

/**
 * Who you are, for the demo (direction.md §14).
 *
 * PRIME has no sign-in, so the evaluator screens need an answer to "you" before
 * they can show anything. This control supplies it, and it is not a shortcut
 * around building auth - it is what makes the four roles and the
 * no-self-assessment rule visible rather than merely described. A reader
 * switches to a student, sees their own name absent from their peer list, and
 * the rule has demonstrated itself.
 *
 * Scoped to the evaluation area rather than the app shell: the administrative
 * screens have no "you", and a global identity control would imply otherwise.
 */
export function PersonaSwitcher({
  personas,
  personaId,
  onChange,
}: Readonly<{
  personas: DemoPersona[];
  personaId?: string;
  onChange: (personaId: string) => void;
}>) {
  if (personas.length === 0) return null;

  const current = personas.find((persona) => persona.id === personaId) ?? personas[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="persona" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserRound aria-hidden className="size-3.5" />
        Acting as
      </Label>
      <Select value={current.id} onValueChange={onChange}>
        <SelectTrigger id="persona" size="sm" className="w-auto min-w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {personas.map((persona) => (
            <SelectItem key={persona.id} value={persona.id}>
              {describe(persona)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">
        No sign-in — this is a demo identity
      </span>
    </div>
  );
}

/**
 * Role first, then who, then where.
 *
 * The role is what a reader is choosing between, so it leads. The
 * course-semester matters because a persona is a role *in a cohort* and its
 * queue depends on which.
 */
function describe(persona: DemoPersona): string {
  const where = `${persona.courseCode} ${persona.semesterCode}`;
  return `${EVALUATION_ROLE_LABEL[persona.role]} · ${persona.displayName} · ${where}`;
}
