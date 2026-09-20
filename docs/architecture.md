# Architecture

How PRIME is put together, and the one rule that everything else follows from.

Related: [data-flow.md](data-flow.md) · [design-system.md](design-system.md) ·
[evaluation-model.md](evaluation-model.md) · [decisions/](decisions/)

---

## The layering rule

Dependencies point in one direction. A module may import from anything below it
and from nothing above it.

```
design tokens          app/globals.css — the only place a color is defined
      ↓
components/ui          generic primitives; no domain vocabulary
      ↓
components/decor       the petal layer; inert, and stripped in print
      ↓
components/data-viz    the only place recharts is imported
      ↓
components/shared      application patterns; still no business rules
      ↓
components/layout      the shell: sidebar, header, breadcrumbs, back control
      ↓
features/<domain>      business rules live here and nowhere above
      ↓
app/*                  routing and composition only
```

**Sideways is a direction too.** `features/*` is a row, not a stack, and one
feature importing another is how a layered diagram quietly becomes a graph. That
invariant held until 2026-09-12 and no longer does: `features/costs/` reaches
into `features/cost-catalog/` for a hook and a constants module, while
`features/dashboard/` faced the same choice and duplicated four strings instead.
It is recorded as a violation rather than an exception (`AUD-012`, open), and
until it is settled the rule is: duplicate a handful of strings, or put the
shared thing in a module **below** both features. Check it with

```bash
grep -rn 'from "@/features/' features/     # expect exactly the two known edges
```

**Identity is not a domain.** The role table lives in `lib/access/` and the
session helpers in `lib/api/session.ts` — below `components/`, because
`components/layout/` is where somebody switches role and a component may never
import from a feature. `server/principal.ts` is the server-side half, read by
the three layouts that render a shell.

The rule that carries the most weight in review: **a generic component never
learns domain vocabulary.** It takes a tone, a label or a render prop, and the
feature supplies the meaning.

`StatusBadge` is the worked example. It knows six visual tones — neutral, info,
success, warning, error, accent — and nothing about enrollment. A feature maps
its own status union onto a tone in its own `constants.ts`:

```ts
// features/enrollment/constants.ts
export const ENROLLMENT_TONE: Record<EnrollmentStatus, StatusTone> = {
  enrolled: "success",
  pending: "warning",
  dropped: "error",
};
```

If you find yourself adding an `enrollmentStatus` prop to something under
`components/`, the component is in the wrong layer.

`components/decor` and `components/data-viz` exist for the same reason as each
other: something that could not consume a semantic token needed containing.
Decor holds no patterns and takes no content, so it sits below `shared/` rather
than inside it. Data-viz wraps recharts, which takes colors as strings and
cannot read a Tailwind class, so the wrappers pass `var(--chart-1)` and let the
browser resolve it — which is what keeps a chart following the theme switch.

---

## Folder map

```
app/
├── (dashboard)/          application routes, wrapped in the shell
├── api/                  the BFF — one folder per domain
├── login/                the demo sign-in card row
├── design-system/        living documentation, built from _sections/
├── system-guide/         how the system works, derived from the services
├── layout.tsx            fonts, metadata, providers
├── globals.css           the token layer
├── error.tsx             route error boundary
└── not-found.tsx

proxy.ts                  role enforcement, before anything renders

components/
├── ui/                   generic primitives — shadcn on the Radix base, restyled
├── decor/                sakura mark, corner petals, page wash
├── data-viz/             the charts, plus frame, tooltip and tokens
├── feedback/             loading, empty, error, skeletons, query boundary
├── forms/                form section and action layouts
├── data-table/           the single table implementation
├── shared/               page header, filters, status, stat card, panels
├── layout/               shell, sidebar, header, breadcrumbs, back, user menu
└── providers/            theme and query providers

server/
├── repositories/         the in-memory store, seeded once per process
├── services/             list, read and write logic behind the route handlers
├── principal.ts          who the request is acting as
├── http.ts               the response and error envelope
├── query.ts              list parameters: search, sort, page
├── simulate.ts           the ?_simulate switch for the four UI states
└── validation.ts         server-side Zod parsing — the rule, not a convenience

features/<domain>/
├── components/           UI specific to this feature
├── hooks/                data hooks; call services, never fetch directly
├── services/             API calls via lib/api
├── validations/          Zod schemas for this feature
├── calculations/         pure business math, unit tested
├── types.ts              feature-local types
└── constants.ts          status-to-tone maps, labels, option lists

lib/
├── access/               the role table the sidebar and the proxy both read
├── api/                  fetch client, error mapping, wire contracts, session
├── barcode/              the Code 128 encoder on the invoice sheet
├── calculations/         cross-module business math
├── validations/          shared Zod primitives
├── constants/            query keys and route builders
└── utils/                cn, formatting, URL helpers

hooks/                    list query params, table wiring, mounted
types/                    one file per domain — never a single giant types.ts
config/                   app constants, navigation model, validated env
data/
├── seed/                 the deterministic generator
└── mock/                 fictional fixtures
tests/                    calculations, contracts, access, barcode, docs
docs/                     this folder
```

The sizes, checked against the filesystem by `tests/docs/doc-counts.test.ts`:
27 <!-- count:uiPrimitives --> primitives in `components/ui`,
10 <!-- count:sharedComponents --> in `components/shared`,
4 <!-- count:charts --> charts in `components/data-viz`, and
13 <!-- count:types --> domain files under `types/`.

Twelve <!-- count:features --> domains: `programs`, `courses`, `semesters`,
`enrollment`, `students`, `costs`, `cost-catalog`, `invoices`, `evaluation`,
`question-bank`, `reports`, `dashboard`.

---

## Routing

Everything under `(dashboard)/` is wrapped in the application shell by a single
group layout.

```
/                                    → redirects to /dashboard
/login                               the demo sign-in; the only public page
/no-access                           where a refused navigation lands
/dashboard                           branches on role: the school, or one student's own

/programs                            /programs/[programTermId]
/courses                             /courses/[courseId]
/semesters                           /semesters/[semesterId]
/enrollment                          /enrollment/[programTermId]
/students                            /students/[studentId]
                                     /students/[studentId]/edit
/invoices                            /invoices/[invoiceId]

/costs                               program cost list
/costs/courses                       /costs/courses/[costSheetId]
/costs/catalog                     /costs/programs/[programTermId]

/evaluation                          /evaluation/[assignmentId]
/evaluation/manage                   /evaluation/manage/[setupId]
/evaluation/manage/questions
/reports                             /reports/students/[studentId]

/design-system                       /system-guide
```

Three shapes in that list are decisions rather than layout.

**Enrollment is program-first.** `/enrollment` lists program terms and
`/enrollment/[programTermId]` shows that term's students, then the same term at
course grain. A student is added from a term page and never from a flat list,
because a term is what a student joins.

**Cost Management leads with the program.** `/costs` is the program cost
list, `/costs/courses` the course list — the only place the seven course sheets
belonging to no program can be found — and `/costs/catalog` the master
groups and items. Costing deliberately did not move inside the Program module:
those seven sheets would have had no route, and the catalog belongs to neither
program nor course.

**The evaluation area is split by perspective**: `/evaluation/manage` is the
teacher and administrator view, `/evaluation` is the evaluator's own queue.
Ranking is not a route — an ordering is submitted inside a form, and the computed
leaderboard is a result shown under Manage.

The route shape mirrors the domain model rather than the navigation menu, so a
URL reads as a location in the data.

**Every link on a screen goes somewhere the reader may open.** The dashboard,
the breadcrumb trail, the back control and the program history all take the
role and drop the anchor where it would be refused — a dead link is a worse
answer than plain text. The two Develop pages are the deliberate exception,
because the System Guide documents the whole route tree including the parts the
current role cannot reach.

---

## Access

One table, one enforcement point (`direction.md` §3a, added 2026-09-16).

`lib/access/policy.ts` maps each of the four app roles — administrator, teacher,
TA, student — to the pages and the API methods it may reach. Two callers read
it: the sidebar, which filters itself, and `proxy.ts`, which refuses. **Hiding a
link is courtesy; the refusal is the rule**, and the allowlist falls closed, so a
path with no entry is denied to everybody rather than allowed by default.

Putting the check in the proxy rather than in each route handler is a deliberate
trade, written out in `proxy.ts`: one table and one check, with no endpoint that
quietly forgot to call a guard, at the cost of the check sitting beside the
routes instead of inside them. For a real system each handler would re-verify a
signed session. What makes it honest here is that the cookie **is** the claim —
unsigned and self-asserted — so a second check would read the same unverified
string and reach the same answer.

**Passing the proxy is not the same as being allowed.** A rule may carry an
`owner` list, which the other columns cannot express: a student reaches
`/students/<their own id>` and nobody else's. The edge sees a path and never a
record, so such requests are let through and `requireOwnStudent` in
`server/principal.ts` compares the ids. It is the only place in PRIME where those
two come apart, and every path beneath such a prefix owes that check
(`AUD-026`).

An **app role is not an evaluation role**: `inspector` is an evaluation role and
not an app one, `administrator` the reverse. Next 16 renamed Middleware to
**Proxy**, which is why the file is `proxy.ts`; `middleware.ts` is deprecated.

---

## The domain model

Three chains. A course can be offered in many semesters and can appear in many
programs; semester codes are `YYYYNN` (`202601`, `202602`).

```
Program → Program Term → Courses          → Package price
                       → Program Enrollment → Student
                                            → Invoice → Invoice Line
                                                      → Collected / Outstanding

Course → Semester → Enrollment → Student → Evaluation Group
                                        → 360° Evaluation → Score → Grade → Report
                                                                  → Ranking

Course → Semester → Course Cost Sheet   → DIRECT costs only
Program Term     → Program Cost Sheet → INDIRECT costs, shared by credits

Catalog Group → Catalog Item ⇢ (copied onto) Cost Group → Cost Item
```

**A student holds one program, and one program term per semester** (§7a).
Enforced server-side: a second term in the same semester is a 409, a term on
another program a 422. It is what makes one invoice per student per semester
representable at all.

**Status is progress; outcome is derived** (§8). A program enrollment is
`pending | active | completed | withdrawn` — where the student is, never how
they did. Pass and fail come from the grades and are never stored beside the
status.

**The program chain is what a student actually buys.** A course has a cost but
no price; a program term has both, which is what lets the same data answer
"did this make money" rather than only "what did it spend". Enrollment is entered
at the program level and the course enrollments follow from the curriculum, so
the two can never disagree about who is on what.

**The evaluation chain** is documented in full in
[evaluation-model.md](evaluation-model.md).

**The cost chain** is two sheets that meet (revised 2026-09-15, direction.md
§11-13). A course bears its **direct** costs; a program term bears its
**indirect** ones once and shares them across its curriculum:

```
per course     Direct costs                            (its own sheet)
per term       Indirect costs                          (its own sheet)
               distributed by credit hours             (shares total 100%)
per course     Direct + Share = Subtotal, + markup = Total Course Cost
               ÷ its students              = Cost per Student
per term       Σ Total Course Cost          = Total Program Cost
               ÷ program enrollment        = Cost per Student, program basis
               rounded up                   = Preferred Price
```

The share is **derived**, never entered, which is what makes it impossible for
the shares not to total 100. The old model let each course type a percentage of
an undefined whole, and 82 of 92 pools recovered less than the cost.

**The program chain adds the other half of the sum** (revised 2026-09-12,
§13a — revenue is invoiced, not implied):

```
Package price × Enrolled students = List revenue     (what the price implies)
Σ billed invoice totals           = Revenue
  of which paid                   = Collected
Σ (course cost per student × program head count on that course) = Cost
Collected − Cost                  = Net profit
```

Cost is attributed per student rather than per sheet, because a course taught
into two programs cannot charge its whole sheet to either. A course with no
cost sheet contributes *unknown*, not zero, and the count of those travels with
the result so an incomplete total is never shown as a finished one.

All three chains share a design constraint
that shaped the types: **the arithmetic is shown, not hidden.** A cost screen
displays the operands and the running total; an evaluation score displays each
role's contribution before the sum. That is why `ScoreResult` carries
`roles: RoleScore[]` with a `weighted` value per role rather than just a final
number — the UI is meant to be able to render the working.

---

## Where state lives

| Kind | Home | Why |
| --- | --- | --- |
| Search, filter, sort, pagination, selected course/semester | **URL search params** | A filtered view survives a refresh, can be bookmarked and shared, and the back button behaves. See `hooks/use-list-query-params.ts`. |
| Everything from the server | **TanStack Query** | One cache, one invalidation story. Server data is never copied into local state by hand. |
| Transient UI — is this dialog open | **React state** | Nothing else needs to know. |
| Theme | **next-themes** | Writes a class onto `<html>` before hydration. |

No global state library. `direction.md` and `scaffold.md` both forbid adding one
without a demonstrated need, and URL-as-state removes most of the need.

---

## Calculations

Business math is pure, lives in `lib/calculations/` or a feature's
`calculations/` folder, and is **never inline in JSX**. It is the layer with unit
tests, because it is the part that can be wrong without looking wrong.

There are 11 <!-- count:calculations --> modules under `lib/calculations/`, and
each has a test file beside it:

| Function | Where | Status |
| --- | --- | --- |
| `calculateGrade`, `gradeRange` | `lib/calculations/grade.ts` | built, tested |
| `calculateRanking` | `lib/calculations/ranking.ts` | built, tested |
| `clamp`, rounding helpers | `lib/calculations/number.ts` | built, tested |
| `calculateEvaluationScore` | `lib/calculations/score.ts` | built, tested |
| `summarizeWeights`, `normalizeWeights`, role toggles | `lib/calculations/evaluation-weights.ts` | built, tested |
| Window state — open, closed, not yet open | `lib/calculations/evaluation-window.ts` | built, tested |
| `copyQuestion`, `questionsForRelation` | `lib/calculations/question.ts` | built, tested |
| `calculateCostBreakdown`, `calculateTotalCost`, `calculateCostPerStudent`, `distribute` | `lib/calculations/cost.ts` | built, tested |
| `calculateProgramProfit`, `breakEvenPrice` | `lib/calculations/profit.ts` | built, tested |
| Invoice lines, the package reconciliation, `CREDIT_RATE`, the payment payload | `lib/calculations/invoice.ts` | built, tested |
| Enrollment expansion and the conflict rules | `lib/calculations/enrollment.ts` | built, tested |

`server/` holds no business math of its own. Anything a route handler needs to
decide lives in one of the modules above, because that is the half with tests
around it — the reason `lib/calculations/enrollment.ts` exists rather than the
expansion sitting inside the enrollment service.

Two invariants worth stating out loud:

- **Grade is derived, never stored.** `calculateGrade(score)` is a pure function
  of the score, so a persisted grade cannot drift out of step with the score it
  came from.
- **Ranking states its scope.** `calculateRanking` ranks whatever set it is
  handed and does not know whether that set is one evaluation group or a whole
  course-semester. Deciding the scope — and saying so in the UI — belongs to the
  caller. Ties share a rank and the next rank skips them (competition ranking),
  and a tie is flagged rather than broken silently.

---

## Conventions

- **Styling** — semantic CSS variables only. No `bg-[#123456]` where a token
  exists, no pixel size in a class name. See [design-system.md](design-system.md).
- **Four states** — every data-driven screen implements loading, success, empty
  and error. No blank screens. `components/feedback/` exists for this.
- **Naming is concrete** — `StudentTable`, `CostSheetForm`. Never
  `DataComponent` or `Form2`. Large page components split into named parts.
- **`any` needs a documented reason.**
- **Accessibility is a requirement, not polish** — keyboard navigation, visible
  focus, real labels, accessible dialogs and form errors. Radix behavior via
  shadcn does the heavy lifting; the rest is documented and measured on
  `/design-system#a11y-contrast`.
- **Types** — one file per domain under `types/`. Never a single giant
  `types.ts`.

---

## Current state

Honest inventory, because a document that describes the target as though it
exists is worse than no document.

| Layer | State |
| --- | --- |
| Token layer, theme, motion, accessibility docs | **built** |
| `components/ui`, `shared`, `feedback`, `forms`, `data-table`, `data-viz`, `decor`, `layout` | **built** |
| `/design-system` — every token, primitive, overlay and pattern, anchored section by section | **built** |
| `/system-guide` — the dataset, the domain as a mind map, the money chain re-derived, the route tree | **built**, and derived rather than written |
| Routing | **built** — every application route renders real data. `/reports/students/[studentId]` was the last placeholder and became a student's own reports on 2026-09-19 (`AUD-002` closed); staff still reach any report from a results row under Manage Evaluation |
| `types/`, `lib/api/`, `lib/constants/`, `hooks/` | **built** |
| `lib/calculations/` | **built** — eleven <!-- count:calculations --> modules, each with a test file |
| `data/mock/`, `data/seed/` | **built** — deterministic generator |
| `server/`, `app/api/` | **built** — the BFF, 33 <!-- count:routeHandlers --> route handlers over 13 <!-- count:apiDomains --> domains |
| `lib/access/`, `proxy.ts`, `server/principal.ts`, `/login` | **built** — the demo sign-in and four app roles (2026-09-16) |
| All twelve `features/*` | **built** — `reports` is the thinnest, and its screens live under Manage Evaluation |

Built so far: Curriculum → Course → Semester → Enrollment → Student Profile →
Cost Management → Cost Catalog → Invoices → Manage Evaluation → the demo
persona switcher → Your Evaluation and the two form kinds → Score → Grade →
Individual Report. The demo sign-in and the role-aware navigation landed out of
order, at the user's request.

What comes next: submission contracts, then the computed leaderboard, then the
pass/fail derivation onto a program enrollment (`direction.md` §8).

Three things are open and worth knowing before working in this tree:

- **Nothing has been seen in a browser** (`AUD-009`, open since 2026-09-07).
  Every screen is verified by build, test and served markup. Do not describe how
  anything looks.
- **Two sideways feature imports** exist and are recorded, not sanctioned
  (`AUD-012`).
- **Writes are never persisted**, which is a deliberate constraint rather than a
  gap — see [decisions/why-bff.md](decisions/why-bff.md).
