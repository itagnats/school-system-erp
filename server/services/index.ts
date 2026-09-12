import "server-only";

/**
 * Domain services. Both the route handlers under `app/api` and any server
 * component read through these, which is what keeps the hybrid boundary safe:
 * the two paths differ only in whether HTTP sits in the middle.
 */
export * from "./course-service";
export * from "./semester-service";
export * from "./student-service";
export * from "./enrollment-service";
export * from "./cost-service";
export * from "./catalogue-service";
export * from "./invoice-service";
export * from "./program-service";
export * from "./evaluation-service";
export * from "./persona-service";
export * from "./report-service";
export * from "./dashboard-service";
