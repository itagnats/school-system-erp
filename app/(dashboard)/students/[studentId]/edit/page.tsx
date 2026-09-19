import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentEditScreen } from "@/features/students/components/student-edit-screen";
import { requireWritableStudent } from "@/server/principal";
import { getStudent } from "@/server/services";

interface PageParams {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { studentId } = await params;
  const student = getStudent(studentId);
  return {
    title: student
      ? `Edit ${student.personal.firstName} ${student.personal.lastName}`
      : "Edit student",
  };
}

/**
 * Editing a profile, on its own route (direction.md §10).
 *
 * §10 describes a flow — View, Edit, Validate, Save, Success — and a flow with
 * its own route can be linked to, reloaded, and left with the browser Back
 * button. The alternative built first was an inline toggle on each section of
 * the profile; it worked, and it left the profile unable to decide whether it
 * was a document or a form.
 *
 * The profile is read on the server and handed to a client screen as its
 * starting values, so the first paint is the real profile rather than a
 * spinner. Writes are not persisted, so that screen holds what came back.
 */
export default async function Page({ params }: PageParams) {
  const { studentId } = await params;
  // An administrator edits anybody; a student edits themselves. A teacher reads
  // a profile and is refused here, which is the write column of the access
  // table applied one page earlier than the save would apply it.
  await requireWritableStudent(studentId);

  const student = getStudent(studentId);
  if (!student) notFound();

  return (
    <>
      <StudentEditScreen initial={student} />
    </>
  );
}
