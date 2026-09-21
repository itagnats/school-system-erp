# PRIME — School Management System

## 1. Project Direction

PRIME is a modern school management web application designed as a portfolio project to demonstrate strong frontend engineering, UX/UI, API integration, reusable component architecture, and design-system development.

The product should represent a realistic school environment without being tied to any specific real-world organization.

The system focuses on four connected areas:

1. Course & Semester Management
2. Student Enrollment & Profile
3. Cost Management
4. 360° Student Evaluation

The project should feel like a real internal school-management application rather than a collection of unrelated demo pages.

---

# 2. Core Student Lifecycle

The main product relationship is:

Course
  ↓
Semester
  ↓
Enrollment
  ↓
Student Profile
  ↓
Evaluation Group
  ↓
360° Evaluation
  ↓
Score
  ↓
Grade
  ↓
Individual Report

Cost management operates alongside the course/semester structure:

Course
  ↓
Semester
  ↓
Cost Sheet
  ↓
Cost Structure
  ↓
Cost per Student

Billing runs from the other side, and meets it at profitability (§13a, §13b):

Program Term
  ↓
Program Enrollment
  ↓
Invoice
  ↓
Invoice Line
  ↓
Collected / Outstanding

---

# 3. Product Navigation

The main application should contain:

- Dashboard
- Courses
- Semesters
- Enrollment
- Students
- Cost Management
- Evaluation
- Reports
- Design System

Recommended navigation:

```text
Dashboard

Academic
├── Courses
└── Semesters

Students
├── Enrollment
└── Student Profiles

Cost Management
├── Program Costs      (revised 2026-09-16: the index, §11)
├── Course Costs
├── Cost Catalog
└── Invoices

Evaluation
├── Evaluation Groups
├── Evaluations
└── Ranking

Reports
└── Student Reports

Develop
├── Design System
└── System Guide
```

**Develop is the tooling, not the school** *(added 2026-09-16)*. Design System
documents how PRIME looks by rendering the real tokens and components; System
Guide documents how it works by re-deriving the real figures. Both obey one
rule: **demonstrate, never restate.** Counts come from the services, the worked
money example is computed by the same calculation the cost screens use, and the
route map is read from the config the sidebar reads — so neither page can
describe a system that no longer exists. Five documents under `docs/` carried
stale counts on 2026-09-16, which is the failure these two are built against.

Navigation can be adjusted during implementation if UX improvements are discovered.

---

# 3a. Roles and the Demo Sign-in

*(added 2026-09-16)*

PRIME has four **app roles** — `administrator`, `teacher`, `ta`, `student` —
and a sign-in screen at `/login` that is a row of cards rather than a form.
There is no password, no account directory and no recovery: choosing a card is
the whole of it.

## An app role is not an evaluation role

They are different questions with an overlapping vocabulary, and collapsing
them is the same mistake §14 already records about evaluation roles.

| | asks | lives on |
| --- | --- | --- |
| `EvaluationRole` | what somebody is inside one assessment | a setup's assessee and assessor cards |
| `AppRole` | which parts of the application they may open | the session |

`inspector` is an evaluation role and deliberately **not** an app role: an
inspector is a student from another group, so it owns no screen the student
role does not. `administrator` is an app role and not an evaluation role,
because nobody in the evaluation model runs the school — somebody has to own
Cost Management, Invoices and the curriculum, and no teacher, TA or student
does.

## What each role reaches

```text
administrator   everything — the whole sidebar
teacher         Dashboard · Courses · Student Profiles · Manage Evaluation
                · Your Evaluation · Student Reports
ta              Dashboard · Manage Evaluation (read only) · Your Evaluation
student         Dashboard · Your Evaluation
everyone        Design System · System Guide
```

Two placements are deliberate and stated here so they are re-decided rather
than inherited:

- **Dashboard is open to everyone** because it carries active courses, the
  current semester, enrollment and evaluation progress — and no revenue, cost
  or invoice. **Add a money card to it and it becomes staff-only.**
- **Develop is open to everyone.** The design system and the system guide are
  the tooling PRIME is built from rather than part of the school, and this is a
  portfolio piece whose showcase should not sit behind a role.

Reading and writing are separated where the roles differ: a TA reads Manage
Evaluation to see who still owes work and changes nothing; a teacher reads a
student profile and an administrator edits it.

## One table, two readers

The rules live in `lib/access/policy.ts` and are read by both the sidebar,
which hides what a role cannot use, and `proxy.ts`, which refuses it. **Hiding
a link is courtesy; the refusal is the rule.** Two tables would let those
disagree, and the one that disagrees silently is always the server's.

The allowlist **falls closed**: a path with no rule is denied to everybody, so
a route added without one stops working loudly instead of serving everybody
quietly.

## A record of your own

*(added 2026-09-16, later)*

Three of the four roles are answered by the table above: what you may open
depends only on which role you hold. A student is not, because the question
they ask is **"may I open *my* profile"**, and the path `/students/stu-007`
does not say whose record it names.

So a rule may also carry an `owner` list, and it means something narrower than
the other two columns:

```text
read    this role may open anything under the prefix
write   this role may change anything under the prefix
owner   this role reaches ONE record under the prefix - and the table
        cannot tell which, so the edge lets them through and something
        downstream compares the ids
```

**Passing the proxy is therefore not the same as being allowed**, and that is
the only place in PRIME where those two come apart. `requireOwnStudent` and
`mayReadStudent` / `mayWriteStudent` in `server/principal.ts` are where it is
settled, and they are called by the profile page, the edit page and the two
handlers under `/api/students/<id>`. The collection itself is never reachable:
`/students` stays staff-only, because a student who could list every profile
would have been handed exactly the directory the rule exists to withhold.

The principal's own `studentId` is resolved **on the server**, from the demo
persona's enrollment, and is never carried in the cookie. A cookie asserting
which record it may read is the same shape of mistake as a cookie asserting
its own role, which is the hole `AUD-023` records.

This is also the answer to the objection in *What this is not*: enforcement no
longer stops at the edge for the one case where the edge is not competent to
decide. It is the pattern a real system uses everywhere.

## What a student sees

Two of the roles get the same screens with less on them. The student gets
**their own**.

- **`/dashboard` is a different screen for a student.** The staff dashboard
  asks how the school is doing — head counts, coverage, the busiest courses.
  A student's asks what they are enrolled in and what they still owe: their
  program and standing, their courses, their evaluation queue. It is a
  separate screen rather than the same one with panels removed, because a
  student reading the school's head count has been shown a figure that is true
  and none of their business.
- **It is not scoped to the active semester.** The staff dashboard measures one
  moment; this one is a record. The seeded student holds enrollments in 202502
  and 202602 while 202601 is running, so a dashboard filtered to "now" would be
  empty for the only student who can sign in. Every row carries its semester
  and the current one is marked, so nothing is disguised as current.
- **My Profile is in their sidebar**, at `/students/<their id>`, and **My
  Reports** beside Student Reports, at `/reports/students/<their id>` (added
  2026-09-19; see §23). These are the navigation items whose href is a record,
  which is why the sidebar is built from the principal rather than from the
  role. Each sits in the section that already holds the staff view of the same
  thing rather than in a section of its own.

**Every link on a screen goes somewhere the reader may open.** This is a rule,
not a finish: before it, a student's dashboard offered Courses, Semesters,
Manage Evaluation and eight course rows, every one of which refused them, and
the back control on their own profile pointed at the staff list. A link that
refuses the person who was shown it is worse than no link, because it teaches
the reader that the navigation lies. Where a role cannot follow a link the
label stays and the anchor goes — the figure is still theirs to read.

The two **Develop** pages are the deliberate exception. The System Guide prints
the whole route tree because documenting the application is what it is for, and
a reader who follows one of those to `/no-access` has been shown the access
rule working rather than a broken link.

## What a student may change

A student may **edit their own profile** — the user's decision on 2026-09-16,
taken over a read-only profile and over a per-field rule, and recorded here
rather than left to be discovered in a handler.

What that actually reaches, checked against the write path rather than assumed:

```text
may change    name, email, phone, date of birth
              major, year level, skills, interests, certifications
              emergency contact
never         their program - the update path has always ignored it,
              for every role, because a program comes from enrollment
never         their student id
never         DELETE - `ownerMethods` stops at PATCH
```

**Editing a record and removing one are different acts**, which is why the
verbs an owner gets are spelled out in the table instead of inherited from the
write column.

A real school would not let a student set their own year level, and the cost of
saying so is one line here rather than a surprise later. It is in scope because
the demonstration is the *mechanism* — a per-record authorization check, on a
route that already existed, enforced on both the page and the endpoint — and
the mechanism is identical whether the field list is generous or strict.

## What this is not

It is not authentication, and every surface says so — the sign-in screen, the
account menu, and the comments on the code. The cookie is unsigned and
self-asserted: there is no session store to verify it against and no secret to
sign it with that would not also be in the repository. Anyone can set it by
hand and be any role.

What it demonstrates is the part a frontend actually owns — where a session is
established, what the cookie carrying it should look like (`HttpOnly`,
`SameSite=Lax`, `Secure` in production, a short life), where authorization is
enforced, and that a hidden link is not a protection. §33 still rules out real
SSO, real identity integration and complex permission administration, and this
does not smuggle them back in.

**In a real system the check would not stop here.** `proxy.ts` is the only
enforcement point for a rule about *roles*, because the cookie **is** the claim
— a second check inside a handler would read the same unverified string and
reach the same answer. Given a signed session and a session store, each route
handler would re-verify it against the principal it is acting for, because a
check that runs once at the edge is one deployment mistake away from not
running at all.

The ownership rules above are the exception, and they are the exception for a
reason worth keeping: the edge cannot decide them *at all*, whatever the cookie
is worth, because it sees a path and never a record. That is what makes them
the one place where PRIME already enforces authorization twice.

---

# 4. Course

## Purpose

Manage courses offered by the school.

Keep the course model simple.

Example:

```text
Course
├── Course Code
├── Course Name
├── Description
├── Credits
└── Status
```

Example fictional course:

```text
IT101
Introduction to Information Technology
```

The system should support:

- Course list
- Course search
- Course filtering
- Course status
- Course details
- Course-semester relationship

A course can be offered in multiple semesters.

```text
IT101
├── 202601
├── 202602
└── 202701
```

---

# 4a. Curriculum and Programs

*Added 2026-09-06. A course on its own has a cost but no price, so cost
management could describe spending and never answer whether it was worth it.*

A **program** is what a student actually enrols in. It gathers courses into a
package per semester and puts a price on that package:

```text
Program (BSC-IT)
  └── Program Term (BSC-IT, 202601)
        ├── Courses: IT101, IT205, IT310
        └── Package price: 49,200
```

The **term** is the unit that matters. It is what a student enrols in, what
carries the price, and what profit is measured on, because the same curriculum
at the same price makes or loses money depending on how many people took it.

A course still belongs to itself and may appear in several programs. That is
why a program is charged a course cost *per student* rather than being handed
the whole cost sheet.

Support:

- Program with code, name and credential
- Per-semester curriculum: which courses, in teaching order
- Package price per term
- Term status: planning, open, closed
- Program roster: who is under this program this term

## Editing a curriculum

*Added 2026-09-21. The line above promised "which courses, in teaching order"
from the start, and until this date nothing could change either half — no
route, no contract and no control. The package price was the only editable
thing about a term.*

**The order is the array.** `courseIds` carries the teaching order, so there is
no position field and no second place for the order to disagree with itself.
The whole array is therefore written at once rather than through add, remove
and move operations: a reorder has no expression as a partial edit, and three
endpoints rewriting one field are three ways for it to end up wrong.

**Any term may be edited, and the screen states what that does not do.** Two
stricter rules were considered and both were measured against the seed first:

- *nothing may change once something depends on it* — the rule DELETE already
  uses. **0 of 19 terms** are free of members and invoices, so the control
  would be disabled everywhere and the capability would never once be shown;
- *only while the term is `planning`* — 5 of 19, except that all five planning
  terms already carry 25-38 members, so the lock would permit exactly the
  edits it exists to prevent while refusing the four `open` terms where a late
  timetable change is most plausible. Recorded as `AUD-033`.

So the consequence is stated instead of prevented: changing a curriculum
**re-bills nobody and re-enrolls nobody.** The invoices naming a term were
priced from the curriculum as it stood (§13b) and each student's course
enrollments were expanded when they joined (§7a). Neither is rewritten, and
the screen says so above the Save button.

**A course already in a curriculum is never re-judged; only additions are.**
13 curriculum entries across 9 of the 19 terms hold an **archived** course —
`DE248` sits in all four BFA-DE terms. Policing the whole array would refuse
the resend that moves an unrelated row, so those nine terms would have been
un-editable by the feature built to edit them. Archiving a course does not
retroactively invalidate the terms that already taught it. An **addition** must
exist, must be offered in that semester, and must still be active.

## Creating a program

*Added 2026-09-21. There was no endpoint for a program at all - only for
terms - so "create a program" had no parent to hang a term off, and the
Curriculum list was 19 terms with the five programs nowhere on screen.*

**A program is created together with its first term.** Not a convenience: a
created record never reaches the store (`docs/decisions/why-bff.md`), so a
program made on its own could be listed from the client cache and never
opened, because every detail page is a server component reading that store.
The natural flow - create the program, open it, add a term - has a second
step that 404s. One form, one write, one response carrying the program, the
term, its curriculum and its cost sheet. Recorded as `AUD-036`.

A **later** term is added from the program's own page and behaves normally,
because by then the program is one of the five the seed holds.

**Three levels, and the URL says so:**

```text
/programs                              the programs
/programs/<programId>                  one program and its terms
/programs/<programId>/<programTermId>  one term: price, curriculum, roster
```

The term page moved a level deeper the same day. Next.js cannot hold two
dynamic segments at one level, so `/programs/<programId>` and
`/programs/<programTermId>` would have been the same route. The term id alone
still identifies the term, so the page checks that the program segment names
its actual program - otherwise `/programs/<any-program>/<any-term>` would
render a term under a program it does not belong to and every breadcrumb on
the page would lie.

**A new term is born in `planning`, with an empty indirect cost sheet.**
Without a sheet `programCostBreakdownFor` returns nothing, so the term would
have no cost page, no preferred price and no profit row - born with its cost
side missing. The sheet starts empty rather than copied: the utilities of a
term nobody has planned are unknown, not zero. Its markup starts at **0%**
rather than the 5% the seed uses, because a markup is a pricing decision and
inheriting one from another program would be a number nobody chose.

**The package price is typed, never derived.** The computed figure is the
*preferred price* - cost per student, rounded up (§13) - and it cannot exist
for a term whose cost sheets are empty, which a term created here always has.
It appears on the term page later, as a suggestion. Deriving the price from
the cost would make every program break even by construction and leave the
profitability screens answering a question whose answer is always zero.

# 5. Semester

## Purpose

Represent an academic period in which courses are offered.

Use simple identifiers such as:

```text
202601
202602
202701
```

Example:

```text
202602
Second Semester 2026
```

A semester should contain:

- Semester code
- Academic year / term
- Start date
- End date
- Status

The semester is the main context for:

- Enrollment
- Student groups
- Evaluation
- Ranking
- Reports
- Cost management

---

# 6. Enrollment

## Purpose

Manage students enrolled in a course for a specific semester.

The public demo should intentionally focus on the most meaningful enrollment workflows.

## Student List

Display:

- Student ID
- Student name
- Program / major
- Enrollment status
- Group
- Course
- Actions

Support:

- Search
- Filtering
- Sorting
- Pagination
- Status filtering

---

# 7. Add Student

A student can be added through three paths:

```text
Add Student
│
├── Existing Profile
├── Previous Course
└── New Student
```

## Existing Profile

Search for an existing student and enroll them.

```text
Search
  ↓
Select Student
  ↓
Review
  ↓
Enroll
```

The system should reuse the student's existing profile rather than creating duplicate information.

## Previous Course

Allow a student from a previous course / semester to be selected for the current course.

Example:

```text
202601
  ↓
Student
  ↓
Enroll into
202602
```

The student's existing profile should be reused.

## New Student

Allow creation of a new student profile before enrollment.

```text
Create Student
  ↓
Student Profile
  ↓
Enroll
```

Only collect the minimum information necessary for the initial enrollment.

---

# 7a. Enrollment Through a Program

*Added 2026-09-06.*

Enrollment is entered at the **program** level, not the course level. A student
joins a program term, and that enrols them in the courses of its curriculum.

```text
Enrol student -> Program Term (BSC-IT, 202601)
                   └── creates a course enrollment per course in the curriculum
```

Two consequences the UI must respect:

- the enrollment screen can be entered from a program, and answers "who is
  under this program" as directly as it answers "who is on this course";
- a student may still drop an individual course, so a per-course head count is a
  subset of the program head count and never assumed equal to it.

## One program at a time

*Added 2026-09-15.*

**A student holds one program, and one program term per semester.** This was
already true of every one of the 635 seeded memberships - never two in a
semester, and not one student who changes program - but nothing enforced it,
so it was a coincidence rather than a rule. It is now checked server-side:

```text
second program term in the same semester   409
a term whose program is not the student own program   422
```

The rule is not bureaucratic tidiness. The invoice is one document per student
per semester over one package price (13b), and a second package in the same
semester cannot be represented on it. The multi-term split in the invoice
service exists for a case this rule makes impossible, which is why it has never
run against real data.

A **withdrawn** membership is not a conflict. It is the record of somebody who
left, and enrolling them again is a real act rather than a duplicate.

# 8. Enrollment Status

Use clear enrollment statuses.

Suggested statuses:

```text
Pending
Enrolled
Active
Completed
Dropped
Cancelled
```

The current status should be visible from the student list and student detail.

Status changes should provide clear feedback to the user.

## Status is progress, outcome is derived

*Added 2026-09-15.*

A status says **where a student is**, never **how they did**. The two are
separate fields and one of them is not stored:

```text
202501   completed   outcome: passed     derived from the grades of that term
202502   completed   outcome: failed
202601   active      outcome: -          ongoing, no outcome yet
202602   pending     outcome: -
```

Folding the outcome into the status looks tempting and breaks immediately:
`completed` would have to mean completed **and** passed, and a student who
finished and failed would have no state to be in. It is the same distinction
already made for a score - not passed and not yet assessed are different claims
(22) - and the same rule about derivation: a grade is computed from the score
and never stored beside it.

A completed term whose courses carry no evaluation derives to **unknown**, not
to failed. That is the posture 13a already takes for a course with no cost
sheet, and for the same reason: an absent measurement is not a bad one.

---

# 9. Student Profile

The original enterprise biography concept is simplified into a student-oriented profile.

## Personal Information

Examples:

- Name
- Student ID
- Profile photo
- Date of birth
- Contact information

## Academic Information

Examples:

- Program
- Major
- Year level
- Academic interests
- Skills
- Certifications

## Student Experience

Examples:

- Projects
- Clubs
- Activities
- Achievements
- Interests
- Career goals

## Emergency Contact

Where appropriate:

- Emergency contact
- Relationship
- Contact number

---

# 10. Student Profile Editing

Students should be able to edit their own profile information.

The workflow should demonstrate:

```text
View Profile
  ↓
Edit
  ↓
Validate
  ↓
Save
  ↓
Success
```

The implementation should include:

- Structured forms
- Validation
- Required fields
- Loading states
- Save feedback
- Error handling

The profile should be separated into logical sections rather than being one giant form.

---

# 11. Cost Management

## Purpose

Manage the financial structure associated with delivering a program in a
semester, and the courses inside it.

The cost-management model can retain the useful hierarchical structure of the real enterprise workflow while using fictional school data.

## Two sheets, because there are two kinds of cost

*Revised 2026-09-15. Costing used to sit entirely on the course-semester, and
a shared cost reached a course through a hand-entered `allocationPercent`. That
percentage had nothing to be a percentage **of**: the same classroom was copied
onto every course sheet that used it, each taking whatever share someone typed,
and no screen ever added them up. Measured across the seed, 82 of 92
program-level pools recovered **less** than the cost — median 50% — while 7
recovered more. Half the shared cost simply vanished, and nothing looked wrong.*

```text
Course → Semester → Course Cost Sheet      DIRECT costs only
                                            lecturer, TA, materials
                                            belongs wholly to the course

Program → Program Term → Program Cost Sheet    INDIRECT costs only
                                            classroom, utilities, workshop,
                                            industry visit
                                            borne once by the program,
                                            distributed across its curriculum
```

**A direct cost travels with the course.** It is entered once per
course-semester and is the same whichever program adds that course, which is
what "the cost of running IT101" means.

**An indirect cost is borne once by the program term** and shared out. Each
program term rents its own room, runs its own workshop; there is no
institution-wide pool above it (considered and rejected — it needs a second
driver, for splitting the school across programs, which this demo does not
need to invent).

A course-semester that belongs to no program term keeps its direct sheet and
receives no indirect share. Seven of the fifty-seven sheets are in that
position, and they are not an error.

---

# 12. Cost Structure

Both sheets share one hierarchy:

```text
Cost Sheet
│
├── Cost Group
│   ├── Cost Item
│   │   ├── Cost Option
│   │   └── Cost Option
│   │
│   └── Cost Item
│
└── Cost Group
```

What differs is which items each may hold. **The kind decides the sheet, and the
sheet does not get a say** — a direct item cannot be put on a program sheet and
an indirect one cannot be put on a course sheet. That is the rule the old model
lacked, and enforcing it is what makes double-counting unrepresentable rather
than merely detectable.

```text
COURSE cost sheet — direct only
  Teaching
  ├── Instructor
  ├── TA
  └── Guest Lecturer
  Student Activities
  └── Materials

PROGRAM cost sheet — indirect only
  Facilities
  ├── Classroom
  ├── Equipment
  └── Utilities
  Student Activities
  ├── Workshop
  └── Industry visit
```

**`allocationPercent` is gone from the cost item** *(removed 2026-09-15)*. On a
direct item it was always 100 and meant nothing; on an indirect one it was a
share of an undefined whole. A share is now **derived** from the driver (§13),
which is what makes it impossible for the shares not to total 100.

---

# 12a. Cost Catalog

*Added 2026-09-12. §12 describes the shape of a sheet; this describes where its
contents come from.*

Every sheet was previously built from nothing, which is not how a school costs a
course. The same lecturer rate, the same classroom, the same materials recur
across thirty courses, and typing them again per sheet is both tedious and the
reason two sheets disagree about what a lab costs.

So there is a **catalog**: master cost groups, each holding master cost items,
maintained once and drawn on by every sheet.

```text
Catalog Group            Cost Sheet
├── Catalog Item   ──►   └── Cost Group
│     default price               └── Cost Item   (a copy, not a link)
│     default quantity
│     options
└── Catalog Item
```

## A sheet takes a copy, never a reference

**This is the decision the whole feature turns on.** Adding a catalog item to a
sheet **snapshots** its name, kind, price, quantity, allocation and options onto
that sheet. The sheet then owns them.

The alternative — a sheet holding a reference and reading today's catalog price
— is wrong for costing, and quietly so. Raising the price of `Classroom` would
silently rewrite every sheet that ever used it, including approved sheets from
closed semesters, and a total that was reviewed and signed off would change
without anyone touching it. A cost sheet is a record of what something cost,
not a live query.

The cost of snapshotting is that a catalog correction does **not** reach the
sheets already using it. That is handled openly rather than avoided:

- an item copied from the catalog keeps the id it came from, so its origin is
  known;
- a sheet shows which of its items now **differ from the catalog**, and by how
  much;
- updating one is a deliberate act on that sheet, never a background effect.

An item may also be added to a sheet **without** the catalog, for a one-off
cost. It simply has no origin, and is never reported as out of date.

## Maintaining it

Groups and items are created, edited and archived on their own screen. Two rules
worth stating because neither is obvious:

- **archive, do not delete, anything a sheet has used.** The sheets hold copies
  and would survive a delete, but their provenance would point at nothing, and
  "where did this rate come from" is the question the catalog exists to answer;
- **a catalog item carries defaults, not truths.** Quantity especially: forty
  five contact hours is the usual case and the sheet is free to say otherwise.

---

# 13. Cost Calculation

The system should demonstrate meaningful financial calculations.

Support:

- Direct costs, per course
- Indirect costs, per program term
- Distribution of the indirect pool across the curriculum
- Total cost, per course and per program
- Cost per student, on both bases
- Optional markup, per program term

## The calculation

*Revised 2026-09-15.*

```text
per course
  Direct Costs                                          (its own sheet)

per program term
  Indirect Costs                                        (its own sheet)
  ÷ distributed by the DRIVER
  = each course's Indirect Share                        (shares total exactly 100%)

per course, again
  Direct + Indirect Share          = Subtotal
  Subtotal × markup                = Markup Amount      (the program's markup)
  Subtotal + Markup Amount         = Total Course Cost
  Total Course Cost ÷ its students = Cost per Student
  rounded up                       = Preferred Price

per program term
  Σ Total Course Cost              = Total Program Cost
  ÷ program enrollment            = Cost per Student, program basis
```

Both per-student figures are shown, because they answer different questions. The
per-course one says which course is expensive to run. The **program** one is
the figure that can be set beside the package price, since a package is sold per
student for the whole curriculum.

## The driver

The indirect pool is distributed by **credit hours**, and the share is derived,
never entered:

```text
this course's credits
───────────────────  ×  indirect pool   =  this course's share
credits in the term
```

**Credits rather than contact hours.** Contact hours were the obvious
alternative and are unusable here: measured against the seed, the lecturer-hours
quantity has medians of 40, 43 and 43 for 2-, 3- and 4-credit courses. A
2-credit course carries the same hours as a 4-credit one, because that quantity
is generator jitter. Distributing by it would distribute by a random number that
looks principled. Credits vary in 16 of the 19 program terms, so the driver
does real work; the other 3 are genuine ties, which split evenly and correctly.

`CostDriver` is a union with one member today. Adding contact hours later means
first making hours mean something in the data — at which point the two drivers
would give nearly the same answer, which is the point.

**The distribution is exact.** The shares are allocated by largest remainder to
two decimals, so the parts sum to the pool to the satang. Rounding each share
independently would leak a few satang out of every program, and a cost that
leaks is the failure this whole revision exists to remove.

**A markup is one number per program term**, applied to each course's subtotal
after its share lands. Per-course markups would leave the program total
depending on several numbers that no screen adds up — the same shape of problem
as the old allocation percentages.

## Preferred price

*Added 2026-09-15, after the user walked the cost sheet.*

Cost per student is a **measurement**. It comes out as 4,988 or 4,201.11, and
nothing is sold at those numbers — 1 of the 57 seeded sheets lands on a round
hundred. The **preferred price** is the figure beside it that could actually be
charged:

```text
Cost per Student
rounded UP
to the sheet's rounding step
=
Preferred Price     (and the difference is stated, not absorbed)
```

**Up, never to nearest.** 4,201.11 is closer to 4,000, and 4,000 would price a
course below what it costs to run — the one outcome this figure exists to
prevent.

The **step is per sheet**, defaulting to 1,000, because a one-day workshop and a
laboratory course do not round alike. It sits with markup and head count as the
third input the derived figures depend on, and the server recomputes all of them.

The uplift is reported **beside** the price rather than folded into it. It is
margin the rounding created, not margin anyone chose, and collapsing the two
would make the markup percentage a lie.

Null, never zero: a sheet with no students has no cost per student, and so has
no price to imply.

The UI should make calculations understandable instead of hiding the business logic.

Do not reproduce every production cost-management workflow.

---

# 13a. Revenue and Profitability

*Added 2026-09-06. This is what makes §13 a decision rather than bookkeeping.*

*Revised 2026-09-12, when §13b introduced invoices. Revenue used to be the
product below; it is now what was actually invoiced.*

*Revised 2026-09-20: this section says what the figures are and no longer says
where they are read. **Profitability belongs to Cost Management.** See "Where
this is read" at the end.*

```text
Package price x Enrolled students = List revenue    (what the price implies)
Sum of invoice totals              = Revenue        (what was billed)
  of which paid                    = Collected
  of which issued but unpaid       = Outstanding
Sum of attributed course costs     = Total cost
Collected - Total cost             = Net profit
Net profit / Collected             = Margin
```

**Revenue is invoiced, not implied.** The two figures differ by the credits on
§13b's invoices, so a term that lost students to withdrawal shows it here
instead of carrying their full package price for ever. List revenue stays on
screen beside it, because the gap between the two *is* the story.

**Net profit is stated on a basis, and the basis is collected.** A pending
student who has been billed and has not paid is outstanding, not earned;
counting them as profit was the defect this rule replaces. The basis travels
with the number — a figure labeled only "net profit" makes a claim it cannot
support.

**Attributed** is the load-bearing word. A course cost sheet covers everyone on
that course, and a course can be taught into several programs at once, so a
program cannot be charged the whole sheet. It is charged:

```text
Course cost per student x Students from this program on that course
```

which is the only split that stays correct when two programs share a course.

Three things must not be hidden:

- a course with no cost sheet contributes **unknown**, not zero, and the screen
  says how many such courses there are, because a total assembled from an
  incomplete curriculum is a different claim from a complete one;
- a loss is shown as a negative number, never clamped;
- a margin with no revenue is **not** 0%, it has no value.

The break-even package price should be shown beside the margin: it answers
"what would this have to cost" rather than only "what did we make".

## Where this is read

*Added 2026-09-20.*

**Every figure in this section is read under Cost Management, and none of it
appears in the Academic menu.** Curriculum, Courses and Semesters describe what
the school offers; `/costs` and `/costs/programs/<termId>` judge it.

The Academic menu keeps exactly one money field, the **package price**, because
§4a lists it as a curriculum attribute: it is part of what the offer *is*,
where invoiced, collected, attributed cost, net profit and margin are all
verdicts on it. A program term page may link to its costing and must not
restate it.

This cost the demo its neatest moment, and the trade was made deliberately. The
curriculum screen used to lead with "Revenue against cost" and put the repricing
control directly beneath the margin, so moving the price moved the margin in
front of the reader. The argument against was simpler than the argument for: a
reader in the Academic menu is not asking a money question, and **two menus that
both answer it are two answers that can drift.** Repricing now links across
instead.

Two consequences worth stating, because both were found by measuring rather
than by reading the code:

- **the figures must not be sent to the academic screens either.** The program
  term summary carried a full P&L, and it feeds the Enrollment list as well as
  the Curriculum list — so the wire was putting money on a Students-menu screen
  that had never rendered it. Not sending a figure is the only reliable way to
  keep it off a screen;
- **the program cost row now carries two cost totals, and they are different
  questions.** The sheet total is direct + indirect + markup for the whole term;
  the attributed cost charges each curriculum course only for the members who
  took it, and is the basis net profit is measured on. On the seed they agree to
  the satang on 17 of 19 terms and diverge on 2. They are labeled separately for
  those 2.

---

# 13b. Invoicing

*Added 2026-09-12. §33 previously excluded this outright; that exclusion is now
narrowed to payment gateway integration and accounting, which stay out.*

An invoice is what turns a package price into a claim on a particular student.
It is the last piece of the money chain: cost says what delivery cost, revenue
says what the program was worth, and an invoice says who owes it.

## Grain

**One invoice per student per semester.** Not per course — a student enrols in a
program (§7a), so a bill per course would contradict the thing being sold. Not
per program either: a student taking two programs in one term receives one
document, because that is what a person receives.

## Lines

The lines are the **curriculum**, not the enrollments. A package is a package,
and the invoice shows what the package buys:

```text
one line per course in the program term's curriculum
    amount = course credits x credit rate
one program fee line
    amount = package price - sum of the course lines
one credit line per course the student did not complete
    cancelled  100% of that course line
    dropped     50% of that course line
    never enrolled   no credit
─────────────────────────────────────────────────
total = sum of the lines
```

The credit rate is the **same constant the package price is built from**. The
two must not be able to drift: a package price derived from one rate and an
invoice from another produces a document that disagrees with the contract it
bills, and nothing would catch it.

The program fee line exists so the course lines and the package price
reconcile exactly. It is a real line, not a rounding plug, and it is labeled.

A course the student simply never enrolled in earns nothing back. Choosing not
to attend what was bought is not a billing event.

## Status

```text
draft → issued → paid
              ↘ overdue
              ↘ cancelled
```

Five states, one transition offered in the UI: **issued → paid**. Status is
stored rather than computed against a clock — `overdue` on a fixed dataset must
not change because a month passed, for the same reason every other date in the
system is derived from a fixed epoch.

A cancelled invoice contributes nothing to revenue. An overdue one is still
outstanding: unpaid and late are the same claim on the money, and only one of
them is a comment on the payer.

## The document

*Added 2026-09-12.* An invoice is a thing a student is sent, so the detail route
is the document rather than a screen about the document: the page renders the
sheet and prints itself, and the PDF is the browser's own
(`window.print()`) — the same choice §23 makes for the student report, for the
same reason. A PDF library would be a large dependency producing a worse
result, and a separate export path would be a second rendering of the same
invoice, free to disagree with the one on screen.

The sheet carries a letterhead, the party billed, the lines, the totals, and a
**counter-payment barcode**. Everything else on the route — the status control,
the demo note, the page header — is chrome and is hidden on paper.

## The payment code

A Code 128 symbol over four fields: biller, a student reference, an invoice
reference, and the amount in satang. The symbol takes **half the width**, with
the same four fields in words beside it — a barcode with no human-readable
fallback is a single point of failure printed on paper, and a symbol stretched
across a whole sheet is not more scannable, only more prominent than the total.

**Every invoice carries one; a non-payable one is stamped**
*(revised 2026-09-12, by the user, from hiding it)*. The document is a record of
what was billed, so the code that was issued stays on it — but `draft`, `paid`
and `cancelled` fade the symbol and strike it with a rubber stamp reading their
own status, which is what a real ledger does to a settled bill and what stops a
second payment being made against it.

The stamp is visual, so the sentence above the block states the same thing in
words: color and a rotated label are lost to a screen reader and to a
monochrome print. Which statuses are payable is not a second list — it is
`isOutstanding`, the same predicate the revenue split already uses.

The biller is a **placeholder**, the payload separates its fields with `|` where
the Thai banking format uses carriage returns, and the sheet says on its face
that it is a demonstration. A convincing bill that does not admit what it is
would be the wrong thing to have built.

## What stays out

No payment records, no partial payment, no ledger, no receipts, no gateway. An
invoice is paid or it is not. The moment a balance needs more than one number,
this has become the accounting system §33 rules out.

The barcode is a **rendering**, not an integration: nothing validates it, no
bank has ever seen the biller, and scanning it settles nothing.

---

# 14. Evaluation

**Navigation (revised 2026-09-06).** The evaluation area is split by
perspective rather than by feature:

```text
Manage Evaluation   groups, evaluator assignment, completion, computed ranking
Your Evaluation     the forms assigned to you, and the ones you have submitted
```

Because there is no sign-in, "you" comes from a **demo persona switcher**: a
control that lets a reader act as a student, an inspector, a teacher or a TA.
That is what makes the four roles and the no-self-evaluation rule visible rather
than merely described.

## Purpose

PRIME includes a 360° student evaluation system.

Students evaluate other students within an evaluation group, while additional evaluation can come from an inspector, teacher, and TA.

The evaluation system should demonstrate:

- Evaluation groups
- Multiple evaluation roles, on both sides of an assessment
- Peer evaluation
- External/inspector evaluation
- Teacher evaluation
- TA evaluation
- Score calculation
- Ranking
- Grade calculation
- Individual reporting

---

# 15. Evaluation Groups

Students are assigned to evaluation groups within a course and semester.

Example:

```text
IT101 — 202602

Evaluation Group A
├── Student 01
├── Student 02
├── Student 03
└── Student 04

Evaluation Group B
├── Student 05
├── Student 06
├── Student 07
└── Student 08
```

The evaluation group is the main context for peer evaluation.

# 15a. Evaluation Setup (added 2026-09-06)

Groups are membership. The **evaluation setup** beside them is configuration,
and it belongs to one course-semester:

```text
IT101 — 202602
├── name, short name, window (opens / closes / report date)
├── rating scale, guidance for evaluators
├── the weight blend (§20)
└── groups A…F
```

One setup per course-semester, because everything it holds is scoped that way.
Attaching it to a group instead would mean repeating the same blend five times
for a course with five groups, and then reconciling them when they drift.

A setup moves through four window states — **draft, open, closed, published** —
and carries a separate **editing lock**. The two are kept apart deliberately: an
administrator sometimes has to reopen editing on an open window to correct a
weight, and that should be a visible, deliberate act rather than a side effect
of the window's state.

Manage Evaluation lists one row per setup and answers a single question: which
cohorts are not ready. Each kind of form is in one of three states, and the
third is the one that matters:

```text
configured      the form is used and the setup can produce a score
not configured  the form is used but the setup is incomplete
not used        the blend gives this form no weight — a decision, not a fault
```

Marking "not used" as a failure would push someone to fix a configuration that
is already correct.

Two conditions are reported rather than hidden, because both quietly produce
wrong results instead of errors:

- **Ungrouped students.** A student not in a group is not evaluated by peers and
  does not appear in a group ranking, so a bare head count overstates coverage.
- **An unbalanced blend.** See §20.

---

# 16. Evaluation Roles

The system supports four evaluation roles. They were called *evaluator* roles
until 2026-09-06; see "Assessee and assessor" at the end of this section for why
that name was wrong.

## Student

A student evaluates other students in their own group.

Example:

```text
Student A
  ↓ evaluates
Student B
Student C
Student D
```

Students should not evaluate themselves.

## Inspector

An inspector is a student from another evaluation group.

Example:

```text
Group A
  ↑
  │ evaluated by
  │
Inspector from Group B
```

This provides an external peer perspective.

## Teacher

The teacher evaluates students and provides an authoritative assessment.

## TA

The teaching assistant provides an additional evaluation perspective.

## Assessee and assessor (added 2026-09-06)

The four roles above sit on **both sides** of an evaluation. An assessee is not
always a student:

```text
Assessee: Student   <- assessed by  Peer, Inspector, Teacher, TA
Assessee: Teacher   <- assessed by  Student, TA
Assessee: TA        <- assessed by  Student, Teacher
```

So they are **evaluation roles**, not evaluator roles. The same value names an
assessee in one relation and an assessor in another, and calling them evaluator
roles was what made an earlier build hard-code the assessee as a student.

**Which roles exist is fixed. Which are assessed is configuration.** An
evaluation setup holds one entry per assessee role, added and removed per
course-semester, so a course can run a student-only evaluation or add upward
feedback on its teacher without either affecting the other.

**The blend is per assessee.** Each assessee's enabled assessors total 100 on
their own. A student's four assessors and a teacher's two are separate
allocations, which is why the weight meter belongs inside the assessee card
rather than once at the top of the screen.

### Two relations that cannot exist

**A same-role pair is peer assessment, not self-assessment.** Student assessing
student is the center of this feature (§16, Student). "Nobody assesses
themselves" is a rule about *people* and is enforced where people are: an
evaluator never appears among their own subjects.

A same-role pair is impossible only where the role holds one person. There is
exactly one teacher and one TA per course-semester, so teacher-assesses-teacher
could only ever mean the same human.

**An inspector only assesses students.** An inspector is a student borrowed from
another evaluation group (§16, Inspector); there is no second staffroom to borrow
a teacher from.

### Self-assessment is never permitted

Decided 2026-09-06, for every assessee role. This is a deliberate divergence
from the reference design the decision was taken against, which offered a
Self Evaluation yes/no toggle per assessee card. Do not reintroduce it: a
self-score folded into a result that carries a grade is a fairness problem, and
keeping the rule absolute keeps every score comparable.

The field is still rendered, as a locked control with its reason, so the rule is
visible rather than merely obeyed. It is never accepted from a client.

### Only students are ranked and graded

§21 and §22 apply to student assessees only. A teacher or TA assessee stops at
the score and its feedback report - ordering staff against a cohort of students
and handing them a letter answers no question anyone asked.

---

# 17. 360° Evaluation Flow

The complete workflow:

```text
Course + Semester
        ↓
Evaluation Group
        ↓
Configure assessees, and who assesses each  (§16)
        ↓
┌─────────────────────────────┐
│ Assessee: Student           │  <- Peer, Inspector, Teacher, TA
│ Assessee: Teacher           │  <- Student, TA
│ Assessee: TA                │  <- Student, Teacher
└──────────────┬──────────────┘
               ↓
        Evaluation Forms          360 form, and an ordering  (§19)
               ↓
         Score Calculation        per assessee, its own blend  (§20)
               ↓
        ┌──────┴───────┐
   student assessee    staff assessee
        ↓                    ↓
     Ranking  (§21)          ↓
        ↓                    ↓
  Grade Calculation (§22)    ↓
        ↓                    ↓
 Individual Student Report   Feedback Report
```

The fork after the score is the point: ranking and grading are student-only.

---

# 18. Evaluation Criteria

Criteria should be student-oriented.

Suggested criteria:

- Participation
- Teamwork
- Communication
- Problem Solving
- Responsibility
- Leadership
- Technical Contribution

Use a simple rating scale:

```text
1 — Needs Improvement
2 — Developing
3 — Good
4 — Very Good
5 — Excellent
```

Criteria can be adjusted during implementation if a better evaluation model is needed.

## Question sets per relation (added 2026-09-06)

All four roles take the 360 form - a teacher assesses a student, and students
assess each other - but they are not asked the same questions. **One canonical
list of criteria, and each relation is asked the subset it can actually judge.**

Per *relation*, not per role: what a student is asked about another student is
not what a student is asked about their teacher. Assessing a student:

```text
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
asked to judge problem solving. A TA sees the work rather than the whole cohort,
so it is not asked about responsibility or leadership. Peers are not asked to
grade technical contribution, which is the teacher's and the TA's judgment to
make. Only the teacher answers all seven.

**A subset, not a separately worded set per relation.** Wording each relation's
questions independently was the alternative and was rejected: a criterion would
then mean something slightly different depending on who answered it, and the
scores would stop being comparable across roles. A role's 360 score is
normalized over the criteria it was actually asked, so a shorter question set is
not a penalty.

Upward feedback asks a narrower and different set. Students can speak to how a
teacher communicates and leads; they are not asked to grade a teacher's
technical contribution or responsibility, neither of which a student is placed
to observe.

The question set is configuration, held per assessor inside each assessee
(§16), so a course can adjust it without changing the canonical list.

**A role weighted for the 360 form must be asked at least one criterion.** This
is validated server-side alongside the weight total, because it is the same
class of failure: the blend can total 100 and the setup still be unable to
produce a score, since an empty question set contributes nothing to the half it
is paid for.

# 18a. The Question Bank (added 2026-09-16)

A criterion is a scoring dimension, not a question. `teamwork` is what the score
is made of; *"How reliably did they carry their share of the group's work?"* is
what an evaluator is actually asked. Until now only the first existed, so the
360 form showed seven bare labels and the setup screen configured question sets
nobody could read.

The **question bank** is master data: one maintained list of questions, drawn on
by every evaluation.

```text
QuestionGroup            e.g. "Assessing a student", "Assessing a teacher"
  Question
    criterion            the scoring dimension it feeds, or none for a text question
    prompt               what the evaluator reads
    helpText             what a low answer means against a high one
    type                 rating | text
    appliesTo            which assessee roles it can be asked about
    status               active | archived
```

**A question is wording over a criterion, never a new scoring dimension.** §18
rejects per-relation wording so that a role's score stays comparable with
another role's, and the same argument applies here: two questions feeding
`teamwork` are two ways of asking one thing, and the score is unchanged by which
one a course picked. Adding a scored dimension means changing the canonical list
in §18, deliberately, not writing a new question.

**A text question is not scored at all.** It has no criterion, never enters the
blend of §20, and lands in the report's Feedback part (§23) — attributed to a
role and never to a person. This is what the forms were missing: an ordering and
a rating both compress a judgment into a number, and neither can say *why*.

**A setup takes a copy, never a reference.** Attaching questions to an
evaluation snapshots their prompt, help text and type; only the id survives, for
provenance. This is §12a applied to a second kind of master data, for the same
reason: an answered question is evidence of what somebody was asked. If a setup
referenced the bank, rewording a question would silently rewrite last
semester's form, and a report would quote answers to a question that was never
put. Drift is computed on read, never stored, and archiving replaces deleting
once a setup has copied a question.

The general rule this is the second instance of: **evidence of a past decision
copies; a current setting references.** A cost sheet is evidence. A submitted
answer is evidence. The weight blend on a setup is a setting.

**The bank is maintained under Manage Evaluation**, not beside the cost
catalog. They are the same *kind* of thing and belong to different people: a
question is edited by whoever runs the evaluation, and putting it in Cost
Management would file it by mechanism rather than by who needs it.

---

# 19. Evaluation Form

An evaluator should be able to:

- Select the student being evaluated
- Rate each criterion
- Add comments
- Review the evaluation
- Save as draft
- Submit

The UI must support:

- Validation
- Draft state
- Loading state
- Submission state
- Success feedback
- Error feedback

After submission, the evaluation should become read-only unless reopening is intentionally supported.

## The two form kinds (added 2026-09-06)

An evaluator meets two shapes of form, and they are shaped differently rather
than being two views of one record. `Evaluation` is a discriminated union on
`kind`, so neither can hold the other's data.

### 360 form

Assesses **one subject at a time** against the criteria this evaluator's role is
asked (§18), on the 1-5 scale. The subjects an evaluator owes are stepped
through one after another rather than listed on one page, because six or seven
ratings for each of ten people is a lot of inputs and a single scrolling page
invites straight-lining.

**It is the 360 form, not the "criteria form".** All four roles take it, which
is what makes the assessment 360 degrees; naming it after the criteria described
the mechanism and hid the point. What differs between roles is the question set,
not the kind of form.

### Ranking form

Puts **every subject in scope into an order**, strongest first.

**Decided 2026-09-06: an ordering is a strict permutation. No ties.** Every
position is used exactly once, and the form is a reorderable list rather than a
score per row.

This is a deliberate divergence from the reference design the decision was taken
against, which offered a 1-5 score per subject with duplicates allowed. Do not
"correct" it back to match that screenshot. The reasoning:

- a rating that permits ties is a criteria rating wearing different clothes, and
  the 360 form already does that job better, with several dimensions instead
  of one;
- the ordering earns its separate place in the blend (§20) precisely by forcing
  a discrimination the ratings do not. An evaluator who rates everyone a 4 has
  said nothing; an evaluator who must place them in order has to.

The cost is accepted: ordering is harder work than scoring, and grows with the
number of subjects. That is why an ordering is scoped to an evaluation group
rather than a whole cohort.

An evaluator never appears in their own ordering. Ranking yourself first is the
same violation as rating yourself (§16), wearing different clothes.

---

# 20. Score Calculation

The final score should combine multiple evaluator sources.

Example:

```text
Peer Score
Inspector Score
Teacher Score
TA Score
       ↓
Weighted Calculation
       ↓
Final Score
```

Example weighting:

```text
Peer        30%
Inspector   20%
Teacher     35%
TA          15%
```

**Two kinds of form (added 2026-09-06).** An evaluator submits two things, not
one:

```text
360 form        assess ONE subject against the criteria your role is asked
Ranking form    put EVERY subject in scope into an order
```

Both feed the final score. A submitted ordering converts to a score
contribution and joins the weighted blend alongside the criteria ratings.

**Resolved 2026-09-06: the ordering is a share of each role's own weight.**

Each role holds one weight, and that weight divides internally between the
ratings the role gave and the ordering it submitted:

```text
final = SUM over enabled roles of
          weight% x ( threeSixtyShare% x threeSixtyScore
                    + rankingShare% x rankingScore )
```

The alternative — adding the ordering as a fifth weighted component beside the
four roles — was rejected because a teacher who both rates and ranks would then
count twice, once as a teacher and once as a contributor to the ordering
component. Under the rule above a teacher counts once, and how they express that
judgment is a property of the teacher's own share.

Only the ranking share is stored; the 360 share is always its complement. Two
stored numbers that must total 100 are two numbers that will eventually disagree.

The demo default therefore reads:

```text
role        weight    of which 360 form / ordering
Peer          30%          60 / 40
Inspector     20%          70 / 30
Teacher       35%          70 / 30
TA            15%         100 / 0
                       ─────────────
effective              71.5% on the 360 form, 28.5% on the ordering
```

Peers and the teacher both rate and rank; an inspector mostly rates, because an
outsider can compare but knows less context; a TA rates only, because a TA sees
the work rather than the whole cohort.

**The effective split at the bottom is derived, never entered.** A reference
design for the setup screen let an administrator type a headline "360 form 60 /
ordering 40" *and* the per-role weights beneath it, which gives the same quantity
two sources of truth and no rule for which one wins. The per-role figures are the
truth; the headline is computed from them and shown as a read-out.

**A role can be switched off**, and the remaining weights are renormalized so
they still total 100. A course with no teaching assistant would otherwise leave
15% of every score unallocated, and nothing downstream would detect it. A
disabled role keeps its stored weight, so switching it back on restores the
blend it had.

The enabled weights totalling 100 is validated **server-side**. It is the one
mistake on that screen that nothing downstream would catch: an unbalanced blend
does not fail, it silently scales every score in the course by the same amount.

The weighting should be configurable in the demo.

The calculation should be transparent in the UI.

Example:

```text
Peer        88 × 30% = 26.4
Inspector   92 × 20% = 18.4
Teacher     95 × 35% = 33.25
TA          90 × 15% = 13.5
                         ─────
Final Score               91.55
```

---

# 21. Ranking

**Student assessees only** (see §16). A teacher or TA assessee is scored and
reported but never ranked: ordering staff against a cohort of students answers
no question anyone asked.

Students should be ranked based on their final evaluation score.

Example:

```text
IT101 — 202602

Rank   Student       Score
────────────────────────────
1      Student A     92.5
2      Student B     89.7
3      Student C     87.2
4      Student D     83.9
```

**Ranking now means two things (added 2026-09-06), and they must not be
confused:**

- an **ordering submitted by an evaluator**, which is an input and lives in the
  evaluation form (§20);
- the **computed leaderboard** described here, which is an output derived from
  final scores.

The computed leaderboard is not a separate destination in the navigation. It is
a result shown under Manage Evaluation, next to the groups and completion it is
derived from.

Ranking should clearly indicate its scope:

- Evaluation group ranking
- Course / semester ranking

Avoid ambiguous rankings.

---

# 22. Grade Calculation

**Student assessees only** (see §16). A staff assessee's score stops at its
feedback report; a letter grade for a teacher would be a number wearing a
meaning it does not have.

Convert the final score into a grade.

Default example:

```text
90–100  A
80–89   B
70–79   C
60–69   D
< 60    F
```

The grade should be calculated automatically from the final score.

Do not manually store the final grade as an independent source of truth.

## Pass and not pass (added 2026-09-07)

The score itself stays on the **rating scale** - a mean out of `scaleMax`,
because that is the scale the ratings were given on and converting early hides
the arithmetic 20 asks to be visible. The operational outcome is:

```text
Total >= 4.0   Pass
Total <  4.0   Not pass
```

The percentage and the letter grade are conversions of that one number, applied
at the end: `percent = total / scaleMax x 100`. The two scales were not designed
together and it is worth knowing they happen to line up - a pass mark of 4 out
of 5 is 80%, which is a B.

**The report shows all three**, because they answer different questions. The
mean is what an assessor recognizes, the percentage is what compares across
courses, and the grade is the academic record.

**A score with no submissions is null, never zero and never "not pass".** "Has
not passed" and "has not been assessed" are different claims, and a report that
prints Not pass for an unassessed student is making an accusation the data does
not support.

---

# 23. Individual Student Report

Each student should have a report containing:

## Student Information

- Student name
- Student ID
- Course
- Semester
- Evaluation group

## Evaluation Summary

- Final score
- Grade
- Rank
- Evaluation completion status

## Evaluator Breakdown

```text
Peer        88
Inspector   92
Teacher     95
TA          90
```

## Criteria Breakdown

```text
Teamwork          92
Communication     88
Leadership        90
Problem Solving   94
Responsibility    96
```

## Feedback

Display appropriate evaluator comments, **attributed to a role and never to a
person**. A peer who can be identified is a peer who can be bargained with, and
the peer component stops measuring anything.

A role that submitted nothing is shown as such rather than omitted: "the teacher
has not commented" is information.

## Report delivery (added 2026-09-07)

The report should be visually structured and suitable for printing.

**Reached from the results table**, not from a route of its own: Manage
Evaluation -> a course-semester -> Results -> Report. The table carries the raw
score, the calculated score, the grade and the pass status, so the report is
opened for the one subject a reader has a question about rather than browsed.

**Raw beside calculated.** The raw figure is the unweighted mean of every rating
received; the calculated one is the 20 blend. Showing both makes the weighting
visible as a difference rather than asserted - where they diverge, the blend is
doing something and a reader can see what.

**Printed with `window.print()`**, from a dialog. The browser already knows how
to paginate a document and produce a PDF; shipping a library to do it worse
would be a large dependency for a worse result. A print rule hides the
application chrome so the sheet carries the report and nothing else.

**Two parts**, following the reference document:

```text
Part 1   the scored criteria, and the arithmetic that produced the total
Part 2   the comments, grouped by role
```

Part 1 keeps a **Self column, always empty**. Nobody assesses themselves (16),
so every cell is a dash - and keeping the column states the rule, where dropping
it would leave a reader wondering whether self-assessment happened and simply
was not shown.

A **behavioral profile chart** sits between the two: a radar across the
criteria, on the rating scale, because the shape is the finding. Its radius axis
is fixed to the scale rather than inferred from the data - auto-scaling would
make a weak profile fill the frame exactly like a strong one.

**Coverage below 100% is stated on the face of the report.** A confident number
computed over half the evidence is the most misleading thing a report can print.

## A student's own report (added 2026-09-19)

The delivery above assumes a reader with a question about one subject among
dozens. A student has no results table and never will, so their report needs a
second way in — and it is the smaller one:

```text
/reports                      staff: the picker, then every subject's score
/reports/students/<id>        one student's own reports, owner-scoped
```

`/reports` stays staff-only. The deeper rule is owner-scoped in the sense §3a
describes: the edge lets a student through to *a* record beneath
`/reports/students` and `requireOwnStudent` decides whose. Staff keep `read`
there too, so the same page doubles as one person's reports across cohorts.

**Published setups only.** A `closed` evaluation is scored and not yet handed
over, and an `open` one is still being submitted; releasing a report is a
deliberate act and the window status is where that act is recorded. Staff keep
the wider view they already have, which stops at `draft`.

**It is the same document, not a version for the subject.** A trimmed copy
would be a second thing to maintain and a standing invitation to decide later
what somebody may know about their own assessment. The rank is in it, stating
its scope (§21); the comments are in it, attributed to a role and never to a
person (§23), which is what makes showing them to the subject safe at all.

**Nothing on that page is fetched.** The documents are built during the server
render and handed to the print dialog, so a student's own report never travels
over the API. That is not only fewer moving parts: the list and the document
came from one call, so they cannot disagree.

The endpoints behind all this are guarded **in their handlers** rather than by
the table, and that is forced rather than chosen. Rules match by prefix, and
`/api/evaluation` has to stay readable by everyone because the queue and the
evaluation form need it — so `…/results` and `…/report/<subjectId>`, which sit
beneath it, inherited a reach nobody intended: every signed-in student could
pull a cohort's names, scores and grades (`AUD-029`). There is no prefix that
names a segment behind a dynamic id, so the check moved downstream, the same
way the ownership check did and for the same reason.

---

# 24. Dashboard

The dashboard should provide a concise overview.

Example metrics:

```text
Active Courses
Current Semester
Enrolled Students
Evaluation Completion
Average Score
```

Possible sections:

- Current courses
- Current semester
- Recent enrollment
- Evaluation progress
- Ranking
- Pending evaluations

Do not turn the dashboard into a full analytics platform.

---

# 25. Shared Design System

The shared design system is a major part of PRIME.

The architecture should demonstrate:

```text
Design Tokens
      ↓
Theme
      ↓
UI Primitives
      ↓
Shared Components
      ↓
Business Patterns
      ↓
Feature Modules
```

---

# 26. Design Tokens

Create a fictional PRIME brand token system.

Include:

- Primary
- Secondary
- Success
- Warning
- Error
- Information
- Neutral scale
- Typography
- Radius
- Spacing
- Border
- Shadow

Support:

```text
Light Mode
Dark Mode
```

Use semantic tokens instead of hardcoded colors throughout feature modules.

---

# 27. UI Primitives

The system should provide reusable primitives such as:

- Button
- Input
- Label
- Select
- Checkbox
- Badge
- Card
- Dialog
- Dropdown
- Calendar
- Tabs
- Tooltip
- Alert
- Form controls

shadcn/ui may be used as the technical foundation.

However, the components must be customized into the PRIME visual system rather than appearing as default shadcn components.

---

# 28. Shared Application Components

Build reusable higher-level components for common patterns:

- Data Table
- Search
- Filter
- Pagination
- Form layouts
- Modal forms
- Modal tables
- Loading states
- Skeleton states
- Error states
- Empty states
- Status indicators
- Confirmation dialogs

These components should be reused by multiple modules.

---

# 29. Architecture Rules

Feature modules should consume shared components.

Avoid duplicating common UI.

Conceptually:

```text
Design System
      ↓
Shared Components
      ↓
Business Modules
```

Generic UI components must not contain course-specific, enrollment-specific, cost-specific, or evaluation-specific business logic.

Keep business logic inside feature boundaries.

---

# 30. API Architecture

PRIME should be designed as an API-driven frontend.

Demonstrate:

- API/service abstraction
- Request / response handling
- Loading states
- Error states
- Form submission
- Data transformation
- Validation
- Refresh / invalidation
- Appropriate optimistic interaction

The backend can use:

- Mock API
- Local API routes
- Mock service layer

The frontend should still be structured like a production application.

---

# 31. UX Direction

PRIME should prioritize clarity and usability over visual gimmicks.

## General

- Clear hierarchy
- Predictable navigation
- Consistent forms
- Clear status communication
- Responsive layouts
- Accessible controls
- Useful empty states
- Useful loading states
- Useful error states

## Data-heavy screens

Tables should support:

- Search
- Filtering
- Sorting
- Pagination
- Row actions
- Empty state
- Loading state
- Error state

## Forms

Forms should support:

- Validation
- Required fields
- Clear error messages
- Loading submission state
- Logical grouping
- Save feedback

---

# 32. MVP

## Must Have

### Application

- Dashboard
- Application shell
- Navigation
- Responsive layout
- Light / dark mode

### Academic

- Course list
- Course detail
- Semester list
- Course-semester relationship

### Enrollment

- Student list
- Add from existing profile
- Add from previous course
- Add new student
- Enrollment status

### Student

- Student profile
- Academic information
- Student experience
- Edit profile
- Validation
- Save flow

### Cost

- Cost sheet
- Cost groups
- Cost items
- Cost options
- Direct costs, per course
- Indirect costs, per program term
- Distribution by the driver (credit hours)
- Total cost
- Cost per student, per course and per program
- Preferred price

### Evaluation

- Evaluation groups
- Student evaluator
- Inspector evaluator
- Teacher evaluator
- TA evaluator
- Evaluation form
- Score calculation
- Ranking
- Grade calculation
- Individual report

### Design System

- Design tokens
- Light / dark theme
- UI primitives
- Shared forms
- Data table
- Modals
- Loading states
- Error states
- Empty states
- Status components

---

# 33. Explicitly Out of Scope

Do not expand PRIME into a complete university ERP.

Not required:

- Full LMS
- Online classes
- Assignment submission
- Examination system
- Payment gateway integration (invoicing itself is in scope — §13b)
- Dormitory management
- Library management
- Full attendance system
- Full HR system
- Real SSO (the demo role sign-in is in scope - 3a)
- Real student identity integration
- Real external integrations
- Production notification infrastructure
- Complex permission administration (a four-role access table is in scope - 3a)
- Complete accounting system
- Full analytics platform
- Mobile application

The project should remain focused.

---

# 34. Portfolio Goal

PRIME should demonstrate that the developer can build a realistic enterprise-style frontend from complex business requirements.

The recruiter should be able to see evidence of:

1. React / TypeScript engineering
2. UX/UI decision making
3. API integration
4. Complex forms
5. Data-heavy interfaces
6. Business workflow modeling
7. Reusable component architecture
8. Design-system development
9. Responsive design
10. Loading / error / empty states
11. Non-trivial score calculations
12. Ranking and reporting logic

The project should communicate:

> "I can take a complex business workflow and turn it into a clean, reusable, production-oriented frontend."

---

# 35. Implementation Priority

Build in this order:

```text
1. Design Tokens
        ↓
2. Shared UI Primitives
        ↓
3. Shared Application Components
        ↓
4. Application Shell
        ↓
5. Course + Semester
        ↓
6. Enrollment
        ↓
7. Student Profile
        ↓
8. Cost Management
        ↓
9. Evaluation Groups
        ↓
10. 360° Evaluation
        ↓
11. Score + Ranking + Grade
        ↓
12. Individual Report
        ↓
13. Cross-module Integration
        ↓
14. Portfolio Polish
```

Prioritize:

```text
Architecture > Feature Quantity

UX Quality > Visual Complexity

Reusable Components > Duplicated Code

Realistic Workflows > Fake Complexity

Polished Core Flows > Huge Feature Count
```

---

# 36. Final Product Definition

PRIME is a fictional school management system centered around:

```text
COURSE
   ↓
SEMESTER
   ↓
STUDENT
   ↓
ENROLLMENT
   ↓
EVALUATION GROUP
   ↓
360° EVALUATION
   ↓
SCORE
   ↓
GRADE
   ↓
REPORT
```

with:

```text
COURSE
   ↓
SEMESTER
   ↓
COST SHEET
   ↓
COST STRUCTURE
   ↓
COST PER STUDENT
```

and a shared foundation:

```text
PRIME DESIGN SYSTEM
        ↓
Reusable Components
        ↓
All Modules
```

Keep the product focused, believable, technically interesting, and small enough to finish to a high standard.
