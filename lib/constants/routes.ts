/**
 * Route builders. Detail links go through these so a path change is a one-file
 * edit, and so ids are encoded rather than interpolated raw.
 */
const enc = encodeURIComponent;

export const routes = {
  dashboard: () => "/dashboard",
  programs: () => "/programs",
  /** One program and its terms (added 2026-09-21). */
  program: (programId: string) => `/programs/${enc(programId)}`,
  /**
   * One term, nested under its program.
   *
   * Nested rather than `/programs/<termId>`, which is what it was until
   * 2026-09-21: Next.js cannot hold two dynamic segments at one level, so a
   * program page at `/programs/<programId>` and a term page at
   * `/programs/<termId>` would be the same route. The hierarchy is real, so
   * the URL says so.
   */
  programTerm: (programId: string, programTermId: string) =>
    `/programs/${enc(programId)}/${enc(programTermId)}`,
  courses: () => "/courses",
  course: (courseId: string) => `/courses/${enc(courseId)}`,
  semesters: () => "/semesters",
  semester: (code: string) => `/semesters/${enc(code)}`,
  enrollment: () => "/enrollment",
  /** A program term seen through the enrollment lens: its students. */
  enrollmentTerm: (programTermId: string) => `/enrollment/${enc(programTermId)}`,
  students: () => "/students",
  student: (studentId: string) => `/students/${enc(studentId)}`,
  /** The profile as a set of forms, one section per tab (direction.md 10). */
  studentEdit: (studentId: string) => `/students/${enc(studentId)}/edit`,
  costs: () => "/costs",
  /** The course cost list. `/costs` itself now leads with programs. */
  courseCosts: () => "/costs/courses",
  costSheet: (costSheetId: string) => `/costs/courses/${enc(costSheetId)}`,
  costCatalog: () => "/costs/catalog",
  /** The indirect cost sheet for a program term (direction.md 11). */
  programCost: (programTermId: string) =>
    `/costs/programs/${enc(programTermId)}`,
  invoices: () => "/invoices",
  invoice: (invoiceId: string) => `/invoices/${enc(invoiceId)}`,
  /**
   * The evaluator's queue. `as` carries the demo persona.
   *
   * Identity is a URL parameter rather than app-wide state, so a queue can be
   * refreshed, bookmarked and pasted to someone else - the same reason list
   * filters live in the URL. It is scoped to this area because the
   * administrative screens do not have a "you".
   */
  evaluation: (personaId?: string) =>
    personaId ? `/evaluation?as=${enc(personaId)}` : "/evaluation",
  evaluationManage: () => "/evaluation/manage",
  questionBank: () => "/evaluation/manage/questions",
  evaluationSetup: (setupId: string) => `/evaluation/manage/${enc(setupId)}`,
  evaluationAssignment: (assignmentId: string, personaId?: string) =>
    personaId
      ? `/evaluation/${enc(assignmentId)}?as=${enc(personaId)}`
      : `/evaluation/${enc(assignmentId)}`,
  reports: () => "/reports",
  studentReport: (studentId: string) => `/reports/students/${enc(studentId)}`,
  designSystem: () => "/design-system",
  systemGuide: () => "/system-guide",
} as const;
