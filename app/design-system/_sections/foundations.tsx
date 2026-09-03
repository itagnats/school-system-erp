import { PetalCorner, SakuraMark } from "@/components/decor";
import { Section } from "@/components/shared";
import { cn } from "@/lib/utils";
import { Demo, SpecRow } from "../_components/demo";
import { Swatch } from "../_components/swatch";

const SEMANTIC_TOKENS = [
  { token: "background", label: "Page ground" },
  { token: "foreground", label: "Body text" },
  { token: "card", label: "Panel surface" },
  { token: "surface-sunken", label: "Table header, pink tint" },
  { token: "primary", label: "Sakura. The one real action" },
  { token: "secondary", label: "Quiet action" },
  { token: "muted", label: "Inert fill" },
  { token: "muted-foreground", label: "Secondary text" },
  { token: "accent", label: "Selected, active nav" },
  { token: "hairline", label: "Card border, pink" },
  { token: "input", label: "Field border" },
  { token: "seal", label: "The blossom mark" },
  { token: "ring", label: "Focus" },
];

const STATUS_TOKENS = [
  { token: "success", label: "Enrolled, approved" },
  { token: "success-soft", label: "Badge ground" },
  { token: "warning", label: "Pending, review" },
  { token: "warning-soft", label: "Badge ground" },
  { token: "error", label: "Dropped, failed" },
  { token: "error-soft", label: "Badge ground" },
  { token: "info", label: "Informational" },
  { token: "info-soft", label: "Badge ground" },
];

const RAMP_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];

// Class names are spelled out rather than interpolated: Tailwind scans source
// text, so a template-built name is invisible to it and never generated.
const CARD_TONES = [
  { label: "Pink", surface: "bg-tone-pink", accent: "text-tone-pink-accent" },
  { label: "Lavender", surface: "bg-tone-lavender", accent: "text-tone-lavender-accent" },
  { label: "Blue", surface: "bg-tone-blue", accent: "text-tone-blue-accent" },
  { label: "Green", surface: "bg-tone-green", accent: "text-tone-green-accent" },
] as const;

export function FoundationsSection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <Section id="palette"
        title="Sakura 桜"
        description="Soft Japanese spring. A barely-pink ground, white cards held by pale pink borders and low pink shadows, generous rounding, and sakura pink as the action colour. Unlike the earlier palettes there is no once-per-screen rule: pink is allowed to be everywhere."
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
              Accent ramp — sakura 桜
            </p>
            <div className="flex flex-wrap gap-1">
              {RAMP_STEPS.map((step) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <span
                    className="size-11 rounded-sm border border-hairline"
                    style={{ background: `var(--sakura-${step})` }}
                    aria-hidden
                  />
                  <code className="text-[10px] text-muted-foreground">{step}</code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
              Neutral ramp — hai 灰
            </p>
            <div className="flex flex-wrap gap-1">
              {RAMP_STEPS.map((step) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <span
                    className="size-11 rounded-sm border border-hairline"
                    style={{ background: `var(--hai-${step})` }}
                    aria-hidden
                  />
                  <code className="text-[10px] text-muted-foreground">{step}</code>
                </div>
              ))}
            </div>
          </div>

          <p className="max-w-prose text-xs text-muted-foreground">
            Feature code never references these ramps. They exist so the semantic tokens
            below have somewhere to point, and so a new semantic token can be picked from
            a step that already belongs to the system. Four steps of sakura do specific
            jobs: 200 is the card border, 300 the decorative petal, 600 the action colour,
            and 700 the deepest pink that is still safe as text. The neutral ramp is warmed
            toward violet rather than left a true grey, so nothing on the page reads cold
            against the pink.
          </p>
        </div>
      </Section>

      <Section id="semantic-tokens"
        title="Semantic tokens"
        description="What application code is allowed to use. Values are read live from the cascade, so this table follows the current theme."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SEMANTIC_TOKENS.map((t) => (
            <Swatch key={t.token} token={t.token} label={t.label} />
          ))}
        </div>
      </Section>

      <Section id="status-tokens"
        title="Status tokens"
        description="Pastel soft pairs, each deepened until its text clears 4.5:1 — including against the tinted card grounds, which cost about 0.8 of a ratio point compared with white. Warning is the one status with a near-black foreground, because white on amber cannot reach 4.5:1 without turning the amber brown. Status is never communicated by colour alone: the label always states it in words."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_TOKENS.map((t) => (
            <Swatch key={t.token} token={t.token} label={t.label} />
          ))}
        </div>
      </Section>

      <Section id="type-scale"
        title="Type scale"
        description="Compact scale. 13px body, tabular figures wherever numbers are compared."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-semibold tracking-tight">Evaluation ranking</p>
            <p className="text-2xl font-semibold tracking-tight">Cost per student</p>
            <p className="text-xl font-semibold tracking-tight">Page title</p>
            <p className="text-lg font-medium">Section heading</p>
            <p className="text-base">
              Body copy at 13 pixels, the default for the application.
            </p>
            <p className="text-sm text-muted-foreground">
              Secondary text and table cells.
            </p>
            <p className="text-xs text-muted-foreground">
              Captions, badges and column labels.
            </p>
          </div>

          <div>
            <SpecRow name="--text-xs" value="11px" />
            <SpecRow name="--text-sm" value="12px" />
            <SpecRow name="--text-base" value="13px" />
            <SpecRow name="--text-lg" value="15px" />
            <SpecRow name="--text-xl" value="18px" />
            <SpecRow name="--text-2xl" value="22px" />
            <SpecRow name="--text-3xl" value="28px" />
          </div>
        </div>
      </Section>

      <Section id="density"
        title="Density"
        description="Comfortable, not compact: 44px rows and 36px controls, because the soft cards need the air to read as designed. These are tokens, not per-component decisions, so changing them re-tunes every shared component at once."
      >
        <div>
          <SpecRow name="--control-h-sm" value="32px" />
          <SpecRow name="--control-h" value="36px" />
          <SpecRow name="--control-h-lg" value="42px" />
          <SpecRow name="--field-h" value="38px" />
          <SpecRow name="--row-h" value="44px" />
          <SpecRow name="--cell-px" value="16px" />
          <SpecRow name="--cell-py" value="12px" />
          <SpecRow name="--section-gap" value="20px" />
          <SpecRow name="--header-h" value="60px" />
          <SpecRow name="--sidebar-w" value="240px" />
        </div>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section id="radius"
          title="Radius"
          description="--radius is 10px and the whole scale is derived from it, so the application re-shapes from one value. Nothing in this system is square."
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              {[
                ["rounded-sm", "6px"],
                ["rounded-md", "10px"],
                ["rounded-lg", "14px"],
                ["rounded-xl", "18px"],
                ["rounded-full", "pill"],
              ].map(([cls, value]) => (
                <div key={cls} className="flex flex-col items-center gap-1">
                  <span
                    className={`size-12 border border-hairline bg-surface-sunken ${cls}`}
                    aria-hidden
                  />
                  <code className="text-[10px] text-muted-foreground">{value}</code>
                </div>
              ))}
            </div>
            <p className="max-w-prose text-xs text-muted-foreground">
              A panel is <code>rounded-lg</code>, a control <code>rounded-md</code>, and
              anything that reads as a pill — a status badge, an avatar, the switch track —
              is <code>rounded-full</code>. Reach for a step, never a pixel value.
            </p>
          </div>
        </Section>

        <Section id="elevation"
          title="Elevation"
          description="Pink-tinted and soft. Unlike the earlier palettes a resting card does carry a shadow, because the pink border alone is only a 1.26 luminance delta against white — the shadow carries half of the boundary with it."
        >
          <div className="flex flex-wrap items-end gap-3">
            {[
              ["shadow-xs", "Almost nothing"],
              ["shadow-sm", "Raised card"],
              ["shadow-md", "Popover, dropdown"],
              ["shadow-lg", "Dialog"],
            ].map(([cls, use]) => (
              <div key={cls} className="flex flex-col items-center gap-1.5">
                <span
                  className={`size-14 rounded-md border border-hairline bg-card ${cls}`}
                  aria-hidden
                />
                <code className="text-[10px] text-muted-foreground">{cls}</code>
                <span className="max-w-24 text-center text-[10px] text-muted-foreground">
                  {use}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section id="structure"
        title="Structure"
        description="Rules divide the inside of a panel, at two weights: --hairline is the pale pink used almost everywhere, and --hairline-strong is one step deeper for a boundary that needs to be felt. These utilities exist so a border is never re-declared with a slightly different colour."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Demo title="hairline-b" note="Row and header separation.">
            <div className="bg-card">
              <div className="px-2 py-1.5 text-xs hairline-b">Row one</div>
              <div className="px-2 py-1.5 text-xs hairline-b">Row two</div>
              <div className="px-2 py-1.5 text-xs">Row three</div>
            </div>
          </Demo>
          <Demo title="hairline-t" note="Footers and totals.">
            <div className="bg-card">
              <div className="px-2 py-1.5 text-xs">Subtotal</div>
              <div className="px-2 py-1.5 text-xs font-medium hairline-t">Total</div>
            </div>
          </Demo>
          <Demo title="hairline-r" note="Sidebar and split panes.">
            <div className="flex bg-card">
              <div className="px-2 py-1.5 text-xs hairline-r">Nav</div>
              <div className="px-2 py-1.5 text-xs">Content</div>
            </div>
          </Demo>
          <Demo
            title="hairline-strong"
            note="One step deeper. Used sparingly: a table head, a total, the edge of a group."
          >
            <div className="bg-card">
              <div className="border-b border-hairline-strong px-2 py-1.5 text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                Cost item
              </div>
              <div className="px-2 py-1.5 text-xs hairline-b">Instructor</div>
              <div className="px-2 py-1.5 text-xs">Laboratory</div>
            </div>
          </Demo>
        </div>
      </Section>

      <Section
        id="card-tones"
        title="Card tones"
        description="Four pastel grounds a stat card can take, each with an accent for its icon chip. A tone is grouping, not meaning: it makes a row of metrics read as a set. Anything that has to communicate a state uses a status badge instead."
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CARD_TONES.map((t) => (
              <div
                key={t.label}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border border-hairline p-4 shadow-xs",
                  t.surface,
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
                  <p
                    data-numeric
                    className="mt-2 text-2xl leading-none font-semibold text-foreground"
                  >
                    128
                  </p>
                </div>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md bg-white/70",
                    t.accent,
                  )}
                >
                  <SakuraMark className="size-4" />
                </span>
              </div>
            ))}
          </div>
          <p className="max-w-prose text-xs text-muted-foreground">
            The muted label is checked against every tone, not only against white: the
            tinted grounds cost about 0.8 of a contrast ratio point, which is why
            <code className="mx-1">--muted-foreground</code>
            is a step deeper than it looks like it needs to be.
          </p>
        </div>
      </Section>

      <Section
        id="decoration"
        title="Decoration"
        description="The blossom, the corner petals and the page wash. Everything here is aria-hidden, pointer-events-none and tagged data-decor, which is what the print rule strips — petals do not belong on a student report."
        decor
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Demo
            title="SakuraMark"
            note="The mark itself. currentColor throughout, so the caller decides whether it is the brand (text-seal) or a background petal (text-blossom)."
          >
            <div className="flex items-end gap-4 text-seal">
              <SakuraMark className="size-4" />
              <SakuraMark className="size-7" />
              <SakuraMark className="size-12" />
              <SakuraMark className="size-12 text-blossom" />
            </div>
          </Demo>

          <Demo
            title="PetalCorner"
            note="Tucked into a panel corner. For a panel that opens a page, never one holding a dense table — decoration behind data is noise."
          >
            <div className="relative h-28 overflow-hidden rounded-lg border border-hairline bg-card">
              <PetalCorner corner="top-right" />
              <p className="p-3 text-xs text-muted-foreground">
                Section accepts <code>decor</code>. This panel and the one around this
                whole section both use it.
              </p>
            </div>
          </Demo>

          <Demo
            title="PetalField"
            note="The page wash: two gradient blooms in the lower corners plus a few drifting petals, fixed behind the shell. It is already behind this page."
          >
            <div className="relative h-28 overflow-hidden rounded-lg border border-hairline">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 20% 120%, var(--wash-from), var(--wash-to) 55%, transparent 75%)",
                }}
              />
              <div className="absolute inset-0 text-blossom">
                <SakuraMark className="absolute top-3 right-6 size-5 opacity-30" />
                <SakuraMark className="absolute bottom-4 left-8 size-7 opacity-25" />
              </div>
            </div>
          </Demo>
        </div>
      </Section>
    </div>
  );
}
