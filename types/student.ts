/**
 * The student profile (direction.md §9) is split into sections so the edit
 * experience is a set of focused forms rather than one giant one.
 */

export interface StudentPersonalInfo {
  firstName: string;
  lastName: string;
  /** ISO date. */
  dateOfBirth?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface StudentAcademicInfo {
  /**
   * The programme this student belongs to (direction.md §7a).
   *
   * The id is the join; `program` beside it is what a reader sees. Until
   * 2026-09-20 there was only the name, and "one student belongs to one
   * programme" was enforced by comparing it to `Program.name` - so renaming a
   * programme would have started refusing its own students, and two programmes
   * sharing a name would have let one enrol into the other (`AUD-021`).
   */
  programId: string;
  /** The programme's display name. Never compared; see `programId`. */
  program: string;
  major: string;
  /** Year of study, 1-based. */
  yearLevel: number;
  interests: string[];
  skills: string[];
  certifications: string[];
}

export interface StudentExperienceItem {
  id: string;
  title: string;
  description?: string;
  /** ISO date, or absent for ongoing entries. */
  startDate?: string;
  endDate?: string;
}

export interface StudentExperience {
  projects: StudentExperienceItem[];
  clubs: StudentExperienceItem[];
  activities: StudentExperienceItem[];
  achievements: StudentExperienceItem[];
  careerGoal?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Student {
  id: string;
  /** Human-facing student ID, e.g. `ST-2026-001`. Unique. */
  studentId: string;
  personal: StudentPersonalInfo;
  academic: StudentAcademicInfo;
  experience: StudentExperience;
  emergencyContact?: EmergencyContact;
  createdAt: string;
  updatedAt: string;
}

/** Trimmed shape for tables and pickers, where the full profile is overkill. */
export interface StudentSummary {
  id: string;
  studentId: string;
  fullName: string;
  program: string;
  major: string;
  yearLevel: number;
  avatarUrl?: string;
}

export interface StudentListFilters {
  search?: string;
  program?: string | "all";
  yearLevel?: number | "all";
}

/**
 * One programme term a student has held a place in (direction.md 7a, 9).
 *
 * The profile shows enrolment history at **programme** grain, not course
 * grain: a student joins a programme term and the course enrollments follow,
 * so one row per term is the history a person recognises. The semester supplies
 * the dates, because a term is a period rather than a label.
 */
export interface StudentProgramTerm {
  programEnrollmentId: string;
  programTermId?: string;
  programCode: string;
  programName: string;
  semesterCode: string;
  status: "pending" | "active" | "completed" | "withdrawn";
  startDate: string;
  endDate: string;
}
