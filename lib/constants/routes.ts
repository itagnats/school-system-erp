/**
 * Route builders. Detail links go through these so a path change is a one-file
 * edit, and so ids are encoded rather than interpolated raw.
 */
const enc = encodeURIComponent;

export const routes = {
  dashboard: () => "/dashboard",
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
  evaluationGroups: () => "/evaluation/groups",
  evaluationDetail: (evaluationId: string) => `/evaluation/${enc(evaluationId)}`,
  ranking: () => "/evaluation/ranking",
  reports: () => "/reports",
  studentReport: (studentId: string) => `/reports/students/${enc(studentId)}`,
  designSystem: () => "/design-system",
} as const;
