# Architecture

How PRIME is put together, and the one rule that everything else follows from.

Related: [data-flow.md](data-flow.md) · [design-system.md](design-system.md) ·
[evaluation-model.md](evaluation-model.md) · [decisions/](decisions/)

---

## The layering rule

Dependencies point in one direction. A module may import from anything below it
and from nothing above it.

```
design tokens          app/globals.css — the only place a colour is defined
      ↓
components/ui          generic primitives; no domain vocabulary
      ↓
components/decor       the petal layer; inert, and stripped in print
      ↓
components/data-viz    the only place recharts is imported
      ↓
components/shared      application patterns; still no business rules
      ↓
features/<domain>      business rules live here and nowhere above
      ↓
app/*                  routing and composition only
```

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
than inside it. Data-viz wraps recharts, which takes colours as strings and
cannot read a Tailwind class, so the wrappers pass `var(--chart-1)` and let the
browser resolve it — which is what keeps a chart following the theme switch.

---

## Folder map

```
app/
├── (dashboard)/          application routes, wrapped in the shell
├── design-system/        living documentation, built from _sections/
├── layout.tsx            fonts, metadata, providers
├── globals.css           the token layer
├── error.tsx             route error boundary
└── not-found.tsx

components/
├── ui/                   26 primitives — shadcn on the Radix base, restyled
├── decor/                sakura mark, corner petals, page wash
├── data-viz/             three charts + frame, tooltip, tokens
├── feedback/             loading, empty, error, skeletons, query boundary
├── forms/                form section and action layouts
├── data-table/           the single table implementation
├── shared/               page header, filters, status, stat card, panels
├── layout/               shell, sidebar, header, breadcrumbs, theme toggle
└── providers/            theme and query providers

features/<domain>/
├── components/           UI specific to this feature
├── hooks/                data hooks; call services, never fetch directly
├── services/             API calls via lib/api
├── validations/          Zod schemas for this feature
├── calculations/         pure business math, unit tested
├── types.ts              feature-local types
└── constants.ts          status-to-tone maps, labels, option lists

lib/
├── api/                  fetch client, error mapping, wire contracts
├── calculations/         cross-module business math
├── validations/          shared Zod primitives
├── constants/            query keys and route builders
└── utils/                cn, formatting, URL helpers

types/                    one file per domain — never a single giant types.ts
config/                   app constants, navigation model, validated env
data/mock/                fictional fixtures
tests/                    unit tests over the calculation layer
docs/                     this folder
```

Eight domains: `programs`, `courses`, `semesters`, `enrollment`, `students`,
`costs`, `evaluation`, `reports`.

---

## Routing

Everything under `(dashboard)/` is wrapped in the application shell by a single
group layout.

```
/                                    → redirects to /dashboard
/dashboard
/programs                            /programs/[programTermId]
/courses                             /courses/[courseId]
/semesters                           /semesters/[semesterId]
/enrollment
/students                            /students/[studentId]
/costs                               /costs/[costSheetId]
/evaluation                          /evaluation/[evaluationId]
/evaluation/manage
/reports                             /reports/students/[studentId]
/design-system
```

The evaluation area is split by perspective: `/evaluation/manage` is the teacher
and administrator view, `/evaluation` is the evaluator's own queue. Ranking is
not a route — an ordering is submitted inside a form, and the computed
leaderboard is a result shown under Manage.

The route shape mirrors the domain model rather than the navigation menu, so a
URL reads as a location in the data.

---

## The domain model

Three chains. A course can be offered in many semesters and can appear in many
programmes; semester codes are `YYYYNN` (`202601`, `202602`).

```
Program → Program Term → Courses          → Package price
                       → Program Enrollment → Student

Course → Semester → Enrollment → Student → Evaluation Group
                                        → 360° Evaluation → Score → Grade → Report
                                                                  → Ranking

Course → Semester → Cost Sheet → Cost Group → Cost Item → Cost Option
                                                        → Cost per Student
```

**The programme chain is what a student actually buys.** A course has a cost but
no price; a programme term has both, which is what lets the same data answer
"did this make money" rather than only "what did it spend". Enrolment is entered
at the programme level and the course enrollments follow from the curriculum, so
the two can never disagree about who is on what.

**The evaluation chain** is documented in full in
[evaluation-model.md](evaluation-model.md).

**The cost chain** is two sheets that meet (revised 2026-09-15, direction.md
§11-13). A course bears its **direct** costs; a programme term bears its
**indirect** ones once and shares them across its curriculum:

```
per course     Direct costs                            (its own sheet)
per term       Indirect costs                          (its own sheet)
               distributed by credit hours             (shares total 100%)
per course     Direct + Share = Subtotal, + markup = Total Course Cost
               ÷ its students              = Cost per Student
per term       Σ Total Course Cost          = Total Programme Cost
               ÷ programme enrolment        = Cost per Student, programme basis
               rounded up                   = Preferred Price
```

The share is **derived**, never entered, which is what makes it impossible for
the shares not to total 100. The old model let each course type a percentage of
an undefined whole, and 82 of 92 pools recovered less than the cost.

**The programme chain adds the other half of the sum** (revised 2026-09-12,
§13a — revenue is invoiced, not implied):

```
Package price × Enrolled students = List revenue     (what the price implies)
Σ billed invoice totals           = Revenue
  of which paid                   = Collected
Σ (course cost per student × programme head count on that course) = Cost
Collected − Cost                  = Net profit
```

Cost is attributed per student rather than per sheet, because a course taught
into two programmes cannot charge its whole sheet to either. A course with no
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

| Function | Where | Status |
| --- | --- | --- |
| `calculateGrade`, `gradeRange` | `lib/calculations/grade.ts` | built, tested |
| `calculateRanking` | `lib/calculations/ranking.ts` | built, tested |
| `clamp`, rounding helpers | `lib/calculations/number.ts` | built, tested |
| `calculateEvaluationScore` | `features/evaluation/calculations/` | planned |
| `calculateCostBreakdown`, `calculateTotalCost`, `calculateCostPerStudent` | `lib/calculations/cost.ts` | built, tested |
| `calculateProgramProfit`, `breakEvenPrice` | `lib/calculations/profit.ts` | built, tested |

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
  focus, real labels, accessible dialogs and form errors. Radix behaviour via
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
| `components/ui` (26), `shared` (11), `feedback`, `forms`, `data-table`, `data-viz`, `decor`, `layout` | **built** |
| `/design-system` — 6 groups, ~60 anchored sections | **built** |
| Routing | **built** — programme, course, semester, student, enrollment and cost screens render real data; evaluation and reports still render `ScaffoldPlaceholder` |
| `types/`, `lib/api/`, `lib/constants/`, `hooks/` | **built** |
| `lib/calculations/` | grade, ranking, number, cost, profit — all unit tested |
| `data/mock/`, `data/seed/` | **built** — deterministic generator |
| `server/`, `app/api/` | **built** — the BFF, eleven route handlers |
| `features/programs\|courses\|semesters\|students\|enrollment\|costs` | **built** |
| `features/evaluation` | vocabulary and types only |
| `features/reports` | README stub |

Built so far: Curriculum → Course → Semester → Enrollment → Student Profile →
Cost Management.

What comes next: the demo persona switcher, then Manage Evaluation → Your
Evaluation → the two form kinds → Score → Grade → Individual Report.
