import { CircleSlash, Copy, ShieldCheck, Sigma, type LucideIcon } from "lucide-react";
import { Section } from "@/components/shared";

/**
 * The rules the system enforces, grouped into the four ideas behind them.
 *
 * A flat list of nine rules is nine things to read in a row, and the reader has
 * to find the pattern themselves. Grouping does that work for them: the nine
 * are really four ideas applied in different places, and saying so is what
 * turns a list into something scannable.
 *
 * Tone is **grouping, not meaning** — the design system's own rule for
 * `--tone-*`, and this is exactly the case it exists for. Nothing here is a
 * state, so nothing here uses a `StatusBadge`. Each family's tone makes its
 * card read as one set; it is never the only signal, because the family is also
 * named in words and carries its own icon.
 *
 * This is the one section of the guide that is prose rather than derived, so
 * every rule names the file that enforces it. A rule stated here and nowhere
 * else would rot; a rule stated here *and* pointed at is checkable by anyone
 * who doubts it.
 */

type Tone = "pink" | "lavender" | "blue" | "green";

/**
 * Literal class strings per tone, never `bg-tone-${tone}`.
 *
 * Tailwind cannot see an interpolated class name: it compiles without an error
 * and then simply is not in the CSS. Same `Record` shape `stat-card.tsx` uses.
 */
const CHIP: Record<Tone, string> = {
  pink: "bg-tone-pink text-tone-pink-accent",
  lavender: "bg-tone-lavender text-tone-lavender-accent",
  blue: "bg-tone-blue text-tone-blue-accent",
  green: "bg-tone-green text-tone-green-accent",
};

interface Rule {
  rule: string;
  because: string;
  where: string;
}

interface Family {
  idea: string;
  /** The one sentence the rules below have in common. */
  shared: string;
  tone: Tone;
  icon: LucideIcon;
  rules: Rule[];
}

const FAMILIES: Family[] = [
  {
    idea: "Derived, never stored",
    shared:
      "If a value can be computed from what is already true, computing it deletes a way for the system to disagree with itself.",
    tone: "lavender",
    icon: Sigma,
    rules: [
      {
        rule: "An indirect share comes from credit hours",
        because:
          "Percentages typed in several places do not add to 100. Deriving the share makes the shortfall unrepresentable rather than merely detectable — it was 82 pools of 92 before.",
        where: "lib/calculations/cost.ts · distribute",
      },
      {
        rule: "An evaluation assignment is not a record",
        because:
          "It exists because some assessee card has your role switched on at a non-zero share. The management screen and the evaluator's own queue therefore cannot disagree about what you owe.",
        where: "server/services/evaluation-service.ts",
      },
    ],
  },
  {
    idea: "Evidence, not a live query",
    shared:
      "A record of what was decided must not change because something it once referred to has moved on.",
    tone: "pink",
    icon: Copy,
    rules: [
      {
        rule: "A cost sheet copies from the catalogue",
        because:
          "A signed-off total must not change because someone edited a lookup table. Drift is reported per line instead, and moving a line back onto the catalogue price is a deliberate act.",
        where: "server/services/catalogue-service.ts · copyCatalogueItem",
      },
      {
        rule: "Revenue is invoiced, not implied",
        because:
          "Price times head count is what the price implies. Profit is stated on what was collected, because a student who has been billed and has not paid is owed money rather than earned money.",
        where: "lib/calculations/profit.ts · invoice.ts",
      },
    ],
  },
  {
    idea: "Refused, not merely discouraged",
    shared:
      "A rule that lives only in a form is a suggestion. These are checked on the server, where a well-formed request can still be nonsense.",
    tone: "green",
    icon: ShieldCheck,
    rules: [
      {
        rule: "A weight blend must total 100",
        because:
          "An unbalanced blend raises no error anywhere. It scales every score in the course by the same amount and looks entirely normal.",
        where: "lib/calculations/evaluation-weights.ts",
      },
      {
        rule: "A student holds one programme, one term per semester",
        because:
          "One invoice per student per semester over one package price cannot represent a second package. A second term in the same semester is 409; another programme is 422.",
        where: "lib/calculations/enrollment.ts · findEnrolmentConflict",
      },
      {
        rule: "The kind of cost decides which sheet it may reach",
        because:
          "A direct cost belongs to one course and an indirect one to the programme. Enforcing it both ways is what makes double-counting impossible to express.",
        where: "server/services/cost-service.ts · addItemToSheet",
      },
    ],
  },
  {
    idea: "Refuses to pretend",
    shared:
      "Where the system cannot know something, it says so rather than producing a number a reader would believe.",
    tone: "blue",
    icon: CircleSlash,
    rules: [
      {
        rule: "Unknown is never zero",
        because:
          "A course with no cost sheet, a score with no submissions and a cost per student with no students are all null. Zero is a claim; null is the absence of one.",
        where: "lib/calculations/cost.ts · score.ts",
      },
      {
        rule: "Nothing reads a clock",
        because:
          "Data that differs between the server render and the client render is a hydration mismatch. Every date derives from a fixed epoch and every write takes a supplied stamp.",
        where: "data/seed/random.ts · isoFromEpoch",
      },
      {
        rule: "A write is validated and shaped, then discarded",
        because:
          "The deploy target is serverless, so there is no process to hold state and a shared store would show one visitor another's edits. The status code and the response are real; the persistence is not.",
        where: "docs/decisions/why-bff.md",
      },
    ],
  },
];

export function RulesSection() {
  const total = FAMILIES.reduce((sum, family) => sum + family.rules.length, 0);

  return (
    <Section
      id="rules"
      title="Rules the system actually enforces"
      description={`${total} decisions that shaped the code rather than describing it, and the four ideas behind them. Each names the file that holds it, so none has to be taken on trust.`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {FAMILIES.map((family) => (
          <FamilyCard key={family.idea} family={family} />
        ))}
      </div>
    </Section>
  );
}

function FamilyCard({ family }: Readonly<{ family: Family }>) {
  const Icon = family.icon;

  return (
    <article className="flex flex-col rounded-lg border border-hairline bg-card shadow-xs">
      <header className="flex gap-3 px-4 py-3.5">
        <span
          aria-hidden
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${CHIP[family.tone]}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground">{family.idea}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{family.shared}</p>
        </div>
      </header>

      <ol className="flex-1 divide-y divide-hairline border-t border-hairline">
        {family.rules.map((entry, index) => (
          <li key={entry.rule} className="flex gap-3 px-4 py-3">
            {/* A numeral rather than a bullet: it gives the eye somewhere to
                land in a dense card, and it is the cheapest possible ornament.
                text-[10px] is the one documented pixel size, for wide-tracked
                labels that have no step of their own. */}
            <span
              aria-hidden
              className="mt-0.5 shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{entry.rule}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.because}</p>
              <p className="mt-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                {entry.where}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
