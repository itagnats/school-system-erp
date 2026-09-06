# Why feature-first architecture

**Status:** accepted · decided during scaffolding, 2026-09-03

---

## Context

PRIME has seven domains — courses, semesters, enrollment, students, costs,
evaluation, reports — and each one needs components, data hooks, API calls,
validation schemas and business math.

There are two conventional ways to arrange that. Group by **technical kind**:

```
components/CourseTable.tsx  components/StudentTable.tsx  components/CostSheetForm.tsx
hooks/useCourses.ts         hooks/useStudents.ts         hooks/useCostSheet.ts
services/courses.ts         services/students.ts         services/costs.ts
```

or group by **domain**:

```
features/courses/{components,hooks,services,validations,calculations}
features/students/{…}
features/costs/{…}
```

The technical grouping is what a small app naturally grows into, and it is fine
until the app stops being small. Its failure mode is that a single feature ends
up scattered across five directories, so understanding "how does enrollment
work" means opening five folders and mentally rejoining them — and deleting a
feature means finding every piece by hand.

---

## Decision

Group by domain. `features/<domain>/` is self-contained:

```
features/<domain>/
├── components/       UI specific to this feature
├── hooks/            data hooks; call services, never fetch directly
├── services/         API calls via lib/api
├── validations/      Zod schemas for this feature
├── calculations/     pure business math, unit tested
├── types.ts          feature-local types
└── constants.ts      status-to-tone maps, labels, option lists
```

**Business rules live inside a feature folder and nowhere above it.** Anything
genuinely shared moves down into `lib/` or `components/shared/` — and moving it
down is a deliberate act, not a default.

The companion rule is the one that makes the boundary hold: **a generic component
never learns domain vocabulary.** `StatusBadge` knows six visual tones and
nothing about enrollment; a feature maps its own status union onto a tone in its
own `constants.ts`. If you find yourself adding an `enrollmentStatus` prop to
something in `components/`, the component is in the wrong layer.

Cross-domain math is the documented exception. `calculateGrade` and
`calculateRanking` sit in `lib/calculations/` because evaluation, reports and the
design system page all need them, and duplicating them per feature would be worse
than the small loss of locality.

---

## Consequences

**Good**

- A domain is one folder. Reading it, reviewing it, or deleting it is one
  operation.
- The layering rule becomes mechanically checkable: nothing under `components/`
  may import from `features/`.
- Eight domains done the same way is itself a demonstration — consistency across
  repetition reads as discipline, where seven bespoke arrangements read as drift.
- Feature-local `constants.ts` gives the status-to-tone mapping an obvious home,
  which is what keeps the generic components generic.

**Costs**

- More directories. The scaffold still has empty feature subfolders, which
  looks like ceremony until the modules land.
- Genuinely shared logic needs a conscious move. Left in a feature, it gets
  copy-pasted; moved too eagerly, `lib/` becomes a junk drawer.
- Two people working on the same domain collide more than they would with the
  technical grouping.

**Note for anyone cloning this repo:** git does not track empty directories, so
the feature subfolders may not be present until the modules that fill them are.
The shape above is the intended one.

---

## Alternatives considered

**Group by technical kind.** Rejected: this project has seven domains and a
non-trivial rule set in two of them. The scattering cost arrives quickly.

**Flat `src/` with no feature boundary.** Rejected: nothing then prevents a cost
formula from being written inline in a table cell, which `direction.md`
explicitly forbids and which is the exact failure the calculation layer exists to
avoid.

**A monorepo package per domain.** Rejected as over-engineering for a single
deployable frontend. It buys enforced boundaries at the price of build tooling
that would dominate the project.
