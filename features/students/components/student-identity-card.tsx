import { Building2, GraduationCap, Mail, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { PetalCorner } from "@/components/decor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants";
import type { Student } from "@/types";
import { yearLevelLabel } from "../constants";

/**
 * Who this student is, as one card (direction.md §9).
 *
 * The identity sits apart from the detail because it is the thing a reader
 * checks they are on the right profile with — name, programme, how to reach
 * them — and then stops reading. Everything below it is reference material.
 *
 * **The banner is the petal layer, not a photograph.** A stock building shot
 * would be third-party imagery, which the mock-data rule forbids, and PRIME has
 * no image storage to put a real one in. The decoration already in the design
 * system does the same job of giving the card a top edge.
 *
 * The avatar shows the picture when the profile carries one and initials
 * otherwise. No student in the seed has one: a picture is chosen on the edit
 * screen, held as a `data:` URL and lost on reload like every other write here,
 * so initials are the resting state rather than a placeholder for a missing
 * feature.
 */
export function StudentIdentityCard({ student }: { student: Student }) {
  const { personal, academic } = student;
  const fullName = `${personal.firstName} ${personal.lastName}`;
  const initials = `${personal.firstName.at(0) ?? ""}${personal.lastName.at(0) ?? ""}`;

  return (
    <div className="relative overflow-hidden rounded-lg border border-hairline bg-card shadow-xs">
      <div className="relative h-28 bg-gradient-to-br from-primary/25 via-tone-pink to-tone-blue">
        <PetalCorner />
      </div>

      <div className="-mt-12 flex flex-col items-center px-5 pb-5 text-center">
        <Avatar className="size-24 border-4 border-card shadow-xs">
          {personal.avatarUrl ? <AvatarImage src={personal.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-xl font-medium">
            {initials.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h2 className="mt-3 text-lg font-semibold text-foreground">{fullName}</h2>
        <p className="text-xs text-muted-foreground" data-numeric>
          {student.studentId}
        </p>

        <dl className="mt-4 grid w-full gap-2 text-left">
          <Detail icon={GraduationCap} label="Programme">
            {academic.program} · {yearLevelLabel(academic.yearLevel)}
          </Detail>
          <Detail icon={Building2} label="Major">
            {academic.major}
          </Detail>
          <Detail icon={Mail} label="Email">
            {personal.email}
          </Detail>
          {personal.phone ? (
            <Detail icon={Phone} label="Phone">
              {personal.phone}
            </Detail>
          ) : null}
        </dl>

        <Button asChild variant="outline" className="mt-5 w-full gap-1.5">
          <Link href={routes.studentEdit(student.id)}>
            <Pencil className="size-3.5" aria-hidden />
            Edit profile
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="truncate text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}
