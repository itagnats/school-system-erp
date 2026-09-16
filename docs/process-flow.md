# Process flow

How work moves through PRIME, module by module — and where the chain stops.

`data-flow.md` answers *how a value gets from a fixture to a pixel*. This answers
the question above it: *what is the business actually doing, and can a person
walk it end to end?* It is a process audit as much as a description, so it says
where a flow is complete and where it is a dead end.

Related: [architecture.md](architecture.md) · [data-flow.md](data-flow.md) ·
[evaluation-model.md](evaluation-model.md) · [../.claude/audit/AUDIT-LOG.md](../.claude/audit/AUDIT-LOG.md)

Audited 2026-09-12 against the working tree at commit `6b89d17`. Counts are from
the shipped seed (`SEED = 20260105`), read out of `data/seed/generate.ts` rather
than quoted from an older document.

## Partly superseded — read this first

*Updated 2026-09-16 at commit `ba6c6eb`.* This is an audit, so it is left as the
record of what was found on 2026-09-12 rather than rewritten. Four of its
findings have since been acted on, and the money chain it describes has changed
shape underneath it:

| Since the audit | Effect on this document |
| --- | --- |
| **F-8 closed** — invoicing built, revenue is now billed rather than implied (§13a/§13b) | the `ProgramProfit` line in the diagram is right; "Package price × head count" anywhere else is now *list* revenue |
| **F-3 closed** — the cost catalogue and sheet CRUD landed | the Cost row in the module table and the F-3 section below are both out of date |
| **AUD-001 closed** — the dashboard is built | the Dashboard row in the module table is out of date |
| **Costing rebuilt programme-first** (2026-09-15, §11-13) | **the biggest divergence.** `CostSheet (61)` in the diagram is now two records: `CourseCostSheet` (56, direct only) and `ProgramCostSheet` (19, indirect only). `direct + shared + markup` is gone — a course's total is its direct costs plus a *derived* share of its programme's pool, and markup moved to the programme term. `allocationPercent` no longer exists |
| **AUD-015 closed** — one curriculum course is deliberately uncosted | "every cohort covered, so no programme term reports an unknown cost" is now false **on purpose**: 1 of 19 terms reports one |

The three chains and the join points are still accurate; the cost chain's
internals are not. `direction.md` §11-13 and `architecture.md` are the current
description.

**Updated the same day**, when the invoice module was built: chain A now runs to
a billed document, and finding F-8 — revenue counted a pending student as earned
— is closed by it.

---

## The three chains

PRIME is not one pipeline. It is three chains hanging off the same
Course → Semester spine, joined at exactly two points.

```
                       ┌─────────────── Course ── Semester ───────────────┐
                       │                 (30)       (4) → 50 cohorts      │
                       ▼                                                  ▼
    ┌──────── A. MONEY ─────────┐                      ┌──── B. PEOPLE ────────┐
    Program (5)                                         Student (300)
      └ ProgramTerm (19)                                  └ ProgramEnrollment (635)
           curriculum + package price                          │      │
           └ CostSheet (61)                                    │      └─────────────┐
                direct + shared + markup                       ▼  derived, 88%      ▼
                └ costPerStudent                          Enrollment (1,297)   Invoice (635)
                     │                                         └ EvaluationGroup     │ lines = curriculum
                     │                                                (134)          │ credits for drops
                     └──────────→ ProgramProfit ←──────────────────────┼─────────────┘
                       collected − Σ(cost/student × head count)        │
                                                                       ▼
                                            ┌──────── C. JUDGEMENT ──────────┐
                                            EvaluationSetup (36) — the blend
                                              └ assignment (derived, never stored)
                                                   └ 360 form │ ranking form
                                                        ╳  ← the break
                                                   hash-derived submissions
                                                        └ ScoreResult → grade → rank
                                                             └ Report → window.print()
```

### Where the chains join

Two joins, and both are real joins rather than a number carried across.

**A meets B in `programTermProfit()`** (`server/services/program-service.ts:80`).
The head count per course is computed against programme members who actually
enrolled in that course, not the term head count reused. A student in the
programme has not necessarily taken every course of its curriculum, and charging
the programme for absent students would overstate cost.

**B meets C in `generateEvaluationGroups()`** (`data/seed/generate.ts:536`). A
group is a *partition of the enrollment rows* with the group id written back, so
a group's members are always people enrolled in its course-semester. Groups
generated independently was the mistake the programme layer had already made
once.

**A meets B again in `invoicedRevenueForTerm()`** (`server/services/invoice-service.ts`).
An invoice is derived from a programme enrollment and priced from the curriculum,
so the money owed and the people who owe it cannot disagree. This is the join
that closes the chain: cost says what delivery cost, an invoice says who owes
for it, and profit is the difference between what arrived and what was spent.

### The order is the rule

`generateDataset()` (`data/seed/generate.ts:728`) runs: semesters → courses →
students → programme terms → programme enrolments → **course enrolments as a
consequence** → groups → setups → cost sheets → **invoices last**, because an
invoice needs the curriculum for its lines and the course enrolments for its
credits.

That ordering is not a convenience. It is `direction.md` §7a — *a student enrols
in a programme, not in a course* — expressed as code. A course enrolment cannot
be generated before the programme enrolment it derives from.

---

## Module by module

| Module | Read flow | Write flow | State |
| --- | --- | --- | --- |
| Curriculum `/programs` | list, term detail with profit, billing and roster | `PATCH` package price / status, recomputing profit | read complete, write partial |
| Courses | list, detail (semesters, terms, sheets) | `POST` create · `PATCH` edit · archive/restore, optimistic | **the only complete module** |
| Semesters | list, detail | none | dead-end leaf — F-4 |
| Enrollment | joined list, filterable by course, semester, status, group, programme | none | read-only — F-2 |
| Students | list, profile (personal, academic, experience, enrollment history) | none | read-only — F-2 |
| Cost | list, sheet detail with the full breakdown | `PATCH` markup % and student count only | structure read-only — F-3 |
| Invoices | list, document detail with lines and totals | `PATCH` status, validated against the transition table | read complete; one transition by design |
| Manage Evaluation | list, setup detail, readiness marks, per-assessee blend | `PATCH` the blend, server-validated and renormalising | config works, lifecycle does not — F-5 |
| Your Evaluation | persona → derived queue → both form kinds | Submit is inert | F-1 |
| Reports | pick setup → results → report dialog → print | n/a | works |
| Dashboard | `ScaffoldPlaceholder` | n/a | empty — AUD-001 |

### The shape of the dataset

| | Count | |
| --- | --- | --- |
| Semesters · Courses · Students | 4 · 30 · 300 | |
| Programmes · terms · programme enrolments | 5 · 19 · 635 | |
| Course enrolments | 1,297 | 774 grouped; the rest are dropped, cancelled or pending, which `EVALUABLE` excludes |
| Course-semester cohorts | 50 | every one has groups |
| Evaluation setups | 36 | 15 published, 9 draft, 6 open, 6 closed; 26 editing-locked |
| Cost sheets | 61 | every cohort covered, so no programme term reports an unknown cost |
| Evaluation groups | 134 | sizes 4–7, clustered on 5 and 6 |
| Invoices | 635 | 238 paid · 171 draft · 83 cancelled · 75 overdue · 68 issued |
| Invoice lines | 2,573 | 1,685 course · 597 fee · 291 credit (189 dropped, 102 cancelled) |

---

## Findings

Ids are local to this document. Where a finding restates one already in the
audit log, the `AUD-nnn` id is given — that log stays the register of record.

### F-1 · high — the Submit button is wired to nothing

`features/evaluation/components/evaluation-form-screen.tsx:106` is
`<Button disabled={readOnly}>Submit</Button>`: no `onClick`, no enclosing
`<form>`, no handler. The comment above it says the button *"acknowledges rather
than persists… because a Submit that silently forgets is worse than one that
admits it"* — but it does not acknowledge either. Clicking it does nothing. It
is the only visibly dead control in the application, and it sits at the end of
the longest flow in the product.

Separate from it, and deliberate: there is no `POST` under `/api/evaluation`,
and results are derived from a hash of the subject ids
(`server/services/report-service.ts:33`), so a submission could not reach a
score even if it were stored. The Evaluate → Score loop is open by design and
documented. The inert button is not.

### F-2 · high — no student can enter the system through the UI

`/api/enrollment` and `/api/students` are `GET`-only. §7 (Add Student, over its
three paths — existing profile, previous course, new student), §8 (enrollment
status transitions) and §10 (profile editing) have no route, no form and no
button anywhere. Every one of the 1,297 enrolments exists because the seed
generator made it. For a product whose stated spine is the student lifecycle,
the lifecycle has no entrance.

### F-3 · medium — Cost Management cannot manage the cost structure — **CLOSED 2026-09-12**

*Closed by the cost catalogue and sheet CRUD. The description below is the
finding as written; allocation percentages no longer exist at all after the
2026-09-15 rebuild.*

The update contract accepts `markupPercent` and `studentCount` only
(`features/costs/components/cost-breakdown-panel.tsx:85`). The four levels §12
describes — cost group → item → option, with an allocation percentage on shared
items — render correctly and cannot be edited or added to. The screen
recalculates well; it just cannot change what is being calculated.

### F-4 · medium — the flow is not walkable (the process face of AUD-003)

Cross-links exist only where someone added one by hand. Seven of the sixteen
`routes.ts` builders have no caller.

- **Course detail** is the one real hub — semester, programme term, cost sheet.
- **Student profile** links to a course and nothing else: not to their report,
  their group, or their programme. The centre of the domain is a leaf.
- **Semester detail** (`app/(dashboard)/semesters/[semesterId]/page.tsx`) links
  nowhere. One `Details` list, no courses, cohorts, sheets or setups for that
  semester, though it is level two of the core lifecycle.
- **Cost sheet detail** links nowhere — not even back to its own course.
- **A results row** opens the report dialog but never links to the student.
- **An evaluation setup** has no link to its own results under `/reports`.

### F-5 · medium — the evaluation lifecycle has no verbs

A setup's blend can be edited; the setup cannot. There is no create-setup, no
create or rebalance group, no move a student between groups, and no open or
close window action — `status` and `editingLocked` are seeded and reachable only
by `PATCH`ing the whole setup. Fifteen of the fifty cohorts have groups and no
setup at all, and nothing in the UI can create one for them.

### F-6 · low — `/reports/students/[studentId]` is dead (AUD-002)

Still a placeholder. The live report is
`/api/evaluation/[setupId]/report/[subjectId]`, and `routes.studentReport` has
no callers. Either delete both, or point the route at the live report — it is
the natural target for the missing student → report link in F-4.

### F-7 · low — the coverage gap is invisible

Thirty-six setups cover thirty-five of the fifty enrolled cohorts. One
hand-written fixture (`evs-it205-202602`, draft) sits on a cohort with no
enrolments, which reads as deliberate: it exercises the *not configured*
readiness mark. But nothing tells an administrator that fifteen grouped cohorts
will never produce a report.

---

### F-8 · high — revenue was an entitlement presented as an earning — **closed 2026-09-12**

`revenue = packagePrice × enrolledCount` counted every programme member who had
not withdrawn, `pending` included: **143 of 552 members, ฿4.79M of ฿18.35M — 26%
of booked revenue — from students who had not started.** §13a was silent on
which statuses counted, so the code chose one and nothing recorded the choice.

Closed by the invoice module. Revenue is now the sum of the billed invoice
totals, split into collected and outstanding, and net profit and margin are
stated on the collected basis. §13a was amended rather than merely obeyed, so
the rule is written down where it belongs.

**Evidence.** `pgt-bsc-it-202601` used to report ฿873,800 of revenue and a
positive profit; it now reports ฿740,000 invoiced, ฿238,100 collected,
฿501,900 outstanding and a net of −฿28,888 on the collected basis. The five
`202602` terms, whose invoices are all drafts, report no revenue at all rather
than the ฿5.49M their prices imply, and the screen says why. Pinned by
`tests/calculations/profit.test.ts` — "does not count outstanding invoices as
profit".

---

## What the process gets right

Worth stating, because these are the decisions that are expensive to retrofit
and they are already correct.

- **Business math sits in the calculation layer**, never in JSX —
  `lib/calculations/` plus feature `calculations/`, and it is the only thing
  under test (94 tests over seven modules), which is the priority §27 asks for.
- **Null is not zero**, in all three places it matters: `costPerStudent` with no
  students, a subject with no submissions, and a course with no cost sheet
  contributing *unknown* to a programme's profit.
- **Derived, not stored**, for the assignment, the 360/ranking split, the
  headline weight summary and the grade. Manage Evaluation and Your Evaluation
  cannot disagree because there is no second copy to disagree with.
- **Determinism holds** — no `Math.random`, `Date.now` or bare `new Date()`
  anywhere in `data/` or `server/`, so a reload is the same dataset.

## Shortest path to a coherent demo

1. **F-1** — one handler. Roughly twenty lines, and it removes the only dead
   control in the product. Note that the invoice module's own write went in with
   a validated transition table, so F-1 is now the *only* inert control left.
2. **F-4** — the six missing links. Cheap, and it is what turns a set of screens
   into something a reader can walk.
3. **AUD-001** — the dashboard. Every piece it needs already exists.
