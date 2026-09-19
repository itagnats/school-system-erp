# Process flow

How work moves through PRIME, module by module — and where each chain stops.

`data-flow.md` answers *how a value gets from a fixture to a pixel*. This answers
the question above it: *what is the business actually doing, and can a person
walk it end to end?* It says where a flow is complete and where it stops, because
a document that describes the target as though it exists is worse than no
document.

Related: [architecture.md](architecture.md) · [data-flow.md](data-flow.md) ·
[evaluation-model.md](evaluation-model.md) · [../.claude/audit/AUDIT-LOG.md](../.claude/audit/AUDIT-LOG.md)

Current as of 2026-09-17. Counts are read out of the shipped seed
(`SEED = 20260105`) rather than quoted from an older document, and
[`/system-guide`](http://localhost:3000/system-guide) prints the same figures
live if you would rather not trust this page.

---

## The three chains

PRIME is not one pipeline. It is three chains hanging off the same
Course → Semester spine, joined at three points.

```
                       ┌─────────────── Course ── Semester ───────────────┐
                       │                 (30)       (4) → 50 cohorts      │
                       ▼                                                  ▼
    ┌──────── A. MONEY ─────────┐                      ┌──── B. PEOPLE ────────┐
    Program (5)                                         Student (300)
      └ ProgramTerm (19)                                  └ ProgramEnrollment (635)
           curriculum + package price                          │      │
           ├ CourseCostSheet (56)  direct only                 │      └─────────────┐
           │    + derived share of ↓                           ▼  derived, 88%      ▼
           └ ProgramCostSheet (19) indirect, by credits   Enrollment (1,297)   Invoice (635)
                └ costPerStudent → markup → price             └ EvaluationGroup     │ lines = curriculum
                     │                                             (134)            │ credits for drops
                     └──────────→ ProgramProfit ←──────────────────┼────────────────┘
                       collected − Σ(cost/student × head count)    │
                                                                   ▼
                                            ┌──────── C. JUDGEMENT ──────────┐
                                            EvaluationSetup (36) — the blend
                                              └ questions copied from the bank
                                                └ assignment (derived, never stored)
                                                   └ 360 form │ ranking form
                                                        ╳  ← the break
                                                   hash-derived submissions
                                                        └ ScoreResult → grade → rank
                                                             └ Report → window.print()
```

### Where the chains join

Three joins, and all three are real joins rather than a number carried across.

**A meets B in `programTermProfit()`** (`server/services/program-service.ts`).
The head count per course is computed against programme members who actually
enrolled in that course, not the term head count reused. A student in the
programme has not necessarily taken every course of its curriculum, and charging
the programme for absent students would overstate cost.

**A meets B again in `invoicedRevenueForTerm()`**
(`server/services/invoice-service.ts`). An invoice is derived from a programme
enrolment and priced from the curriculum, so the money owed and the people who
owe it cannot disagree. This is the join that closes the money chain: cost says
what delivery cost, an invoice says who owes for it, and profit is the difference
between what arrived and what was spent.

**B meets C in `generateEvaluationGroups()`** (`data/seed/generate.ts`). A group
is a *partition of the enrollment rows* with the group id written back, so a
group's members are always people enrolled in its course-semester. Groups
generated independently was the mistake the programme layer had already made
once.

### The order is the rule

`generateDataset()` runs: semesters → courses → students → programme terms →
programme enrolments → **course enrolments as a consequence** → groups → setups →
cost sheets → **invoices last**, because an invoice needs the curriculum for its
lines and the course enrolments for its credits.

That ordering is not a convenience. It is `direction.md` §7a — *a student enrols
in a programme, not in a course* — expressed as code. A course enrolment cannot
be generated before the programme enrolment it derives from.

---

## A. The money chain, end to end

Two sheets, because there are two kinds of cost (`direction.md` §11-13, rebuilt
2026-09-15).

```
per course      Direct costs                              its own sheet
per term        Indirect costs                            its own sheet
                distributed by CREDITS                    shares total 100%
per course      Direct + Share = Subtotal, + markup    =  Total Course Cost
                Total ÷ its students                   =  Cost per Student
per term        Σ Total Course Cost                    =  Total Programme Cost
                ÷ programme enrolment                  =  Cost per Student
                rounded up                             =  Preferred Price
```

Four decisions inside that are worth naming, because each one closed a way the
process could go wrong:

- **The kind decides the sheet, and the server enforces it.** An indirect item
  on a course sheet is a 422 and the reverse too, which makes double-counting
  unrepresentable rather than merely detectable.
- **The share is derived, never typed.** `allocationPercent` used to sit on each
  course and had nothing to be a percentage *of*: across the seed, 82 of 92 pools
  recovered less than the cost. A derived share cannot fail to total 100.
- **`distribute()` uses largest remainder**, so the parts sum to the pool to the
  satang. Rounding each share independently leaks, and a cost that leaks is the
  failure the rebuild existed to remove.
- **Markup and rounding are per programme term**, not per course. Several
  per-course markups leave a programme total that no screen adds up.

Seven of the 56 course sheets belong to no programme term at all. They keep their
direct costs, take no share and no markup, and report `sharePercent: null` —
**not zero**. They are reachable only from `/costs/courses`, which is why the
costing module did not move inside Curriculum.

Revenue is the other half. **It is invoiced, not implied** (§13a, 2026-09-12):
`package price × head count` is *list* revenue, revenue is the sum of the billed
invoice totals, and it splits into collected and outstanding. Net profit and
margin are stated on the **collected** basis, because a student who has been
billed and has not paid is owed money rather than earned money. A draft or
cancelled invoice contributes nothing at all.

One invoice per student per semester (§13b). Its lines are the **curriculum**,
not the student's own enrolments — a package is a package, so a course they
skipped is still billed, and a course they dropped appears as a credit line
instead. `CREDIT_RATE` lives in `lib/calculations/invoice.ts` and **the seed
imports it** to build the package price; two copies of that number would let a
document disagree with the contract it bills, and nothing would catch it.

---

## B. The people chain, end to end

**A student enrols in a programme term, not in a course** (§7a). Add Student
covers all three paths §7 describes — an existing profile, a student returning
from a previous semester, or a new profile created on the way in — and all three
send one `POST /api/enrollment` discriminated on `source`. One enrolment produces
a programme membership plus a course enrollment per curriculum course, which is
why a roster and a curriculum cannot disagree.

Two rules are enforced server-side rather than assumed: a second term in the same
semester is a **409**, and a term on another programme a **422**. Both were
already true of all 635 seeded memberships. A withdrawn membership does not
count — re-enrolling someone who left is a real act.

**Status is progress; outcome is derived** (§8). A membership is
`pending | active | completed | withdrawn` — where the student is, never how they
did. Pass and fail come from the grades and are never stored beside the status.
The derivation itself is the one piece of this chain not yet built.

A student may edit their own record — name, contact, major, year, skills — and
never their programme, which the update path has always ignored for everybody,
and never `DELETE`. Their dashboard is their own: programme, courses and
evaluation queue, deliberately **not** scoped to the active semester, because the
seeded student holds nothing in it and an empty landing page demonstrates
nothing.

---

## C. The judgement chain, end to end

Documented in full in [evaluation-model.md](evaluation-model.md). In process
terms:

1. An **evaluation setup** configures one course-semester: window, scale,
   guidance and the blend. Groups are membership beside it, partitioned from that
   cohort's enrollments.
2. The setup **copies questions** from the master bank at
   `/evaluation/manage/questions`. A copy rather than a reference, for the same
   reason a cost sheet copies a catalogue item: evidence of a past decision
   copies, a current setting references. Deleting a question a setup has copied
   is a **409**.
3. An **assignment** is derived, never stored — it exists because some assessee
   card has your role switched on as an assessor at a non-zero share. Manage
   Evaluation and Your Evaluation therefore cannot disagree.
4. The evaluator takes a **360 form** or a **ranking form**. An ordering is a
   strict permutation, so the ranking form is a reorderable list rather than a
   score per row.
5. **Submission is where the chain breaks** — see below.
6. Ratings are **seeded from a hash** per subject, role and criterion, so a score
   exists to compute. `calculateEvaluationScore` blends them, the grade derives
   from the score, and the report prints through `window.print()`.

---

## Module by module

| Module | Read flow | Write flow | State |
| --- | --- | --- | --- |
| Dashboard | branches on role: the school, or one student's own programme, courses and queue | n/a | complete |
| Curriculum `/programs` | list, term detail with profit, billing and roster | `PATCH` package price and status · `DELETE` | complete |
| Courses | list, detail (semesters, terms, sheets) | `POST` · `PATCH` · `DELETE`, archive/restore optimistic | complete |
| Semesters | list, detail | none, by design — a semester is a calendar fact | read-only |
| Enrollment | programme terms → a term's students → the same term at course grain | `POST` over all three §7 paths · `DELETE` a membership | complete |
| Students | list, profile, own-record editing | `PATCH` · `DELETE` | complete |
| Cost | programme list, course list, sheet details with the full breakdown | `PATCH` sheets · item `POST`/`PATCH`/`DELETE` | complete |
| Cost Catalogue | master groups and items | `POST`/`PATCH` groups · `POST`/`PATCH`/`DELETE` items, 409 on a copied item | complete |
| Invoices | list, document detail with lines, totals and the payment barcode | `PATCH` status, validated against the transition table | complete; one transition by design |
| Manage Evaluation | list, setup detail, readiness marks, per-assessee blend, results, report | `PATCH` the blend, server-validated and renormalising | config works, lifecycle does not — **F-5** |
| Question bank | list by assessee role and criterion | `POST` · `PATCH` · `DELETE` with a 409 guard | complete |
| Your Evaluation | persona → derived queue → both form kinds | Submit is inert — **F-1** | the one visible dead end |
| Reports | staff: setup → results → report dialog → print · student: their own published reports at `/reports/students/<id>` | n/a | complete |

### The shape of the dataset

| | Count | |
| --- | --- | --- |
| Semesters · Courses · Students | 4 · 30 · 300 | |
| Programmes · terms · programme enrolments | 5 · 19 · 635 | |
| Course enrolments | 1,297 | derived from the curriculum, never entered |
| Course-semester cohorts | 50 | every one has groups |
| Evaluation setups | 36 | 35 of the 50 cohorts; one fixture sits on a cohort with no enrolments, to exercise the *not configured* mark |
| Evaluation groups | 134 | sizes 4–7, clustered on 5 and 6 |
| Course cost sheets | 56 | direct costs only; 7 belong to no programme term |
| Programme cost sheets | 19 | indirect costs, one per term |
| Invoices | 635 | one per student per semester |
| Catalogue groups · question groups | 3 · 2 | the two master tables sheets and setups copy from |

---

## Where the chains still stop

Three, stated plainly. Ids are the ones the 2026-09-12 audit gave them, kept so
the audit log and this page agree.

### F-1 · the Submit button is wired to nothing

`features/evaluation/components/evaluation-form-screen.tsx` still renders
`<Button disabled={readOnly}>Submit</Button>` — no `onClick`, no enclosing
`<form>`, no handler. The comment above it says the button *"acknowledges rather
than persists… because a Submit that silently forgets is worse than one that
admits it"*, and it does not acknowledge either. **It is the only visibly dead
control in the application**, and it sits at the end of the longest flow in the
product.

Separate from it, and deliberate: there is no `POST` under `/api/evaluation`, and
results are derived from a hash of the subject ids, so a submission could not
reach a score even if it were stored. The Evaluate → Score loop is open by design
and documented. The inert button is not.

### F-5 · the evaluation lifecycle has no verbs

A setup's blend can be edited; the setup cannot be created. There is no
create-setup, no create or rebalance group, no move a student between groups, and
no open or close window action — `status` and `editingLocked` are seeded and
reachable only by `PATCH`ing the whole setup. Fifteen of the fifty cohorts have
groups and no setup at all, and nothing in the UI can create one for them, which
also means nothing tells an administrator that those fifteen will never produce a
report.

### F-6 · `/reports/students/[studentId]` was a placeholder — **closed 2026-09-19**

`AUD-002` offered two acceptable outcomes: delete the route and its builder, or
point it at the live report. It is now the live report — one student's own
reports, owner-scoped the way their profile is, and `routes.studentReport` has a
caller again in `config/navigation.ts`.

Two things came with it. A student reads **published** setups only, because
releasing a report is a deliberate act. And the endpoints behind the report were
readable by every signed-in role, so `/api/evaluation/<id>/results` was handing a
student their whole cohort's grades (`AUD-029`, closed the same day): the access
table matches by prefix and could not name a segment behind a dynamic id, so both
checks moved into the handlers.

Beyond these, the pass/fail derivation onto a programme enrolment (§8) and the
computed leaderboard are specified and unbuilt.

---

## What the process gets right

Worth stating, because these are the decisions that are expensive to retrofit and
they are already correct.

- **Business math sits in the calculation layer**, never in JSX — eleven modules
  under `lib/calculations/` plus each feature's own, and it is the part under
  test, which is the priority `scaffold.md` §27 asks for.
- **Null is not zero**, in every place it matters: `costPerStudent` with no
  students, a subject with no submissions, a course with no cost sheet
  contributing *unknown* to a programme's profit, and `sharePercent: null` for a
  sheet in no programme.
- **Derived, not stored** — the assignment, the indirect share, the 360/ranking
  split, the headline weight summary and the grade. Two screens cannot disagree
  when there is no second copy to disagree with.
- **Refused, not merely discouraged** — the blend total, the cost kind, the
  programme-term conflict, the invoice transition, the copied-question delete and
  self-assessment are all rejected server-side. A rule the client alone enforces
  is a suggestion.
- **Determinism holds** — no `Math.random`, `Date.now` or bare `new Date()`
  anywhere in `data/` or `server/`, so a reload is the same dataset.

---

## Appendix — the 2026-09-12 audit

This page was originally a process audit against commit `6b89d17`, and five of
its eight findings have since been closed. They are kept here because *what was
found* is a different record from *what is true now*, and because each closure
names the rule it changed.

| Finding | Closed by |
| --- | --- |
| **F-2** · no student could enter the system through the UI — `/api/enrollment` and `/api/students` were `GET`-only, and every one of the 1,297 enrolments existed because the seed made it | Enrolment writes over all three §7 paths, plus profile editing and the first deletes (2026-09-15, 2026-09-16) |
| **F-3** · Cost Management could not manage the cost structure — the update contract accepted `markupPercent` and `studentCount` only | The cost catalogue and sheet CRUD (2026-09-12); the allocation percentage the finding described no longer exists at all after the 2026-09-15 rebuild |
| **F-4** · the flow was not walkable — seven of sixteen route builders had no caller, and student profile, semester detail and cost sheet detail each linked nowhere | Cross-links added module by module; the rule now is that **every link on a screen goes somewhere the reader may open**, so the dashboard, breadcrumbs, back control and programme history all drop an anchor the current role would be refused. `studentReport` is the one builder still unused, which is F-6 |
| **F-7** · the coverage gap was invisible — 36 setups over 35 of 50 cohorts, with nothing saying so | Folded into F-5, where it belongs: the gap is invisible because there is no verb that would close it |
| **F-8** · revenue was an entitlement presented as an earning — `packagePrice × enrolledCount` counted 143 pending members, ฿4.79M of ฿18.35M, 26% of booked revenue, from students who had not started | The invoice module. §13a was amended rather than merely obeyed, and `tests/calculations/profit.test.ts` pins it: *"does not count outstanding invoices as profit"* |

The evidence for F-8 is worth keeping, because it is the clearest case in this
project of a number that was correct in every row and false in aggregate:
`pgt-bsc-it-202601` used to report ฿873,800 of revenue and a positive profit. It
now reports ฿740,000 invoiced, ฿238,100 collected, ฿501,900 outstanding and a net
of −฿28,888 on the collected basis. The five `202602` terms, whose invoices are
all drafts, report no revenue at all rather than the ฿5.49M their prices imply —
and the screen says why.
