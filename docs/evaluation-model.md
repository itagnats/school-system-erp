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

### Question sets per role

Decided 2026-09-06. All four roles take the 360 form, but they are not asked the
same questions. One canonical list, and each role is asked the subset it can
actually judge:

```
                    Peer  Insp  Teach  TA
  Participation       x     x      x    x
  Teamwork            x     x      x    x
  Communication       x     x      x    x
  Problem solving     x     -      x    x
  Responsibility      x     x      x    -
  Leadership          x     x      x    -
  Technical contrib.  -     -      x    x
```

The gaps carry the meaning. An inspector meets the group once, so it is not
asked about problem solving. A TA sees the work rather than the whole cohort, so
it is not asked about responsibility or leadership. Peers are not asked to grade
technical contribution. Only the teacher answers all seven.

**A subset, not a separate wording per role.** Wording each role's questions
independently was rejected: a criterion would then mean something slightly
different depending on who answered it, and scores would stop being comparable
across roles. A role's 360 score is normalised over the criteria it was actually
asked, so a shorter set is not a penalty.

The set lives on `RoleConfig.criteria`, per role, per setup. A role weighted for
the 360 form with an **empty** set is rejected server-side — the same class of
failure as an unbalanced blend, in that the setup can look complete and still be
unable to produce a score.

---

## The evaluation form: two kinds

Revised 2026-09-06. An evaluator submits **two** things, and they are shaped
differently rather than being two views of one record:

| Kind | Scope | What is submitted |
| --- | --- | --- |
| `360` | one subject | a rating against each criterion that role is asked |
| `ranking` | every subject in scope | an ordering, strongest first |

**It is the 360 form, not the "criteria form".** All four roles take it — a
teacher assesses a student, and students assess each other — which is what makes
the assessment 360 degrees. Naming it after the criteria described the mechanism
and hid the point; what varies by role is the question set, not the kind of form.

`Evaluation` is a discriminated union on `kind` for that reason. A single
interface with an optional ordering would permit a 360 evaluation carrying
an ordering, or a ranking with a single subject; the union makes both
unrepresentable.

Neither kind ever lists the evaluator among its subjects. Ranking yourself first
is the same violation as rating yourself, wearing different clothes.

**An ordering is a strict permutation — no ties** (decided 2026-09-06). Every
position is used exactly once, so the form is a reorderable list rather than a
score per subject. A reference design offered a 1-5 score per subject with
duplicates allowed; it was rejected, because a rating that permits ties is a
criteria rating with one dimension instead of seven, and the ordering earns its
separate place in the blend precisely by forcing a discrimination the ratings do
not. The cost — ordering is harder work than scoring, and grows with the number
of subjects — is why an ordering is scoped to an evaluation group rather than a
whole cohort.

**Both feed the final score.** How they combine was decided on 2026-09-06 — see
"The blend" below.

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

## Ranking means two things

Keep them apart:

- an **ordering submitted by an evaluator** — an input, described above;
- the **computed leaderboard** below — an output derived from final scores.

The leaderboard is not a navigation destination. It is a result shown under
Manage Evaluation, beside the groups and completion it comes from.

## The computed leaderboard

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

## Where the screens live

Revised 2026-09-06, split by perspective rather than by feature:

| Screen | Route | Who it is for |
| --- | --- | --- |
| Manage Evaluation | `/evaluation/manage` | teacher and administrator: groups, evaluator assignment, completion, the computed leaderboard |
| Your Evaluation | `/evaluation` | the evaluator: forms assigned to you, and ones you have submitted |
| Evaluation form | `/evaluation/[evaluationId]` | one form, of either kind |

There is no sign-in, so "you" comes from a **demo persona switcher** — a control
that lets a reader act as a student, an inspector, a teacher or a TA. That is
what makes the four roles and the no-self-evaluation rule visible rather than
merely described.

## The blend

Decided 2026-09-06, closing what `direction.md` §20 had held open. **An ordering
is a share of each role's own weight, not a fifth evaluator.**

```text
final = SUM over enabled roles of
          weight% x ( threeSixtyShare% x threeSixtyScore
                    + rankingShare% x rankingScore )
```

The alternative — an ordering component sitting beside the four roles — was
rejected because a teacher who both rates and ranks would then count twice.

```text
role        weight    360 form / ordering
Peer          30%         60 / 40
Inspector     20%         70 / 30
Teacher       35%         70 / 30
TA            15%        100 / 0
                      ─────────────────
effective             71.5% on the 360 form, 28.5% on the ordering
```

Four properties are load-bearing:

- **Only `rankingSharePercent` is stored.** The 360 share is its
  complement. Two stored numbers that must total 100 will eventually disagree.
- **The effective split is derived** by `summariseWeights`, never entered. A
  reference design offered both the headline and the per-role weights as inputs,
  which gives one quantity two sources of truth and no rule for which wins.
- **A role can be switched off** and the rest renormalise, so a course without a
  teaching assistant does not leave 15% of every score unallocated.
- **The total is validated server-side.** It is the one input whose corruption
  raises no error at all — an unbalanced blend simply scales every score in the
  course by the same amount.

`lib/calculations/evaluation-weights.ts` holds the arithmetic; the setup screen
shows each role's own contribution beside the headline, so the derived figure can
be checked against its parts.

## What exists today

| Piece | State |
| --- | --- |
| Domain types — roles, criteria, `Evaluation`, `RoleScore`, `ScoreResult`, `RankingEntry` | **built** (`types/evaluation.ts`) |
| Default weights, grade thresholds | **built** (`config/app.ts`) |
| `calculateGrade`, `gradeRange` | **built**, tested |
| `calculateRanking` | **built**, tested |
| Weight blend — `summariseWeights`, `normaliseWeights`, role toggles | **built**, tested (14 tests) |
| Evaluation setup — types, seed, repository, service, contract, routes | **built** |
| Manage Evaluation list and setup detail screens | **built** |
| Evaluation groups | **built** — partitioned from each course-semester's enrollments |
| `calculateEvaluationScore` | **not built** — needs submitted evaluations |
| Self-evaluation guard | **not built** — the rule is rendered as locked, not yet enforced against a submission |
| Demo persona switcher | **not built** — blocks Your Evaluation |
| Evaluation forms, score, ranking, grade, report screens | **not built** |
| `data/mock/evaluation.ts` | **built** — default blends, guidance, three setups |

The types are further along than the logic, deliberately: they encode the
"show the arithmetic" and "state the scope" constraints so that the calculations
cannot be written in a way that hides them.
