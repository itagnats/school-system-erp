# Design system — Sakura (桜)

Soft Japanese spring at comfortable density. A barely-pink ground, white cards
held by pale pink borders and low pink-tinted shadows, generous rounding, sakura
pink as the action color, and a decorative petal layer behind the page.

Tokens live in `app/globals.css`. The living documentation is **`/design-system`**
— one scrollable page, ~60 anchored sections, built from
`app/design-system/_sections/`. Nothing is behind a tab, so any component can be
linked directly: `/design-system#calendar`.

Related: [architecture.md](architecture.md) · [decisions/why-shadcn.md](decisions/why-shadcn.md)

---

## Six rules

**1. A card is a soft object.** `bg-card border-hairline rounded-lg shadow-xs`.
The border and the shadow are **both** load-bearing: the pink border alone is a
1.26 luminance delta against white, so a card without its shadow has no visible
edge. This is a deliberate trade — a pink hairline that met the 3:1 non-text
floor would no longer read as a hairline.

**2. Sakura pink is the action color.** A primary button is pink; ink is
reserved for text. `--primary` is `#de2871`, a step deeper than the pink the eye
expects, because white lettering on a lighter pink cannot clear 4.5:1.

**3. Pink is allowed to be everywhere.** No once-per-screen rule. The ground,
the borders, the table headers and the shadows are all faintly pink, and the
accent is a deeper step of the same ramp rather than a separate hue. Status is
still never signalled by color alone — the label states it in words.

**4. Corners are generous, never square.** `--radius` is 10px and the scale
derives from it: a panel is `rounded-lg`, a control `rounded-md`, anything that
reads as a pill is `rounded-full`. Reach for a step, never a pixel value.

**5. Density is comfortable.** 44px rows, 38px fields, 36px controls. The soft
cards need the air. All of it is tokens — `--row-h`, `--field-h`, `--control-h`,
`--cell-px`, `--cell-py` — so the whole application re-tunes from `:root`.

**6. Motion reports, it never decorates.** Three durations and four curves, and
nothing on a PRIME screen moves on its own.

---

## Tokens

Two raw ramps, which never leave `globals.css`:

- **`--sakura-*` (桜)** does four specific jobs — 200 is the card border, 300 the
  decorative petal, 600 the action color, 700 the deepest pink still safe as
  text.
- **`--hai-*` (灰)** is the neutral, warmed toward violet rather than left a true
  gray, so nothing on the page reads cold against the pink.

Feature and component code uses **semantic** tokens only:

```
--background --foreground --card --popover --surface-sunken --surface-raised
--primary --primary-strong --secondary --muted --accent  (+ -foreground pairs)
--hairline --hairline-strong --border --input --ring
--seal --blossom --wash-from --wash-to
--tone-pink --tone-lavender --tone-blue --tone-green      (+ -accent pairs)
--success --warning --error --info    (+ -foreground and -soft / -soft-foreground)
--sidebar-*
```

Never a hex, never a raw ramp reference, never `bg-[#de2871]`.

### Two pinks

`--primary` and `--primary-strong` exist because a button and a link are
measured against different things. A button's pink is judged against the white
lettering on top of it (4.52:1). The *same* pink used as type is judged against
the page behind it, where it reaches only 4.28:1 — under the floor.

So anything pink that is **type** — a link, an outline badge — takes
`--primary-strong` (`sakura-700`, 5.52:1 on the page ground). In dark the two
converge, because the lightened pink already reads on the dusk ground.

### The three-places rule

A new **color** token must be added in all three places — `@theme inline`,
`:root`, and `.dark` — or dark mode breaks silently. A token defined only in
`:root` compiles, renders correctly in light, and is wrong in dark with no error
anywhere.

Motion tokens are the one documented exception: they live in `@theme inline` and
`:root` and are deliberately **not** repeated in `.dark`, because a duration has
no dark value to break and duplicating it would create a second place to forget.

### Card tones

`--tone-*` are four pastel grounds a `StatCard` can take. **A tone is grouping,
not meaning** — it makes a row of metrics read as a set. Anything that has to
communicate a *state* uses `StatusBadge`.

Each tone has an `-accent` for its icon chip, deepened until it clears 4.5:1 even
if someone uses it as text.

### The interpolated-class trap

Tailwind cannot see a class name that is assembled at runtime.
`bg-tone-${tone}` compiles without error and then simply does not exist in the
CSS. Map a union to explicit literal strings in a `Record`, the way
`components/shared/stat-card.tsx` does:

```ts
const TONE_SURFACE: Record<StatTone, string> = {
  plain: "bg-card",
  pink: "bg-tone-pink",
  // …
};
```

---

## Type and density

Named steps only — `text-xs` (12px), `text-sm` (13px), `text-base` (14px),
`text-lg` (16px). A `text-[11px]` cannot follow the scale when the density
changes, which is exactly what went wrong when this project moved from compact to
comfortable: 107 hardcoded sizes across 22 files had to be rewritten by hand.

The same applies to heights. `h-8` does not follow `--control-h`; `h-(--control-h)`
does. Every primitive reads the density tokens through that v4 shorthand.

---

## Motion

```
duration-fast     120ms   a state change on something already under the cursor
duration-normal   200ms   something appearing or disappearing in place
duration-slow     320ms   something that travels a distance
ease-standard             the default
ease-enter                arriving — decelerates into place
ease-exit                 leaving — accelerates away
ease-emphasized           overshoots slightly; a deliberate flourish only
```

Use the utilities, never a number. `duration-fast`, not `duration-200`.

These register in the **core** Tailwind namespaces (`--transition-duration-*`,
`--ease-*`) rather than as custom utilities, so `duration-fast` sets
`--tw-duration` — the variable that `transition` and `transition-all` actually
read. `--default-transition-duration` is re-pointed at the token, which made the
two dozen existing `transition-colors` classes token-driven without editing any
of them.

**Reduced motion is handled once, globally**, at the bottom of `globals.css`.
Never write a `prefers-reduced-motion` query in a component. Two details there
are deliberate:

- durations collapse to `0.01ms`, **not** `none` — an animation that never runs
  never fires `animationend`, and Radix waits on that event before unmounting an
  exiting overlay;
- `[data-motion="essential"]` keeps animating at a slower 1.6s. A spinner is the
  only evidence a request is still in flight; frozen, it reads as a hung page.
  The spinner inside a pending `Button` is the only element carrying this marker.

---

## Decoration

`components/decor/` is the petal layer: the five-petal `SakuraMark`, a
`PetalCorner` cluster, and `PetalField` — the page wash fixed behind the shell.

Everything in it is `aria-hidden`, `pointer-events-none` and tagged
`data-decor`, which the print rule strips. **Petals do not belong on a student
report.**

Decoration never carries meaning and never takes content. Petal positions are
fixed literals, not random — otherwise the server and client renders disagree and
hydration breaks.

---

## Light, dark, and paper

Dark mode is **dusk, not night**: the ground keeps the violet cast of the neutral
ramp so the pink still belongs to it, and `--primary` lightens to `#f0759f` and
takes dark lettering.

The `.dark` overrides are scoped inside `@media screen`. That is what makes the
individual student report print correctly: on paper the cascade falls back to the
`:root` light values automatically, instead of the print rule having to restate
the entire light palette to undo them. Printing with dark mode on used to produce
`#f2edf2` text on a forced white page — a blank sheet.

---

## Contrast

Every text pair clears **4.5:1**, checked against the *tinted* grounds as well as
white — `--surface-sunken` costs about 0.4 of a ratio point and the card tones
about 0.8. `--muted-foreground` is `#615f6e` rather than the lighter gray it
looks like it wants to be, for exactly this reason.

The figures on `/design-system#a11y-contrast` are **computed, not asserted** — a
script parses the shipped `globals.css`, resolves the token graph and applies the
WCAG 2.1 formula in both themes. The table carries
12 <!-- count:contrastPairs --> pairs; the tightest are **4.52** light (white on
`--primary`) and **5.75** dark (the accent on the pink card tone). A non-text
indicator needs only 3:1.

Both times this palette was audited, the failures were in values that looked
obviously fine. Resolve the graph and test the real pairs rather than the
intended ones.

---

## Accessibility

Documented on the page rather than only in prose — `/design-system` carries
sections for focus, keyboard maps, label and error wiring, the measured contrast
table, and non-visual encodings.

- Status is never carried by color alone; the label states it in words.
- A card tone is never the only signal for a state.
- Form errors are wired through `aria-describedby` and `aria-invalid` via the
  `components/ui/form.tsx` bindings.
- A clickable table row is keyboard operable.
- A tooltip is supplementary only — unreachable on touch, absent in print.
- **One focus color, two mechanisms**, both reading `--ring`: the shadcn
  primitives carry `focus-visible:ring-3` plus a `--ring` border, which sits
  tight against a rounded control; everything else falls back to the global
  `:focus-visible` outline in `globals.css`.
- The app shell renders a **skip link** as the first tab stop, targeting
  `#main-content` on a `tabIndex={-1}` `<main>`.
- Charts are `aria-hidden` and `ChartFrame` renders an `sr-only` table of the
  same numbers, because a screen reader crawling an SVG produces a stream of
  unlabeled paths.

---

## Adding a shared component

A shared component is not finished until `/design-system` documents it. Three
edits:

1. the demo, in the right section under `app/design-system/_sections/`;
2. an `id` on its `Section` or `Demo` — that is the anchor;
3. an entry in `app/design-system/_components/nav-model.ts`, in the matching
   group. The nav is generated from that file, and an id absent from the model is
   unreachable from the nav.

Each entry states **what it is and when to reach for it**. A design system that
only shows what a component looks like leaves the reader to guess when to use it,
which is how two components end up doing the same job.

---

## Verifying a change

Token changes are invisible to the type checker, and a Tailwind
arbitrary-property typo compiles to nothing at all. So check what actually
reached the bundle:

```bash
npm run verify && npm run build
CSS=$(ls -S .next/static/chunks/*.css | head -1)
grep -o -- "\.duration-fast{[^}]*}" $CSS
grep -o -- "\.transition-colors{[^}]*}" $CSS      # must resolve to --motion-fast
grep -oF '.h-\(--field-h\){' $CSS                 # density utilities exist
```

Then look at `/design-system` in **both themes**. Compilation is not appearance —
if nobody has looked at the rendered page, say so.
