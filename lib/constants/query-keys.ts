/**
 * Every TanStack Query key in the application is built here.
 *
 * Centralising them is what makes invalidation reliable: a mutation can
 * invalidate `queryKeys.enrollment.all` without knowing which list filters
 * happen to be mounted (scaffold.md §25).
 */
export const queryKeys = {
  programs: {
    all: ["programs"] as const,
    list: (filters?: unknown) => ["programs", "list", filters ?? null] as const,
    detail: (id: string) => ["programs", "detail", id] as const,
  },
  courses: {
    all: ["courses"] as const,
    list: (filters?: unknown) => ["courses", "list", filters ?? null] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
  },
  semesters: {
    all: ["semesters"] as const,
    list: (filters?: unknown) => ["semesters", "list", filters ?? null] as const,
    detail: (code: string) => ["semesters", "detail", code] as const,
  },
  students: {
    all: ["students"] as const,
    list: (filters?: unknown) => ["students", "list", filters ?? null] as const,
    detail: (id: string) => ["students", "detail", id] as const,
  },
  enrollment: {
    all: ["enrollment"] as const,
    list: (filters?: unknown) => ["enrollment", "list", filters ?? null] as const,
    detail: (id: string) => ["enrollment", "detail", id] as const,
  },
  costs: {
    all: ["costs"] as const,
    list: (filters?: unknown) => ["costs", "list", filters ?? null] as const,
    detail: (id: string) => ["costs", "detail", id] as const,
  },
  evaluation: {
    all: ["evaluation"] as const,
    /** Manage Evaluation: one row per course-semester setup. */
    list: (filters?: unknown) => ["evaluation", "list", filters ?? null] as const,
    /** One setup, with its groups, relations and weight summary. */
    setup: (id: string) => ["evaluation", "setup", id] as const,
    groups: (courseId?: string, semester?: string) =>
      ["evaluation", "groups", courseId ?? null, semester ?? null] as const,
    detail: (id: string) => ["evaluation", "detail", id] as const,
    ranking: (scope?: unknown) => ["evaluation", "ranking", scope ?? null] as const,
  },
  reports: {
    all: ["reports"] as const,
    student: (studentId: string, courseId: string, semester: string) =>
      ["reports", "student", studentId, courseId, semester] as const,
  },
} as const;
