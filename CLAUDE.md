# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

**English only.** All user-facing replies, code, identifiers, comments, documentation,
commit messages, and work-log entries in this repository are written in English.
Reply in English even when the user writes in another language.

## Current state

**Eleven modules built.** The token layer, theme, application shell, shared
components, routing, domain types, API layer and test harness are in place.
Dashboard, Curriculum, Course, Semester, Enrollment, Student, Cost, **Cost
Catalogue**, **Invoices** and **Manage Evaluation** render real data from the BFF
under `app/api/`. **Your Evaluation** is scaffolded — the queue and both form
kinds work; its layout is deliberately plain, pending the user's design pass.
`/reports/students/[studentId]` is still a placeholder (`AUD-002`) — the live
report is under Student Reports.

**Nothing has been seen in a browser** (`AUD-009`, open since 2026-09-07). Four
screens have landed since. Do not describe how anything looks.

**Reports are built**: Manage Evaluation → a setup → **Results** tab → a row's
Report button opens a dialog printed with `window.print()`. Still unbuilt:
submission contracts, and the computed leaderboard.

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
- `components/data-viz/` — the only place `recharts` is imported. Four chart components that take `{ label, value }[]`; every prop must be serializable, because charts are client components rendered from server pages. A formatter function across that boundary fails at prerender, not at typecheck.
- `components/shared/` — app-level reusable patterns (page header, data table, filter bar, status badge, empty/error/loading states, form section, stat card). Still no business logic.
- `features/<domain>/` — self-contained: `components/`, `hooks/`, `services/`, `validations/`, `calculations/`, `types.ts`, `constants.ts`. Business rules live here.

Domains: `programs`, `courses`, `semesters`, `enrollment`, `students`, `costs`,
`cost-catalogue`, `invoices`, `evaluation`, `reports`, `dashboard`.

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
Program → Program Term → Courses + Package price → Program Enrollment → Student
Course → Semester → Enrollment → Student → Evaluation Group → 360° Evaluation → Score → Grade → Report
Course → Semester → Cost Sheet → Cost Group → Cost Item → Cost Option → Cost per Student
Program Term → Program Enrollment → Invoice → Invoice Line → Collected / Outstanding
Catalogue Group → Catalogue Item ⇢ (copied onto) Cost Group → Cost Item
```

A **programme term** is what a student enrols in: a curriculum for one semester
plus a package price. Enrolment is entered at the programme level and the course
enrollments follow from the curriculum (`direction.md` §4a, §7a). Cost is each
course charged at its own cost per student for the programme members who took it
(§13a). A course with no cost sheet contributes **unknown**, never zero.

**Revenue is invoiced, not implied** (§13a, revised 2026-09-12). `package price ×
head count` is *list revenue* — what the price implies. Revenue is the sum of the
billed invoice totals, which is lower by any credits given, and it splits into
**collected** (paid) and **outstanding** (issued or overdue). Net profit and
margin are stated on the **collected** basis, because a student who has been
billed and has not paid is owed money rather than earned money. A draft or
cancelled invoice contributes nothing at all.

### Invoicing (`direction.md` §13b)

One invoice **per student per semester** — not per course, because a student
enrols in a programme; not per programme, because one person receives one
document. Lines are the **curriculum**, not the student's own enrolments: a
package is a package, so a course they skipped is still billed.

```
one line per curriculum course     credits × CREDIT_RATE
one programme fee line             package price − the course lines
one credit line per unfinished     cancelled 100% · dropped 50% · never enrolled nothing
```

`CREDIT_RATE` lives in `lib/calculations/invoice.ts` and the **seed imports it**
to build the package price. Two copies of that number would let a document
disagree with the contract it bills, and nothing would catch it. The fee line is
what makes the course lines and the package price reconcile exactly — it is a
labelled charge, not a rounding plug.

Status is `draft → issued → paid | overdue | cancelled`, **stored rather than
computed against a clock**, so `overdue` cannot change because a month passed.
One transition is offered in the UI (issued → paid) and the server validates it
against `INVOICE_TRANSITIONS` — a status is exactly the field where a
well-formed request can still be nonsense.

**The detail route is the document.** It renders `InvoiceSheet` and prints
itself through `window.print()`, the same choice §23 makes for the student
report; the chrome around it carries `data-print="hide"` and the print rule
keys off `data-print="document"`. There is no export path and no PDF library,
so the preview and the PDF cannot diverge.

The sheet carries a **Code 128 counter-payment barcode** — encoder in
`lib/barcode/`, payload in `lib/calculations/invoice.ts` — over a placeholder
biller, the student reference, the invoice reference and the amount in satang,
with the same four fields in words beside it. The symbol takes **half the
width**; stretching it wider makes it more prominent than the total, not more
scannable.

**Every invoice prints one, and a non-payable one is stamped** — `draft`,
`paid` and `cancelled` fade the symbol and strike it with their own status. The
sentence above the block says the same thing in words, because a stamp is lost
to a screen reader and to a monochrome print. Payable is `isOutstanding`, never
a second list of statuses. It is a rendering, not an integration, and the sheet
says so.

Semester codes are `YYYYNN` (`202601`, `202602`). A course can be offered in many semesters.

### Evaluation rules (`direction.md` §14–22)

**Four evaluation roles** — `student` (peers in own group), `inspector` (a
student from *another* group), `teacher`, `ta` — and they sit on **both sides**
of an evaluation. Corrected 2026-09-06: **an assessee is not always a student.**
A teacher is assessed by their students, a TA by both. They are *evaluation*
roles, not evaluator roles, and calling them the latter is what made an earlier
build hard-code the assessee.

**Which roles exist is fixed; which are assessed is configuration.** A setup
holds one `AssesseeConfig` per assessee role, each with its own `assessors[]`.
**The blend is per assessee** — a student's four assessors and a teacher's two
each total 100 separately, which is why the weight meter lives inside the
assessee card rather than once at the top of the screen.

**A same-role pair is peer assessment, not self-assessment.** Student assessing
student is the centre of the feature. "Nobody assesses themselves" is a rule
about *people*, enforced where people are. A same-role pair is impossible only
where the role holds one person — one teacher, one TA — and an `inspector` only
ever assesses a student (`relationIsPossible`). Collapsing those two rules once
made the server reject its own seed data.

**Self-assessment is never permitted, for any role** — a deliberate divergence
from the reference design, which offered it per card. Rendered as a locked
control so the rule is visible, and never accepted from a client.

**Ranking and grade are student-only** (§21, §22). A staff assessee stops at the
score and a feedback report; `isGradedRole` is the guard.

**The score stays on the rating scale.** `calculateEvaluationScore` returns
behavioural, ranking and total as means out of `scaleMax`, plus a derived
`percent` (`total / scaleMax × 100`), `grade` and `passed` (total ≥ 4). A pass
mark of 4/5 is 80%, which is a B — the two scales were not designed together and
happen to agree. **A score with no submissions is `null`**, never zero and never
"not pass": has-not-passed and has-not-been-assessed are different claims.

**Ratings are seeded from a hash**, per subject, role and criterion, because
writes do not persist. Each subject has a `baselineFor` standing and ratings
jitter around it — varying only the *ratings* made every subject average to the
same mean and every one of 28 failed.

**Two kinds of form** (revised 2026-09-06): the **360 form** (`kind: "360"`)
assesses one subject against the criteria that evaluator's role is asked; a
`ranking` form puts every subject in scope into an order. `Evaluation` is a
discriminated union on `kind` so neither shape can hold the other's data.

**It is the 360 form, never the "criteria form".** All four roles take it — a
teacher assesses a student, and students assess each other — which is what makes
it 360 degrees. What differs by role is the question set, not the kind of form.

**Question sets are per relation** (`direction.md` §18): one canonical list of
seven criteria, and each *pair* is asked the subset it can judge — assessing a
student, teacher 7 / peer 6 / inspector 5 / TA 5; assessing a teacher, a
narrower set again, because what a student is asked about a peer is not what
they are asked about their teacher. Held on `AssessorConfig.criteria`. An
assessor weighted for the 360 form with an **empty** set is rejected
server-side: the blend can total 100 and still be unable to produce a score.

**How they combine was decided 2026-09-06** (`direction.md` §20): an ordering is
**a share of each role's own weight**, not a fifth evaluator. Each role holds one
`weightPercent` *within its assessee*, split internally by
`rankingSharePercent`; the 360 share is its complement and is never stored. A teacher who both rates and ranks therefore
counts once. Each assessee's enabled assessor weights must total 100 — validated **server-side**,
because an unbalanced blend produces no error, only uniformly wrong scores. A role
can be switched off and the rest renormalise. The headline criteria-to-ordering
split is **derived** (`summariseWeights`) and must never become an input.

**Ranking means two things.** An ordering submitted by an evaluator is an input;
the computed leaderboard is an output. The leaderboard is not a route — it lives
under Manage Evaluation.

**An ordering is a strict permutation — no ties** (decided 2026-09-06,
`direction.md` §19). Every position is used exactly once, so the form is a
reorderable list, not a score per row. This deliberately diverges from the
reference design the decision was taken against, which allowed duplicate
scores; do not "correct" it back.

**Navigation is split by perspective**: `/evaluation/manage` is the teacher and
administrator view, `/evaluation` is the evaluator's own queue.

**Identity is `?as=<personaId>`**, scoped to `/evaluation`. There is no sign-in,
so "you" comes from a demo persona switcher — built. It is a URL parameter and
not context or local storage, because local storage is unreadable during a
server render and any component depending on it breaks hydration. **A persona is
not an authorisation boundary**; real users would need server-side checks on the
actual principal.

**An assignment is derived, never stored** — it exists because some assessee
card has your role switched on as an assessor at a non-zero share of that kind.
Manage Evaluation and Your Evaluation therefore cannot disagree. `completedCount`
is seeded from a hash of the assignment id, because writes do not persist and a
queue of zeros would demonstrate none of its states.

Final score is a configurable weighted blend — the demo default is Peer 30% / Inspector 20% / Teacher 35% / TA 15%, with per-role rating/ordering splits of 60/40, 70/30, 70/30 and 100/0 — and the UI should show the arithmetic rather than hide it. Grade is **derived** from the final score (90+ A, 80+ B, 70+ C, 60+ D, else F) and must not be stored as an independent source of truth. Ranking must always state its scope (group vs. course/semester).

### The cost catalogue (`direction.md` §12a)

Master cost groups and items, maintained on their own screen and drawn on by
every sheet. **A sheet takes a copy, never a reference.** Adding a catalogue item
snapshots its name, kind, price, quantity, allocation and options onto the sheet;
only the id survives, for provenance.

A reference would mean raising a master price silently rewrote every sheet that
used it, approved sheets from closed semesters included — a signed-off total
changing because someone edited a lookup table. A cost sheet is a record of what
something cost, not a live query.

`copyCatalogueItem` is the **only** implementation of that copy. Drift is
**computed on read** (`catalogueDriftFor`) and never stored, and only the unit
price is compared — quantity and allocation are expected to differ per sheet,
because the catalogue carries defaults rather than truths. Deleting a catalogue
item that sheets have copied returns **409**: archive it instead, or their
provenance points at nothing.

The general form, worth applying to any future lookup table: **evidence of a past
decision copies; a current setting references.** A cost sheet is evidence; the
evaluation blend on a setup is a setting.

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

`scaffold.md` §33, amended as the curriculum layer was added:

Design System → App Shell → **Curriculum → Course → Semester → Enrollment →
Student Profile → Cost Management → Manage Evaluation** (all built) →
demo persona switcher → Your Evaluation → the two form kinds (all built) →
submission contracts → the computed leaderboard.
Score, grade and the individual report are built.

An **evaluation setup** is the configuration for one course-semester
(`direction.md` §15a): window, scale, guidance and the blend. Groups are
membership beside it, partitioned from that cohort's enrollments — never
generated independently, which is the rule the programme layer learned the hard
way.

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

## Audit log

`.claude/audit/AUDIT-LOG.md` records what was *found*, where the worklog records
what was *built*. Findings carry stable `AUD-nnn` ids and stay open until closed
by evidence, and the file opens with the commands to re-run every check. **Read
the open findings before starting work in an area** — `AUD-009` (nothing has
been seen in a browser) is the one that shapes what to do next, and it now
covers four screens that landed after it was raised.

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
