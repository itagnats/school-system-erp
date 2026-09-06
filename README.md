# PRIME — School Management System

A school management web application: courses and semesters, student enrollment
and profiles, cost management, and a 360 degree student evaluation system with
score, ranking, grade and individual reporting.

PRIME is a portfolio project. The school, the courses and every student record
are fictional.

**Status: scaffold.** The design system, theme, application shell, shared
components and routing are in place. The feature modules are not built yet —
every application route renders a placeholder, and each one names the module
that will own it.

---

## Documentation

The reasoning behind the code, not just the shape of it:

| Document | What it covers |
| -------- | -------------- |
| [docs/architecture.md](docs/architecture.md) | The layering rule, folder map, routing, where state lives, the domain model, and an honest inventory of what is built |
| [docs/design-system.md](docs/design-system.md) | Sakura — the six rules, the token contract, motion, contrast, accessibility |
| [docs/data-flow.md](docs/data-flow.md) | Seed → repository → service → BFF → hook → component; the list and error contracts |
| [docs/evaluation-model.md](docs/evaluation-model.md) | The 360° chain: four roles, the weighted score, ranking scope, derived grades |
| [docs/decisions/](docs/decisions/) | Why feature-first architecture · why shadcn · why a BFF with no backend |

---

## Tech stack

| Concern         | Choice                                     |
| --------------- | ------------------------------------------ |
| Framework       | Next.js 16 (App Router, Turbopack)         |
| Language        | TypeScript, strict                         |
| Styling         | Tailwind CSS v4 (CSS-first configuration)  |
| UI foundation   | shadcn/ui on the Radix base, restyled      |
| Icons           | Lucide                                     |
| Forms           | React Hook Form + Zod                      |
| Server state    | TanStack Query v5                          |
| Tables          | TanStack Table v9                          |
| Dates           | date-fns                                   |
| Theme           | next-themes (light / dark / system)        |
| Tests           | Vitest                                     |

---

## Local setup

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env.local   # optional; the default API base is /api
npm run dev
```

Open http://localhost:3000. The root path redirects to `/dashboard`.

Start at [`/design-system`](http://localhost:3000/design-system) — one page
documenting every token, primitive, overlay and pattern everything else is built
from, with a sticky table of contents down the left. Nothing is hidden behind a
tab, so a component can be linked to directly: `/design-system#calendar`.

## Commands

| Command                 | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Development server                            |
| `npm run build`         | Production build                              |
| `npm start`             | Serve the production build                    |
| `npm run lint`          | ESLint                                        |
| `npm run typecheck`     | `tsc --noEmit`                                 |
| `npm run test`          | Vitest, watch mode                            |
| `npm run test:run`      | Vitest, single pass                           |
| `npm run test:coverage` | Coverage over the calculation layer           |
| `npm run verify`        | lint, typecheck and tests in one go           |

Run a single test file or pattern:

```bash
npm run test:run -- ranking          # files matching "ranking"
npm run test:run -- tests/calculations/grade.test.ts
```

---

## Architecture

Dependencies point in one direction only:

```
design tokens  ->  components/ui  ->  components/shared  ->  features/*  ->  app/*
```

```
app/
├── (dashboard)/          application routes, wrapped in the shell
├── design-system/        living documentation of the system
├── layout.tsx            fonts, metadata, providers
└── globals.css           the token layer
components/
├── ui/                   generic primitives, no business knowledge
├── shared/               app-level patterns: page header, filters, status, panels
├── data-table/           the single table implementation
├── forms/                form section and action layouts
├── feedback/             loading, empty, error, skeletons, query boundary
├── layout/               sidebar, header, breadcrumbs, theme toggle
└── providers/            theme and query providers
features/<domain>/        components, hooks, services, validations, calculations
lib/
├── api/                  fetch client and error mapping
├── calculations/         cross-module business math
├── validations/          shared Zod primitives
├── constants/            query keys and route builders
└── utils/                cn, formatting, URL helpers
types/                    one file per domain
config/                   app constants, navigation, validated env
data/mock/                fictional fixtures
tests/                    unit tests for the calculation layer
```

The rule that matters: a generic component never learns domain vocabulary. It
takes a tone, a label or a render prop, and the feature supplies the meaning.
`StatusBadge` is the worked example — it knows about six visual tones and
nothing about enrollment.

### Data flow

```
Reads    page -> feature hook -> service -> lib/api
Writes   form -> Zod -> mutation -> lib/api -> query invalidation -> UI
```

No component calls `fetch` directly, and server data is never copied into local
state by hand.

### Where state lives

- **URL search params** — search, filters, sorting, pagination, selected course
  and semester. A filtered view can be refreshed, bookmarked and shared, and the
  back button behaves. See `hooks/use-list-query-params.ts`.
- **TanStack Query** — everything from the server.
- **React state** — transient UI only, such as whether a dialog is open.

No global state library.

### Calculations

Business math is pure, lives in `lib/calculations` or a feature's
`calculations/` folder, and is never inline in JSX. It is the part with unit
tests, because it is the part that can be wrong without looking wrong:

- cost total, allocation and cost per student
- weighted evaluation score
- ranking, including ties
- grade from score

Grade is always derived from the score and never stored, so the two cannot drift
apart.

---

## Design system

**Sakura (桜)** — soft Japanese spring, at comfortable density. A barely-pink
ground, white cards held by pale pink borders and low pink-tinted shadows,
generous rounding, and sakura pink as the action colour. Five ideas hold it
together:

1. **A card is a soft object.** It sits on a pink hairline *and* a pink shadow,
   and both are load-bearing: the border alone is only a 1.26 luminance delta
   against white, so a card without its shadow has no visible edge.
2. **Sakura pink is the action colour.** A primary button is pink; ink is
   reserved for text. `--primary` is `#de2871` — a step deeper than the pink the
   eye expects, because white text on a lighter pink cannot clear 4.5:1.
3. **Pink is allowed to be everywhere.** Unlike the earlier palettes there is no
   once-per-screen rule: the ground, the borders, the table headers and the
   shadows are all faintly pink, and the accent is a deeper step of the same
   ramp rather than a separate hue. Status is still never signalled by colour
   alone — the label always states it in words.
4. **Corners are generous, never square.** `--radius` is 10px and the scale is
   derived from it; anything that reads as a pill is `rounded-full`.
5. **Density is comfortable.** 44px rows, 36px controls. The soft cards need the
   air to read as designed. All of it is tokens, so changing them re-tunes every
   shared component at once.

There are two ramps. `--sakura-*` (桜) does four specific jobs: 200 is the card
border, 300 the decorative petal, 600 the action colour, and 700 the deepest
pink still safe as text. `--hai-*` (灰) is the neutral, warmed toward violet
rather than left a true grey so nothing on the page reads cold against the pink.

Four `--tone-*` pastels are the grounds a stat card can take. A tone is
grouping, not meaning: it makes a row of metrics read as a set.

**Decoration is part of the system.** `components/decor/` holds the sakura mark,
the corner petals and the page wash. It is all `aria-hidden`,
`pointer-events-none` and tagged `data-decor`, which the print rule strips —
petals do not belong on a student report.

Light and dark are both first class. Dark mode is dusk rather than night: the
ground keeps the violet cast of the neutral ramp so the pink still belongs to
it, and `--primary` lightens and takes dark lettering.

Feature code uses semantic tokens (`--primary`, `--muted-foreground`,
`--hairline`, `--seal`, `--success`) and the named type steps, never the raw
`--sakura-*` / `--hai-*` ramps, a hex value, or a pixel size in a class name.
All 33 text pairs clear 4.5:1 in both themes, checked against the tinted grounds
rather than only against white.

---

## Demo data

All fixtures are fictional and follow the specification examples: `IT101`,
`202602`, `Student 001`, `Evaluation Group A`, `ST-2026-001`. No real student or
employee information, no real internal identifiers, no third-party branding.

---

## Security posture

For a public demo with no authentication, the relevant controls are:

- security headers set in `next.config.ts`: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and a CSP with
  `frame-ancestors 'none'`, `object-src 'none'` and `form-action 'self'`;
- `poweredByHeader` disabled;
- environment access centralised and validated in `config/env.ts`, which only
  accepts `NEXT_PUBLIC_*` values so a server secret cannot be inlined into the
  browser bundle by accident;
- API errors mapped to vetted messages in `lib/api/errors.ts`; a raw server body
  is never rendered into the page;
- ids encoded through `apiPath()` and the route builders rather than
  interpolated into a URL.

Known gap: the CSP still carries `unsafe-inline` for scripts and styles. See the
work log for why and what closing it would cost.

Authentication, authorisation and CSRF are out of scope for this project
(direction.md §33). Adding any of them means revisiting this section.

---

## Specification

Two documents are the source of truth for this project, in this order:
`direction.md` defines **what** PRIME is — product scope, workflows, business
rules, MVP and what is explicitly out of scope — and `scaffold.md` defines **how**
it is structured.

`direction.md` is in this repository. `scaffold.md` and the running work log in
`.claude/worklog/` are not — they stay outside version control as working
documents. The decisions that came out of all three are distilled into
[docs/](docs/), which is the version written to be read rather than worked from.
