import { Section, StatusBadge } from "@/components/shared";
import { CategoryBarChart } from "@/components/data-viz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ENROLLMENT_STATUS_LABEL,
  ENROLLMENT_STATUS_TONE,
} from "@/features/enrollment/constants";
import { Demo } from "../_components/demo";

/**
 * Measured, not asserted.
 *
 * These ratios come from a script that parses the shipped `app/globals.css`,
 * resolves the token graph (a semantic token usually points at a ramp step,
 * which points at a hex) and computes WCAG 2.1 relative luminance. Reading
 * them off the source by eye is how a palette ends up with a 3.5:1 button that
 * everybody assumed was fine.
 */
const CONTRAST = [
  { pair: "Body text on the page ground", light: 17.11, dark: 15.88 },
  { pair: "Body text on a card", light: 18.08, dark: 14.44 },
  { pair: "Secondary text on a card", light: 6.23, dark: 6.42 },
  { pair: "Secondary text on a table header", light: 5.47, dark: 7.42 },
  { pair: "Label on a primary button", light: 4.52, dark: 6.68 },
  { pair: "Link on the page ground", light: 5.52, dark: 6.77 },
  { pair: "Accent on the pink card tone", light: 4.97, dark: 5.75 },
  { pair: "Accent on the blue card tone", light: 5.8, dark: 6.57 },
  { pair: "Enrolled badge", light: 5.38, dark: 9.3 },
  { pair: "Pending badge", light: 6.52, dark: 10.3 },
  { pair: "Dropped badge", light: 5.57, dark: 8.7 },
  { pair: "Active nav item", light: 7.04, dark: 11.1 },
];

const KEYBOARD = [
  {
    surface: "Dialog",
    keys: "Esc closes · Tab cycles inside · focus returns to the trigger",
    note: "Radix traps and restores focus. This is the main reason dialogs are not hand-rolled.",
  },
  {
    surface: "Dropdown menu",
    keys: "Enter or Space opens · ↑ ↓ move · Esc closes · typing jumps",
    note: "Row actions are reachable without a pointer, which matters because they are often the only way to act on a row.",
  },
  {
    surface: "Select",
    keys: "↑ ↓ change · Home / End jump · Esc cancels",
    note: "Cancelling restores the previous value rather than committing the highlighted one.",
  },
  {
    surface: "Tabs",
    keys: "← → move · Tab leaves the tablist",
    note: "One tab stop for the whole list, not one per tab. That is the WAI-ARIA pattern and Radix implements it.",
  },
  {
    surface: "Table row",
    keys: "Tab reaches it · Enter activates",
    note: "A clickable row must be a real button or link. A div with onClick is invisible to the keyboard.",
  },
  {
    surface: "Skip to content",
    keys: "First Tab on any page",
    note: "The app shell exposes it, so the sidebar can be bypassed instead of tabbed through on every navigation.",
  },
];

const SCORE_DISTRIBUTION = [
  { label: "A", value: 6 },
  { label: "B", value: 11 },
  { label: "C", value: 8 },
  { label: "D", value: 3 },
  { label: "F", value: 1 },
];

export function AccessibilitySection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <Section
        id="accessibility"
        title="Accessibility"
        description="Treated as part of the token layer rather than a pass at the end. The rules below are the ones that shaped the palette and the components, not a wish list bolted on afterwards."
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                rule: "One focus color, two mechanisms",
                detail:
                  "Primitives carry a 3px ring in --ring/50 plus a --ring border, which sits tight against a rounded control. Everything else — links, rows, anything custom — falls back to the global :focus-visible rule in globals.css: a 2px outline in --ring at 2px offset. Both read the same token, so there is exactly one focus color. Nothing removes focus without replacing it, and it is :focus-visible rather than :focus, so a mouse click leaves no ring behind.",
              },
              {
                rule: "Status is never color alone",
                detail:
                  "StatusBadge always renders the word. The dot and the tint are redundant encodings of something the label already says, so a color-blind reader loses nothing.",
              },
              {
                rule: "Errors are announced, not just drawn",
                detail:
                  "aria-invalid drives the red border, and the message is tied on with aria-describedby. The visual treatment is a consequence of the attribute, so it cannot be applied without the announcement.",
              },
              {
                rule: "Text clears 4.5:1 on its real ground",
                detail:
                  "Not against white — against the tinted surface it actually sits on. The pastel card tones cost roughly 0.8 of a ratio point, which is why several accents are a step deeper than they look like they need to be.",
              },
              {
                rule: "Decoration is inert",
                detail:
                  "Everything in components/decor is aria-hidden and pointer-events-none, and tagged data-decor so the print rule strips it. The petal layer is invisible to assistive technology and to paper.",
              },
              {
                rule: "Reduced motion is honored globally",
                detail:
                  "One rule in globals.css, with a single carve-out for the spinner inside a pending button. Foundations → Reduced motion states the rule and reads your own setting back to you.",
              },
            ].map((item) => (
              <div
                key={item.rule}
                className="rounded-md border border-hairline bg-surface-sunken p-3"
              >
                <p className="text-xs font-medium text-foreground">{item.rule}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>

          <Demo
            title="Focus, live"
            note="Tab through these. Every one of them shows the same ring, and none of them shows it on a mouse click."
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button>Button</Button>
              <Button variant="outline">Outline</Button>
              <Input
                placeholder="Field"
                className="w-40"
                style={{ height: "var(--field-h)" }}
              />
              <a
                href="#accessibility"
                className="rounded-sm text-sm text-primary-strong underline-offset-4 hover:underline"
              >
                Link
              </a>
            </div>
          </Demo>
        </div>
      </Section>

      <Section
        id="a11y-keyboard"
        title="Keyboard"
        description="Every interactive surface is operable without a pointer. Most of this is inherited from Radix rather than written here, which is the argument for using it."
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="hairline-b">
                <th className="pb-1.5 text-xs font-medium text-muted-foreground">
                  Surface
                </th>
                <th className="pb-1.5 text-xs font-medium text-muted-foreground">
                  Keys
                </th>
                <th className="pb-1.5 text-xs font-medium text-muted-foreground">
                  Why it matters
                </th>
              </tr>
            </thead>
            <tbody>
              {KEYBOARD.map((row) => (
                <tr key={row.surface} className="hairline-b last:border-b-0">
                  <td className="py-2 pr-3 align-top text-xs whitespace-nowrap text-foreground">
                    {row.surface}
                  </td>
                  <td className="py-2 pr-3 align-top text-xs text-foreground">
                    {row.keys}
                  </td>
                  <td className="py-2 align-top text-xs text-muted-foreground">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="a11y-forms"
        title="Labels and errors"
        description="The two things a form gets wrong most often, and what the components do about it."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo
            title="Do: a real label, tied to the input"
            note="Clicking the label focuses the field, and a screen reader announces the name with the value. The error is joined on with aria-describedby, so it is read out rather than only seen."
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a11y-good">Course code</Label>
              <Input
                id="a11y-good"
                defaultValue="IT-1"
                aria-invalid
                aria-describedby="a11y-good-error"
                style={{ height: "var(--field-h)" }}
              />
              <p id="a11y-good-error" className="text-xs text-error">
                Use three letters and three digits, as in IT101.
              </p>
            </div>
          </Demo>

          <Demo
            title="Do not: a placeholder standing in for a label"
            note="The name disappears the moment anything is typed, it is not reliably announced, and it fails contrast at most placeholder colors. A red border with no message says something is wrong without saying what."
          >
            <div className="flex flex-col gap-1.5 opacity-70">
              <Input
                placeholder="Course code"
                aria-invalid
                style={{ height: "var(--field-h)" }}
              />
              <p className="text-xs text-muted-foreground">
                No label, no message, no association.
              </p>
            </div>
          </Demo>
        </div>

        <p className="mt-4 max-w-prose text-xs text-muted-foreground">
          In feature code this wiring is not written by hand. The bindings in
          <code className="mx-1">components/ui/form.tsx</code> generate the ids and
          attach
          <code className="mx-1">aria-describedby</code> and
          <code className="mx-1">aria-invalid</code> from the React Hook Form field
          state, so a Zod message reaches assistive technology by default rather than
          when someone remembers. See
          <a
            className="mx-1 text-primary-strong underline-offset-4 hover:underline"
            href="#form-bindings"
          >
            Primitives → Form bindings
          </a>
          .
        </p>
      </Section>

      <Section
        id="a11y-dialog"
        title="Dialogs"
        description="A dialog is the surface where hand-rolling costs the most: focus trapping, focus restoration, Esc, scroll locking and the accessible name are all easy to half-implement."
      >
        <Demo
          title="Open it with the keyboard"
          note="Tab to the trigger and press Enter. Focus moves inside and cannot leave; Esc closes it; focus lands back on the trigger. The title is the accessible name and the description is announced with it — which is why DialogTitle is required rather than optional."
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Withdraw enrollment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw this enrollment?</DialogTitle>
                <DialogDescription>
                  Student 001 will be removed from Group A for semester 202602. Their
                  submitted evaluations are kept.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive">Withdraw</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Demo>
      </Section>

      <Section
        id="a11y-contrast"
        title="Contrast"
        description="Computed from the shipped globals.css rather than from intent: the script resolves the token graph and applies the WCAG 2.1 formula, in both themes. The floor is 4.5:1 for text and 3:1 for a non-text indicator."
      >
        <div className="flex flex-col gap-3">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left">
              <thead>
                <tr className="hairline-b">
                  <th className="pb-1.5 text-xs font-medium text-muted-foreground">
                    Pair
                  </th>
                  <th className="pb-1.5 text-right text-xs font-medium text-muted-foreground">
                    Light
                  </th>
                  <th className="pb-1.5 text-right text-xs font-medium text-muted-foreground">
                    Dark
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST.map((row) => (
                  <tr key={row.pair} className="hairline-b last:border-b-0">
                    <td className="py-1.5 pr-3 text-xs text-foreground">{row.pair}</td>
                    <td className="py-1.5 text-right text-xs text-foreground" data-numeric>
                      {row.light.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right text-xs text-foreground" data-numeric>
                      {row.dark.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="max-w-prose text-xs text-muted-foreground">
            The tightest pair in the light theme is white on a primary button, at 4.52.
            That is the reason
            <code className="mx-1">--primary</code>
            is <code>#de2871</code> and not the lighter
            <code className="mx-1">#e84884</code>
            of the reference mockup, which reaches only 3.5 and fails. It looks like a
            transcription error and is not one.
          </p>

          <p className="max-w-prose text-xs text-muted-foreground">
            There are two pinks for the same reason. A button measures its pink
            against the white lettering on top of it;
            <em className="mx-1">text</em>
            in that same pink measures against the page behind it, and
            <code className="mx-1">--primary</code>
            reaches only 4.28 there. Anything pink that is type — a link, an outline
            badge — takes
            <code className="mx-1">--primary-strong</code>
            instead. In dark the two converge, because the lightened pink already
            reads on the dusk ground.
          </p>
        </div>
      </Section>

      <Section
        id="a11y-nonvisual"
        title="Beyond color"
        description="Three places where the visual encoding is not the whole message."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Demo
            title="Status carries its own label"
            note="Tone and dot are redundant. Remove the color entirely and the meaning survives."
          >
            <div className="flex flex-wrap gap-1.5">
              {(["enrolled", "pending", "dropped", "completed"] as const).map(
                (status) => (
                  <StatusBadge
                    key={status}
                    tone={ENROLLMENT_STATUS_TONE[status]}
                    label={ENROLLMENT_STATUS_LABEL[status]}
                  />
                ),
              )}
            </div>
          </Demo>

          <Demo
            title="A chart exposes its numbers"
            note="The plot is aria-hidden and a visually hidden table beside it holds the same figures. A screen reader crawling an SVG produces a stream of unlabeled paths; a table is navigable by row and states its units."
          >
            <CategoryBarChart
              title="Grade distribution"
              description="IT101 · 202602 · 29 students"
              data={SCORE_DISTRIBUTION}
              unit="Students"
              height={150}
            />
          </Demo>

          <Demo
            title="Numbers line up"
            note="Tabular figures everywhere a value is compared down a column, so digits share a width and the eye can scan the column instead of reading each row."
          >
            <div className="flex flex-col gap-0.5 text-xs" data-numeric>
              <span>81.25</span>
              <span>79.00</span>
              <span>100.00</span>
              <span>8.50</span>
            </div>
          </Demo>
        </div>
      </Section>
    </div>
  );
}
