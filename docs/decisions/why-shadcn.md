# Why shadcn/ui on the Radix base

**Status:** accepted · decided during scaffolding, 2026-09-03

> This record was written after the fact, from the decision as it is visible in
> the code. It documents the reasoning the implementation reflects, not minutes
> of a meeting.

---

## Context

PRIME needed roughly 26 primitives — button, input, select, dialog, sheet,
popover, dropdown, tabs, table, calendar, form bindings — before any feature
screen could be built. It also needed a **specific** visual identity: the Sakura
palette is a designed thing with a pink ground, load-bearing shadows, 10px
corners and comfortable density, and it had already been through several
iterations before it settled.

Those two requirements pull in opposite directions. Getting 26 accessible
primitives quickly argues for a component library; owning the exact look argues
for writing them.

---

## Decision

Use **shadcn/ui**, which is neither: it is a set of components you copy into your
own repository, built on **Radix UI** primitives for behavior.

The components live in `components/ui/` as ordinary project files. They are not a
dependency, they are source. Radix supplies the behavior that is genuinely hard
to get right — focus trapping, focus restoration, `Esc` handling, scroll locking,
roving tabindex, portal semantics, accessible names — and everything visual is
ours to change.

Which is what happened. The primitives were restyled onto the token system rather
than kept as shipped: the shadcn defaults were replaced with semantic tokens, the
size variants were moved onto the density tokens (`h-(--control-h)` rather than
`h-8`), a `loading` state was added to `Button`, and a `destructive-soft` variant
was added for inline row actions where a solid red button would shout.

---

## Consequences

**Good**

- Accessibility comes from Radix rather than from us re-deriving it. A dialog
  that traps focus, restores it to the trigger, closes on `Esc` and locks scroll
  is a lot of behavior to hand-roll correctly, and it is the kind that fails
  quietly.
- No version upgrade can change how the application looks. The components are
  source, so the palette cannot be broken by a minor bump.
- The restyle had no upstream to fight. Moving the primitives onto the density
  tokens was an ordinary edit to ordinary files.
- Composition matches how the rest of the project is layered — `components/ui`
  is the bottom of the stack, and everything above it is ours.

**Costs**

- **Updates are manual.** A fix upstream does not arrive on its own; someone has
  to notice and port it.
- **The defaults are not the design system**, and that gap is invisible until it
  is measured. The primitives shipped with stock shadcn geometry — 32px controls,
  32px fields, 40px rows — while the density tokens said 36/38/44, and the two
  disagreed for weeks. The shared components had been patching over it with
  per-call-site inline styles rather than the mismatch being caught. Copied
  source is only as good as the review it gets.
- Some stock idioms survive review and shouldn't: hardcoded radii like
  `rounded-[4px]`, a `text-white` where a semantic token belongs, `rounded-4xl`
  reaching for a Tailwind default rather than a PRIME step. These are tracked and
  are exactly the class of thing a periodic audit of `components/ui` exists to
  catch.

---

## Alternatives considered

**A styled component library — MUI, Mantine, Chakra.** Rejected: the Sakura
palette is the point of the project, and fighting a library's theming layer to
reach a specific look costs more than the library saves. It also puts a large
runtime dependency between the design tokens and the pixels, when the tokens are
supposed to be the single source.

**Radix primitives directly, styled from scratch.** Genuinely close, and would
have avoided the stock-defaults problem entirely. Rejected on time: it means
writing 26 components before the first feature screen, and shadcn is that work
already done in a form we are free to edit. The trade is the maintenance note
above — the code arrives with defaults that were designed for a different system.

**Headless UI.** Rejected: smaller primitive set than Radix, and no
calendar/table story, both of which this project needs.

**A CSS framework with prebuilt components — Bootstrap, DaisyUI.** Rejected: the
accessibility behavior is not there, and the visual opinions are strong and
wrong for this palette.
