# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

**English only.** All user-facing replies, code, identifiers, comments, documentation,
commit messages, and work-log entries in this repository are written in English.
Reply in English even when the user writes in another language.

## Current state

**Scaffold complete; no feature modules built.** The token layer, theme, application
shell, shared components, routing, domain types, API layer and test harness are in place.
Every application route under `app/(dashboard)/` renders `ScaffoldPlaceholder`, which
names the module that will replace it.

The design system is **settled**: the Sakura palette was walked and approved on
2026-09-03, which closes the gate that was holding feature work. Do not propose replacing
the palette without being asked. Still check `.claude/worklog/` for the current decision
before starting a module.

```
direction.md   — what PRIME is (product scope, business rules, MVP)
scaffold.md    — how PRIME is structured (stack, folders, conventions)
README.md      — setup, commands, architecture summary
```

Read `direction.md` and `scaffold.md` before writing code. `scaffold.md` §31 lists what
belongs to the scaffold phase; §33 gives the build order for what comes next.

## Source of truth

Resolve conflicts in this order (`scaffold.md` §35):

1. `direction.md` — defines *what* PRIME is
2. `scaffold.md` — defines *how* it is initially structured
3. Existing architecture
4. Feature-specific requirements
5. Developer judgment

Do not build features that are not in `direction.md`. §33 of `direction.md` lists explicit out-of-scope items (LMS, payments, real SSO, analytics platform, mobile app, etc.).

## Commands

```bash
npm run dev          # dev server, http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test:run     # Vitest, single pass
npm run verify       # lint + typecheck + tests
```

Single test file or pattern: `npm run test:run -- ranking` or
`npm run test:run -- tests/calculations/grade.test.ts`.

`scaffold.md` §32 requires lint, typecheck and build to all pass, and forbids ignoring a
TypeScript or build error. Run `npm run verify` before reporting work finished.

If `PageProps` / `LayoutProps` come back as unresolved names, run `npx next typegen` —
those globals are generated into `.next/types` and are absent on a clean checkout.

## Stack (installed)

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS v4 (CSS-first, no
`tailwind.config.js`) · shadcn/ui on the Radix base · Lucide · React Hook Form + Zod ·
TanStack Query v5 · TanStack Table v9 · recharts · date-fns · next-themes · Vitest.

Two version traps worth knowing:

- **Tailwind v4** has no JS config. Tokens, the type scale and custom utilities all live
  in `app/globals.css` under `@theme inline`, `:root`, `.dark` and `@utility`.
- **TanStack Table v9** is opt-in and its generics changed. Never import `ColumnDef` or
  `useReactTable` directly — use `PrimeColumnDef<TData>` and the `DataTable` from
  `@/components/data-table`, and register any new feature in
  `components/data-table/table-features.ts` so every table gains it at once.

## Architecture

The layering rule that matters most (`direction.md` §29, `scaffold.md` §3–5):

```
Design Tokens → Theme → components/ui → components/decor → components/data-viz
  → components/shared → features/* → app/*
```

- `components/ui/` — generic primitives (shadcn foundation, restyled into the PRIME visual system). **No** course/enrollment/cost/evaluation logic here.
- `components/decor/` — the petal layer. All `aria-hidden`, `pointer-events-none` and tagged `data-decor`, which the print rule strips.
- `components/data-viz/` — the only place `recharts` is imported. Three chart components that take `{ label, value }[]`; every prop must be serializable, because charts are client components rendered from server pages. A formatter function across that boundary fails at prerender, not at typecheck.
- `components/shared/` — app-level reusable patterns (page header, data table, filter bar, status badge, empty/error/loading states, form section, stat card). Still no business logic.
- `features/<domain>/` — self-contained: `components/`, `hooks/`, `services/`, `validations/`, `calculations/`, `types.ts`, `constants.ts`. Business rules live here.

Domains: `courses`, `semesters`, `enrollment`, `students`, `costs`, `evaluation`, `reports`.

### Data flow

Reads: `Page → feature hook → service → API`. Writes: `Form → Zod validation → mutation → API → query invalidation → UI`. Never call `fetch()` directly from a component; never keep a hand-maintained duplicate of server state.

### Calculations

Business math lives in `lib/calculations/` or a feature's `calculations/` module — never inline in JSX. These are the deterministic, unit-testable core: `calculateTotalCost`, `calculateCostPerStudent`, `calculateEvaluationScore`, `calculateFinalGrade`, `calculateRanking`. Testing priority is these functions plus enrollment and evaluation rules (`scaffold.md` §27).

### State

React state for local UI · **URL search params** for search/filter/sort/pagination and selected course/semester (so table state is shareable and survives refresh) · TanStack Query for server state · Context only where genuinely useful. Do not add a global state library.

### Types

One file per domain under `types/` (`course.ts`, `semester.ts`, `student.ts`, `enrollment.ts`, `cost.ts`, `evaluation.ts`, `report.ts`, `common.ts`). Never a single giant `types.ts`.

## Domain model

Two hierarchies hang off Course → Semester:

```
Course → Semester → Enrollment → Student → Evaluation Group → 360° Evaluation → Score → Grade → Report
Course → Semester → Cost Sheet → Cost Group → Cost Item → Cost Option → Cost per Student
```

Semester codes are `YYYYNN` (`202601`, `202602`). A course can be offered in many semesters.

### Evaluation rules (`direction.md` §14–22)

Four evaluator roles: `STUDENT` (peers in own group), `INSPECTOR` (a student from *another* group), `TEACHER`, `TA`. **A student must never evaluate themselves.**

Final score is a configurable weighted blend — the demo default is Peer 30% / Inspector 20% / Teacher 35% / TA 15% — and the UI should show the arithmetic rather than hide it. Grade is **derived** from the final score (90+ A, 80+ B, 70+ C, 60+ D, else F) and must not be stored as an independent source of truth. Ranking must always state its scope (group vs. course/semester).

### Cost rules (`direction.md` §13)

`Direct + Shared = Total Course Cost`, then `Total ÷ student count = Cost per Student`, with allocation and optional markup. Keep the calculation visible in the UI.

## Conventions

- Styling: semantic CSS variables only (`--background`, `--primary`, `--muted-foreground`, …) with light and dark support. Avoid `bg-[#123456]`-style arbitrary values where a token exists.
- Every data-driven screen implements all four states: loading → success → empty → error. No blank screens.
- Naming: concrete (`StudentTable`, `CostSheetForm`), never `DataComponent` / `Form2`. Split large page components into named parts instead of one monolith.
- Avoid `any` without a documented reason.
- Accessibility is a requirement, not polish: keyboard nav, visible focus, real labels, accessible dialogs and form errors. Lean on Radix behavior via shadcn.

## Mock data

`data/mock/` with fictional data only (`IT101`, `Student 001`, `Evaluation Group A`). Never use real student or employee information, real internal identifiers, or third-party branding.

## Build order

`scaffold.md` §33: Design System → App Shell → Course → Semester → Enrollment → Student Profile → Cost Management → Evaluation Groups → 360° Evaluation → Score → Ranking → Grade → Individual Report.

When uncertain, pick the smallest implementation that demonstrates the intended capability.

## Skills

- **`design-system`** (`.claude/skills/design-system/SKILL.md`) — load before touching
  `app/globals.css`, `components/ui`, `components/decor`, `components/shared`,
  `components/feedback`, `components/forms` or `components/data-table`, or whenever a
  feature needs a colour, size or spacing decision. Covers the Sakura rules, the
  semantic-token contract, card tones, the decoration layer, contrast floors, the
  interpolated-class trap, dark mode, the layering boundary, and the three edits a new
  shared component needs on the design system page. The reference mockup is
  `sample-style.png` in that skill folder.
- **`data-layer`** (`.claude/skills/data-layer/SKILL.md`) — load before touching `data/`,
  `server/`, `app/api/`, `lib/api/`, or a feature's `services/` or `hooks/` folder, and
  whenever deciding where a piece of data logic belongs. Covers the folder structure, the
  seed → repository → service → route-handler chain, the determinism rule, the list and
  error contracts, why writes are not persisted, and the ten files a new domain needs.
- **`worklog`** (`.claude/skills/worklog/SKILL.md`) — read recent entries before non-trivial
  work, write one when a step is finished.
- **`commit-review`** (`.claude/skills/commit-review/SKILL.md`) — **use it every time you
  commit**, without exception. Inspect, analyse, draft a Conventional Commits message about
  the *why*, then wait for an explicit approval keyword before staging. Stage by name, never
  `git add -A` or `git add .`, and never push.

## Work log

Project memory lives in `.claude/worklog/`, indexed newest-first in `.claude/worklog/INDEX.md`.
Read the latest entries before starting non-trivial work, and record a new entry when a feature
or scaffold step is finished.

## Design system

**Sakura (桜)** — soft Japanese spring: a barely-pink ground, white cards on pale pink
borders and low pink shadows, generous rounding, sakura pink as the action colour, a
decorative petal layer, comfortable density. Tokens in `app/globals.css`, live
documentation at `/design-system`. Five rules, expanded in the `design-system` skill:

1. A card is a soft object — `bg-card border-hairline rounded-lg shadow-xs`. The border
   and the shadow are both load-bearing; the pink border alone is a 1.26 luminance delta.
2. Sakura pink is the action colour — a primary button is pink, ink is for text.
3. Pink is allowed to be everywhere. This palette has **no** once-per-screen rule, unlike
   the two before it.
4. Corners are generous, never square. `--radius` is 10px; pills are `rounded-full`.
5. Density is comfortable — 44px rows, 36px controls — and is a token, never a hardcoded
   height.

`--primary` is `#de2871`, deliberately a step deeper than the `#e84884` in the reference
mockup, because white text on the mockup pink reaches only 3.5:1. Do not "correct" it.

**Motion** is a sixth rule: three durations (`duration-fast` 120ms,
`duration-normal` 200ms, `duration-slow` 320ms) and four curves (`ease-standard`,
`ease-enter`, `ease-exit`, `ease-emphasized`), registered in the core Tailwind
namespaces so `duration-*` and `ease-*` cooperate with `transition-*`. Never write
`duration-200` — an arbitrary number cannot follow the token when the scale changes.
Motion tokens are the one documented exception to the three-places rule: they are
**not** repeated in `.dark`, because a duration has no dark value to break. Reduced
motion is handled once, globally, in `globals.css`; the only carve-out is
`[data-motion="essential"]`, which is the spinner inside a pending `Button`.

**Accessibility** is documented on the page rather than only in the skill: focus,
keyboard maps, label and error wiring, and a contrast table computed from the shipped
`globals.css` by script (worst pair 4.52:1 light, 5.75:1 dark). The app shell renders a
skip link as the first tab stop.

`--tone-*` are four pastel card grounds. A tone is **grouping, not meaning** — a state
uses `StatusBadge`. Tailwind cannot see `bg-tone-${x}`: map unions to literal class
strings. `components/decor/` holds the petal layer; it is all `aria-hidden` and tagged
`data-decor`, which the print rule strips.

Use semantic tokens and the named type steps (`text-xs`/`text-sm`/`text-base`), never a
pixel size in a class name — moving from compact to comfortable meant rewriting 107 of
them by hand. The raw `--sakura-*` / `--hai-*` ramps and hex values stay inside
`globals.css`. A new token must be added in all three places — `@theme inline`, `:root`
and `.dark` — or dark mode breaks silently. Text pairs must clear 4.5:1 against the
*tinted* grounds, not just white.
