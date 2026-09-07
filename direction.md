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
└── Cost Sheets

Evaluation
├── Evaluation Groups
├── Evaluations
└── Ranking

Reports
└── Student Reports

Design System
```

Navigation can be adjusted during implementation if UX improvements are discovered.

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

# 4a. Curriculum and Programmes

*Added 2026-09-06. A course on its own has a cost but no price, so cost
management could describe spending and never answer whether it was worth it.*

A **programme** is what a student actually enrols in. It gathers courses into a
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

A course still belongs to itself and may appear in several programmes. That is
why a programme is charged a course cost *per student* rather than being handed
the whole cost sheet.

Support:

- Programme with code, name and credential
- Per-semester curriculum: which courses, in teaching order
- Package price per term
- Term status: planning, open, closed
- Programme roster: who is under this programme this term

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

# 7a. Enrolment Through a Programme

*Added 2026-09-06.*

Enrolment is entered at the **programme** level, not the course level. A student
joins a programme term, and that enrols them in the courses of its curriculum.

```text
Enrol student -> Program Term (BSC-IT, 202601)
                   └── creates a course enrollment per course in the curriculum
```

Two consequences the UI must respect:

- the enrollment screen can be entered from a programme, and answers "who is
  under this programme" as directly as it answers "who is on this course";
- a student may still drop an individual course, so a per-course head count is a
  subset of the programme head count and never assumed equal to it.

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

Manage the financial structure associated with delivering a course in a semester.

The cost-management model can retain the useful hierarchical structure of the real enterprise workflow while using fictional school data.

Example:

```text
Course
  ↓
Semester
  ↓
Cost Sheet
```

Example:

```text
IT101
202602
Cost Sheet
```

---

# 12. Cost Structure

The cost sheet should support a hierarchy:

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

Example:

```text
Teaching
├── Instructor
├── TA
└── Guest Lecturer

Facilities
├── Classroom
├── Equipment
└── Laboratory

Student Activities
├── Materials
├── Workshop
└── Field Trip
```

---

# 13. Cost Calculation

The system should demonstrate meaningful financial calculations.

Support:

- Direct costs
- Shared / indirect costs
- Cost allocation
- Total cost
- Cost per student
- Optional markup

Basic calculation:

```text
Direct Costs
+
Shared Costs
=
Total Course Cost

Total Course Cost
÷
Number of Students
=
Cost per Student
```

The UI should make calculations understandable instead of hiding the business logic.

Do not reproduce every production cost-management workflow.

---

# 13a. Revenue and Profitability

*Added 2026-09-06. This is what makes §13 a decision rather than bookkeeping.*

```text
Package price x Enrolled students = Revenue
Sum of attributed course costs     = Total cost
Revenue - Total cost               = Net profit
Net profit / Revenue               = Margin
```

**Attributed** is the load-bearing word. A course cost sheet covers everyone on
that course, and a course can be taught into several programmes at once, so a
programme cannot be charged the whole sheet. It is charged:

```text
Course cost per student x Students from this programme on that course
```

which is the only split that stays correct when two programmes share a course.

Three things must not be hidden:

- a course with no cost sheet contributes **unknown**, not zero, and the screen
  says how many such courses there are, because a total assembled from an
  incomplete curriculum is a different claim from a complete one;
- a loss is shown as a negative number, never clamped;
- a margin with no revenue is **not** 0%, it has no value.

The break-even package price should be shown beside the margin: it answers
"what would this have to cost" rather than only "what did we make".

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

## Evaluation setup (added 2026-09-06)

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
student is the centre of this feature (§16, Student). "Nobody assesses
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
grade technical contribution, which is the teacher's and the TA's judgement to
make. Only the teacher answers all seven.

**A subset, not a separately worded set per relation.** Wording each relation's
questions independently was the alternative and was rejected: a criterion would
then mean something slightly different depending on who answered it, and the
scores would stop being comparable across roles. A role's 360 score is
normalised over the criteria it was actually asked, so a shorter question set is
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
judgement is a property of the teacher's own share.

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

**A role can be switched off**, and the remaining weights are renormalised so
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

Display appropriate evaluator comments.

The report should be visually structured and suitable for printing.

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
- Direct costs
- Shared costs
- Allocation
- Total cost
- Cost per student

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
- Tuition/payment processing
- Dormitory management
- Library management
- Full attendance system
- Full HR system
- Real SSO
- Real student identity integration
- Real external integrations
- Production notification infrastructure
- Complex permission administration
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
