# PRIME — School Management System

A school management web application: courses and semesters, student enrollment
and profiles, cost management, and a 360 degree student evaluation system with
score, ranking, grade and individual reporting.

PRIME is a portfolio project. The school, the courses and every student record
are fictional.

**Status: twelve modules built.** The design system, theme, application shell,
shared components, routing, domain types, the API layer and the test harness are
in place. Dashboard, Curriculum, Course, Semester, Enrollment, Student, Cost,
Cost Catalogue, Invoices, Manage Evaluation and the Question Bank render real
data from the BFF under `app/api/`. Your Evaluation is built but deliberately
plain, pending a design pass. Every application route renders real data:
`/reports/students/[studentId]` was the last placeholder and is now a student's
own reports, owner-scoped.

There are twelve <!-- count:features --> folders under `features/`, which is the
same number by coincidence rather than by mapping: Student Reports is built from
`features/evaluation/`, and `features/reports/` holds a README and nothing else.

Two honest caveats. **Nothing has been seen in a browser** — every screen has
been verified by build, test and served markup, never by eye. And **writes are
never persisted**: a mutation validates, applies its business rules and returns
the correct result, then changes nothing.

---

## Documentation

The reasoning behind the code, not just the shape of it:

| Document | What it covers |
| -------- | -------------- |
| [docs/architecture.md](docs/architecture.md) | The layering rule, folder map, routing, where state lives, the domain model, and an honest inventory of what is built |
| [docs/design-system.md](docs/design-system.md) | Sakura — the six rules, the token contract, motion, contrast, accessibility |
| [docs/data-flow.md](docs/data-flow.md) | Seed → repository → service → BFF → hook → component; the list and error contracts |
| [docs/process-flow.md](docs/process-flow.md) | The three business chains end to end — curriculum to enrolment, cost to price, evaluation to report — and where each one currently stops |
| [docs/evaluation-model.md](docs/evaluation-model.md) | The 360° chain: four roles, the weighted score, ranking scope, derived grades |
| [docs/decisions/](docs/decisions/) | Why feature-first architecture · why shadcn · why a BFF with no backend |

Two of those pages also exist inside the running application, which is the only
version that cannot go stale: [`/design-system`](http://localhost:3000/design-system)
renders every token and primitive from the shipped CSS, and
[`/system-guide`](http://localhost:3000/system-guide) counts the dataset, draws
the domain as a mind map and re-derives the money chain in front of the reader.
**They demonstrate where the markdown restates**, which is why the counts in
these documents are checked against the filesystem by
`tests/docs/doc-counts.test.ts` — a number that falls behind the code fails the
build.

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

Open http://localhost:3000. The root path redirects to `/dashboard`, and with no
session that redirects again to `/login` — pick a role card. **Administrator**
sees everything; **student** is the interesting one, because the dashboard, the
breadcrumbs and every link on the page change shape rather than simply refusing.

Then [`/system-guide`](http://localhost:3000/system-guide) — how the system
works, with every number on it read from a service as the page renders: the
dataset counted, the domain drawn as a mind map, the money chain re-derived and
checked in front of you, and the whole route tree built from
`config/navigation.ts`.

And [`/design-system`](http://localhost:3000/design-system) — one page
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
design tokens
  ->  components/ui       ->  components/decor   ->  components/data-viz
  ->  components/shared   ->  components/layout
  ->  features/*          ->  app/*
```

```
app/
├── (dashboard)/          application routes, wrapped in the shell
├── api/                  the BFF, one folder per domain
├── login/                the demo sign-in card row
├── design-system/        living documentation of the visual system
├── system-guide/         how the system works, derived from the services
├── layout.tsx            fonts, metadata, providers
└── globals.css           the token layer
proxy.ts                  role enforcement, before anything renders
components/
├── ui/                   generic primitives, no business knowledge
├── decor/                the petal layer; inert and stripped in print
├── data-viz/             the only place recharts is imported
├── shared/               app-level patterns: page header, filters, status, panels
├── data-table/           the single table implementation
├── forms/                form section and action layouts
├── feedback/             loading, empty, error, skeletons, query boundary
├── layout/               sidebar, header, breadcrumbs, back control, user menu
└── providers/            theme and query providers
features/<domain>/        components, hooks, services, validations, calculations
server/                   the BFF's own half: repositories, services, principal
├── repositories/         the in-memory store, seeded once
├── services/             list, read and write logic behind each route handler
├── principal.ts          who the request is acting as, server-side
└── simulate.ts           the ?_simulate switch for the four UI states
lib/
├── access/               the role table both the sidebar and the proxy read
├── api/                  fetch client, error mapping, contracts, session
├── barcode/              the Code 128 encoder on the invoice sheet
├── calculations/         cross-module business math
├── validations/          shared Zod primitives
├── constants/            query keys and route builders
└── utils/                cn, formatting, URL helpers
hooks/                    list query params, table wiring, mounted
types/                    one file per domain
config/                   app constants, navigation, validated env
data/
├── seed/                 the deterministic generator
└── mock/                 fictional fixtures
tests/                    calculations, contracts, access, barcode, docs
```

The rule that matters: a generic component never learns domain vocabulary. It
takes a tone, a label or a render prop, and the feature supplies the meaning.
`StatusBadge` is the worked example — it knows about six visual tones and
nothing about enrollment.

There are 33 <!-- count:routeHandlers --> route handlers under `app/api`, and the
tests cover the part that can be wrong without looking wrong — the
11 <!-- count:calculations --> calculation modules under `lib/calculations`,
checked by 18 <!-- count:testFiles --> test files.

**Identity is not a domain.** The role table lives in `lib/access/` and the
session helpers in `lib/api/session.ts`, below `components/` — because the
application shell is where somebody switches role, and a component may never
import from a feature.

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

- cost totals, the indirect share and cost per student
- the weighted evaluation score
- ranking, including ties
- grade from score
- invoice lines, the package reconciliation and the payment payload
- enrolment expansion and the conflict rules

Grade is always derived from the score and never stored, so the two cannot drift
apart. The same move recurs everywhere: **a share of an indirect cost pool is
derived from credits rather than typed onto a course**, and an evaluation
assignment exists because a setup names your role rather than because a row says
it does. Anything derived cannot disagree with what it was derived from.

---

## Design system

**Sakura (桜)** — soft Japanese spring, at comfortable density. A barely-pink
ground, white cards held by pale pink borders and low pink-tinted shadows,
generous rounding, and sakura pink as the action colour. Six ideas hold it
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
6. **Motion reports, it never decorates.** Three durations (120 / 200 / 320ms)
   and four curves, registered in Tailwind's own namespaces so `duration-fast`
   cooperates with `transition-*`. Never a raw number: an arbitrary `duration-200`
   cannot follow the token when the scale is re-tuned. Reduced motion is honoured
   once, globally, and the only element exempt is the spinner inside a pending
   button — a frozen spinner reads as a hung page.

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
All 12 <!-- count:contrastPairs --> measured text pairs clear 4.5:1 in both
themes, checked against the tinted grounds rather than only against white. The
figures are computed from the shipped `globals.css` rather than asserted; the
tightest are 4.52 light (white on a primary button) and 5.75 dark (the accent on
the pink card tone).

---

## Demo data

All fixtures are fictional and follow the specification examples: `IT101`,
`202602`, `Student 001`, `Evaluation Group A`, `ST-2026-001`. No real student or
employee information, no real internal identifiers, no third-party branding.

The dataset is generated from a fixed seed, so the same rows appear on every
build and in every process. Nothing is random: seed data that differed between
the server and client renders would be a hydration mismatch.

**Writes are validated and shaped, but not persisted.** A mutation runs its
validation and its business rules and returns the correct result and status
code, and then changes nothing - every page load starts again from the seed.
The deploy target is serverless, so there is no long-lived process to hold
state, and a store shared across visitors would show one visitor the edits of
another. The reasoning and the three rejected alternatives are in
[docs/decisions/why-bff.md](docs/decisions/why-bff.md).

---

## Code quality

`npm run verify` runs ESLint, `tsc --noEmit` and the test suite. ESLint includes
**`eslint-plugin-sonarjs`** — Sonar's own plugin, carrying the same JS/TS rules
the SonarQube IDE extension applies — so a smell is caught on every lint run
rather than only when the editor happens to analyse the file. The project lints
clean: zero issues.

Three sonarjs rules are switched off in `eslint.config.mjs`, each with the
reason written beside it:

- `redundant-type-aliases` — `type SemesterCode = string` is an alias that
  carries meaning at every call site; the alternative is a branded type every
  literal has to be cast into;
- `no-floating-point-equality`, in tests only — the rounding tests exist to pin
  an exact result, and `toBeCloseTo` would assert the opposite of what is being
  tested;
- `no-duplicate-string`, in tests only — naming every expected value as a
  constant makes an assertion harder to read, not easier.

**On coverage.** `npm run test:coverage` measures the business math —
`lib/calculations` and each feature's `calculations/` folder — where it sits at
**97.56%** of statements. That is the scope on purpose: those are pure functions
and the part that can be wrong without looking wrong. The rest of the tree is
presentation, whose tests would mostly assert on markup.

---

## Security posture

### There is a demo sign-in, and it is authorisation without authentication

`/login` is a row of role cards — administrator, teacher, TA, student — and the
choice lands in an unsigned `HttpOnly` cookie. **This is deliberately not
authentication**: there is no password, no session store and no secret that is
not also in this repository, and every surface says so. What it demonstrates is
the layer above: where authorisation lives, and what it costs.

- **One table decides everything.** `lib/access/policy.ts` maps each role to the
  pages and API methods it may reach. The sidebar filters itself with it and
  `proxy.ts` enforces it — **hiding a link is courtesy, the refusal is the
  rule.** The allowlist falls closed: a path with no entry is denied to
  everybody.
- **One enforcement point, chosen knowingly.** `proxy.ts` (Next 16 renamed
  Middleware to Proxy) checks every request before anything renders, rather than
  each of the route handlers calling a guard it might forget. The trade is
  written in the file: for a real system each handler would re-verify a signed
  session, because a check that runs once at the edge is one deployment mistake
  away from not running at all. What makes it honest here is that the cookie
  **is** the claim — a second check would read the same unverified string.
- **Passing the proxy is not the same as being allowed.** A student may open
  their own record and nobody else's, and the edge sees a path rather than a
  record. Such paths are let through and `requireOwnStudent` in
  `server/principal.ts` compares the ids on the other side. The collection stays
  staff-only, and the principal's `studentId` is resolved server-side from the
  demo persona rather than carried in the cookie.
- **CSRF, two locks.** The session cookie is `SameSite=Lax`, and `proxy.ts`
  additionally compares `Origin` to `Host` on every non-GET request. A request
  with **no** `Origin` is allowed through: that is curl, a test or another
  server, none of which carry a browser's cookies to be ridden.
- **The session cookie** is `HttpOnly`, `Secure` in production, `SameSite=Lax`
  and expires in eight hours. Nothing client-side caches "who am I" — the answer
  lives in a cookie the browser cannot read and the server decides afresh.
- **An app role is not an evaluation role.** `inspector` is an evaluation role
  and not an app one; `administrator` is the reverse. Collapsing the two is how
  an access table starts granting the wrong thing.

### The controls that do not depend on a session

- security headers set in `next.config.ts`: `Strict-Transport-Security`,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `X-DNS-Prefetch-Control` and a CSP with
  `frame-ancestors 'none'`, `object-src 'none'` and `form-action 'self'`;
- `poweredByHeader` disabled;
- environment access centralised and validated in `config/env.ts`, which only
  accepts `NEXT_PUBLIC_*` values so a server secret cannot be inlined into the
  browser bundle by accident;
- API errors mapped to vetted messages in `lib/api/errors.ts`; a raw server body
  is never rendered into the page;
- ids encoded through `apiPath()` and the route builders rather than
  interpolated into a URL.

- server-side validation on every write, through Zod schemas in
  `server/validation.ts` and each feature's `validations/` module; a client-side
  check is a convenience and never the rule.

Known gaps, stated rather than implied:

- the CSP still carries `unsafe-inline` for scripts and styles — see the work
  log for why and what closing it would cost;
- the principal cookie is **unsigned**, so anyone can name themselves an
  administrator by editing it. That is the demo's premise, not an oversight: the
  point is to show where the check goes, and a signature with the key in the
  repository would only look like security;
- there is no rate limiting, no audit log and no account lifecycle, because
  there are no accounts.

Real authentication (SSO) remains out of scope (`direction.md` §33).
Authorisation is not: it was added on 2026-09-16 and is described above.

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
