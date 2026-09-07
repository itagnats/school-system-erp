import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

/**
 * The person an evaluation is about.
 *
 * A face rather than a name badge, because every screen in this feature is a
 * list of people and a column of identical pills is harder to move through than
 * a column of distinguishable ones. There are no photographs in this demo, so
 * the fallback carries the whole job.
 *
 * ## Why not just `initials()`
 *
 * The fixtures name people "Student 032", so `initials("Student", "032")` gives
 * "S0" - and every student in a group would read as S0, S1, S2, differing only
 * in the second character. The digits are the identity in these names, so a
 * numeric last token wins. Staff names like "IT101 teacher" fall through to
 * ordinary initials.
 *
 * Real names would need none of this, which is why the rule lives here in the
 * feature rather than in `initials()` itself.
 */
export function SubjectAvatar({
  displayName,
  size = "default",
}: Readonly<{ displayName: string; size?: "sm" | "default" | "lg" }>) {
  return (
    <Avatar size={size}>
      {/* aria-hidden: the name is always rendered beside this, so announcing
          "S0" as well would just be noise. */}
      <AvatarFallback aria-hidden className="font-medium">
        {avatarLabel(displayName)}
      </AvatarFallback>
      <span className="sr-only">{displayName}</span>
    </Avatar>
  );
}

function avatarLabel(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return initials(parts[0]);

  const last = parts[parts.length - 1];

  // "Student 032" -> "032". The digits are the identity.
  if (/^\d+$/.test(last)) return last.slice(-3);

  // "IT101 teacher" -> "TE", "IT101 TA" -> "TA".
  //
  // The last word, not the initials of both: `initials("IT101", "teacher")` and
  // `initials("IT101", "TA")` are both "IT", so the teacher and the TA of the
  // same course rendered identically in the same table. The course code is
  // shared context; the role is what distinguishes them.
  if (/^[A-Za-z]+\d/.test(parts[0])) return last.slice(0, 2).toUpperCase();

  // A real name: ordinary initials.
  return initials(parts[0], last);
}
