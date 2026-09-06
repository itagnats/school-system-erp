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
  students: () => "/students",
  student: (studentId: string) => `/students/${enc(studentId)}`,
  costs: () => "/costs",
  costSheet: (costSheetId: string) => `/costs/${enc(costSheetId)}`,
  evaluation: () => "/evaluation",
  evaluationManage: () => "/evaluation/manage",
  evaluationSetup: (setupId: string) => `/evaluation/manage/${enc(setupId)}`,
  evaluationDetail: (evaluationId: string) => `/evaluation/${enc(evaluationId)}`,
  reports: () => "/reports",
  studentReport: (studentId: string) => `/reports/students/${enc(studentId)}`,
  designSystem: () => "/design-system",
} as const;
