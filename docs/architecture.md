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

Seven domains: `courses`, `semesters`, `enrollment`, `students`, `costs`,
`evaluation`, `reports`.

---

## Routing

Nineteen routes. Everything under `(dashboard)/` is wrapped in the application
shell by a single group layout.

```
/                                    → redirects to /dashboard
/dashboard
/courses                             /courses/[courseId]
/semesters                           /semesters/[semesterId]
/enrollment
/students                            /students/[studentId]
/costs                               /costs/[costSheetId]
/evaluation                          /evaluation/[evaluationId]
/evaluation/groups                   /evaluation/ranking
/reports                             /reports/students/[studentId]
/design-system
```

The route shape mirrors the domain model rather than the navigation menu, so a
URL reads as a location in the data.

---

## The domain model

Two chains hang off Course → Semester. A course can be offered in many
semesters; semester codes are `YYYYNN` (`202601`, `202602`).

```
Course → Semester → Enrollment → Student → Evaluation Group
                                        → 360° Evaluation → Score → Grade → Report
                                                                  → Ranking

Course → Semester → Cost Sheet → Cost Group → Cost Item → Cost Option
                                                        → Cost per Student
```

**The evaluation chain** is documented in full in
[evaluation-model.md](evaluation-model.md).

**The cost chain** is one visible formula:

```
Direct costs + Shared costs = Total course cost
Total course cost ÷ Number of students = Cost per student
```

with allocation and an optional markup. Both chains share a design constraint
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
| `calculateTotalCost`, `calculateCostPerStudent` | `features/costs/calculations/` | planned |

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
| Routing — 19 routes | **built**, every application route renders `ScaffoldPlaceholder` |
| `types/`, `lib/api/`, `lib/constants/`, `hooks/` | **built** |
| `lib/calculations/` | grade, ranking, number only |
| `data/mock/*.ts` | six files, every array **empty** |
| `server/`, `app/api/` | **do not exist** — this is the BFF work |
| `features/*` | seven README stubs; every subfolder empty |

Build order for what comes next: Course → Semester → Enrollment → Student
Profile → Cost Management → Evaluation Groups → 360° Evaluation → Score →
Ranking → Grade → Individual Report.
