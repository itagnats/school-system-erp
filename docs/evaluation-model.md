# The 360° evaluation model

The domain chain that gives PRIME its reason to exist: a student is evaluated
from four directions, the results are blended into one score, and the score
becomes a rank, a grade and a report.

Related: [architecture.md](architecture.md) · [data-flow.md](data-flow.md)

---

## The chain

```
Course + Semester
        ↓
Evaluation Group
        ↓
Assign evaluators
        ↓
┌──────────────────────────────┐
│  Student    (peers in group) │
│  Inspector  (another group)  │
│  Teacher                     │
│  TA                          │
└──────────────┬───────────────┘
               ↓
        Evaluation forms
               ↓
        Score calculation      ← weighted blend
               ↓
            Ranking            ← scope must be stated
               ↓
        Grade calculation      ← derived, never stored
               ↓
     Individual student report ← must print cleanly
```

---

## Evaluation groups

Students are assigned to groups within a **course and semester**. The group is
the context for peer evaluation.

```
IT101 — 202602

Evaluation Group A          Evaluation Group B
├── Student 001             ├── Student 005
├── Student 002             ├── Student 006
├── Student 003             ├── Student 007
└── Student 004             └── Student 008
```

A group holds `memberEnrollmentIds`, not student ids — membership is a property
of the enrollment, so the same student in a different semester is a different
member.

---

## The four evaluator roles

| Role | Who | Perspective |
| --- | --- | --- |
| `STUDENT` | peers inside the subject's own group | how they work with the people beside them |
| `INSPECTOR` | a student from **another** group | an outside peer view, without the in-group dynamics |
| `TEACHER` | the teacher | the authoritative assessment |
| `TA` | the teaching assistant | a second staff perspective |

An `Evaluator` carries a `sourceGroupId` precisely so an inspector can be traced
back to the group they came from.

### The rule that must never break

> **A student must never evaluate themselves.**

This is not a UI nicety. Self-evaluation would silently inflate the peer
component of the score, and it would do so invisibly — the number would still
look plausible. The constraint belongs in the service layer, enforced when
evaluator assignments are generated and again when a submission is accepted, not
only in the form that renders the list of subjects.

---

## Criteria and scale

Seven student-oriented criteria: **Participation · Teamwork · Communication ·
Problem Solving · Responsibility · Leadership · Technical Contribution**.

Rated 1–5:

```
1  Needs improvement
2  Developing
3  Good
4  Very good
5  Excellent
```

Each `CriterionScore` may carry its own comment, and an evaluation may carry an
`overallComment`.

---

## The evaluation form

An evaluator selects a subject, rates each criterion, optionally comments,
reviews, and then saves as a draft or submits.

`EvaluationStatus` is `not-started | draft | submitted`. After submission the
evaluation becomes read-only unless reopening is deliberately supported.

The form is one of the two showpiece screens in this project, so it implements
the full set: validation, draft state, loading, submission, success feedback and
error feedback — with 422 field errors from the BFF bound back onto the offending
inputs.

---

## Score calculation

Each role produces a score. The four are blended by a **configurable** weighting;
the demo default lives in `config/app.ts`:

```ts
DEFAULT_EVALUATION_WEIGHTS = { student: 30, inspector: 20, teacher: 35, ta: 15 }
```

### The arithmetic is shown, not hidden

This is the design constraint that shaped the types. `ScoreResult` carries
`roles: RoleScore[]`, and each `RoleScore` holds the role's `score`, its
`weightPercent`, the resulting `weighted` value **and** the `evaluationCount`
behind it — so the UI can render the working rather than a number that appears
from nowhere:

```
Peer        88 × 30%  =  26.40      (4 evaluations)
Inspector   92 × 20%  =  18.40      (1 evaluation)
Teacher     95 × 35%  =  33.25      (1 evaluation)
TA          90 × 15%  =  13.50      (1 evaluation)
                         ───────
Final score               91.55
```

`ScoreResult` also carries `coveragePercent` — how much of the expected
evaluation actually arrived. A final score built from two of the four roles is
not the same claim as one built from all four, and the UI has to be able to say
so.

**Status: `calculateEvaluationScore` is not built yet.** It belongs in
`features/evaluation/calculations/`, pure and unit-tested.

---

## Ranking

Students are ranked on their final score.

```
IT101 — 202602        (course/semester scope)

Rank   Student       Score
─────────────────────────────
1      Student A      92.50
2      Student B      89.70
3      Student C      87.20
4      Student D      83.90
```

Two rules, both enforced in `lib/calculations/ranking.ts`:

**Scope must be stated.** `RankingScope` is `group | course-semester`.
`calculateRanking` ranks whatever set it is handed and deliberately does not know
which of the two it is looking at — deciding the scope, and saying so in the UI,
belongs to the caller. An unlabelled ranking is ambiguous in a way that matters
to the student being ranked.

**Ties are shown, not broken.** Competition ranking: equal scores share a rank
and the next rank skips them, so two students tied at 1 are followed by rank 3.
A tie is flagged rather than resolved by an arbitrary tiebreak, because an
invented ordering in a ranking someone is graded on is worse than an honest tie.

**Status: built and unit-tested.**

---

## Grade calculation

```
90–100   A
80–89    B
70–79    C
60–69    D
< 60     F
```

Thresholds live in `config/app.ts` as `GRADE_THRESHOLDS`, highest first.

**The grade is derived and never stored.** `calculateGrade(finalScore)` is a
pure function, so there is no way for a persisted grade to drift out of step
with the score it came from. `gradeRange(grade)` gives the inclusive display
range back, for legends.

**Status: built and unit-tested.**

---

## Individual student report

The end of the chain, and the one screen with a hard output requirement: **it
must print cleanly.**

Two consequences that reach back into the design system:

- everything in `components/decor/` is tagged `data-decor`, which the print rule
  strips — petals do not belong on a student report;
- the `.dark` token overrides are scoped inside `@media screen`, so printing with
  dark mode on falls back to the light palette instead of producing pale text on
  a forced white page.

The report is server-rendered from the services directly rather than fetched over
HTTP, since there is nothing on it to interact with.

---

## What exists today

| Piece | State |
| --- | --- |
| Domain types — roles, criteria, `Evaluation`, `RoleScore`, `ScoreResult`, `RankingEntry` | **built** (`types/evaluation.ts`) |
| Default weights, grade thresholds | **built** (`config/app.ts`) |
| `calculateGrade`, `gradeRange` | **built**, tested |
| `calculateRanking` | **built**, tested |
| `calculateEvaluationScore` | **not built** |
| Self-evaluation guard | **not built** |
| Evaluation groups, forms, score, ranking, grade, report screens | **not built** — routes exist and render placeholders |
| `data/mock/evaluation.ts` | file exists, array **empty** |

The types are further along than the logic, deliberately: they encode the
"show the arithmetic" and "state the scope" constraints so that the calculations
cannot be written in a way that hides them.
