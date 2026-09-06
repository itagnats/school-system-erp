import type { Option, SemesterStatus, StatusTone } from "@/types";

export const SEMESTER_STATUS_TONE: Record<SemesterStatus, StatusTone> = {
  upcoming: "info",
  active: "success",
  closed: "neutral",
};

export const SEMESTER_STATUS_LABEL: Record<SemesterStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  closed: "Closed",
};

export const SEMESTER_STATUS_OPTIONS: Option<SemesterStatus>[] = (
  ["upcoming", "active", "closed"] as const
).map((value) => ({ value, label: SEMESTER_STATUS_LABEL[value] }));
