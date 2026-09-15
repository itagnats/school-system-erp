/**
 * Route builders. Detail links go through these so a path change is a one-file
 * edit, and so ids are encoded rather than interpolated raw.
 */
const enc = encodeURIComponent;

export const routes = {
  dashboard: () => "/dashboard",
  programs: () => "/programs",
  programTerm: (programTermId: string) => `/programs/${enc(programTermId)}`,
  courses: () => "/courses",
  course: (courseId: string) => `/courses/${enc(courseId)}`,
  semesters: () => "/semesters",
  semester: (code: string) => `/semesters/${enc(code)}`,
  enrollment: () => "/enrollment",
  /** A programme term seen through the enrolment lens: its students. */
  enrolmentTerm: (programTermId: string) => `/enrollment/${enc(programTermId)}`,
  students: () => "/students",
  student: (studentId: string) => `/students/${enc(studentId)}`,
  costs: () => "/costs",
  /** The course cost list. `/costs` itself now leads with programmes. */
  courseCosts: () => "/costs/courses",
  costSheet: (costSheetId: string) => `/costs/courses/${enc(costSheetId)}`,
  costCatalogue: () => "/costs/catalogue",
  /** The indirect cost sheet for a programme term (direction.md 11). */
  programCost: (programTermId: string) =>
    `/costs/programmes/${enc(programTermId)}`,
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
  evaluationSetup: (setupId: string) => `/evaluation/manage/${enc(setupId)}`,
  evaluationAssignment: (assignmentId: string, personaId?: string) =>
    personaId
      ? `/evaluation/${enc(assignmentId)}?as=${enc(personaId)}`
      : `/evaluation/${enc(assignmentId)}`,
  reports: () => "/reports",
  studentReport: (studentId: string) => `/reports/students/${enc(studentId)}`,
  designSystem: () => "/design-system",
} as const;
