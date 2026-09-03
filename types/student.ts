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
