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
  /**
   * Program terms, separate from programs since 2026-09-21.
   *
   * They shared a key while `/api/programs` returned terms. Two resources on
   * one cache key means a program create patching the list would also have to
   * know the term list's shape.
   */
  programTerms: {
    all: ["program-terms"] as const,
    list: (filters?: unknown) => ["program-terms", "list", filters ?? null] as const,
    detail: (id: string) => ["program-terms", "detail", id] as const,
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
  /**
   * Program cost sheets, keyed by the program term.
   *
   * A separate group from `costs`: the two sheets are different records with
   * different shapes, and one key space would let a course detail and a
   * program detail overwrite each other in the cache.
   */
  programCosts: {
    all: ["program-costs"] as const,
    list: (filters?: unknown) => ["program-costs", "list", filters ?? null] as const,
    detail: (programTermId: string) =>
      ["program-costs", "detail", programTermId] as const,
  },
  catalog: {
    all: ["catalog"] as const,
    list: (filters?: unknown) => ["catalog", "list", filters ?? null] as const,
    group: (id: string) => ["catalog", "group", id] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    list: (filters?: unknown) => ["invoices", "list", filters ?? null] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
  },
  questions: {
    all: ["questions"] as const,
    list: (filters?: unknown) => ["questions", "list", filters ?? null] as const,
    group: (id: string) => ["questions", "group", id] as const,
  },

  evaluation: {
    all: ["evaluation"] as const,
    /** Demo identities for the evaluator screens. */
    personas: ["evaluation", "personas"] as const,
    /** Everything one persona owes. */
    queue: (personaId?: string) => ["evaluation", "queue", personaId ?? null] as const,
    /** One assignment, opened as one persona. */
    assignment: (personaId: string, assignmentId: string) =>
      ["evaluation", "assignment", personaId, assignmentId] as const,
    /** Every assessee in a setup, scored. */
    results: (setupId: string) => ["evaluation", "results", setupId] as const,
    /** One subject's report, fetched when its modal opens. */
    report: (setupId: string, subjectId: string) =>
      ["evaluation", "report", setupId, subjectId] as const,
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
