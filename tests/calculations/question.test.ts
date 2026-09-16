import { describe, expect, it } from "vitest";
import { copyQuestion, questionDrift, questionsForRelation } from "@/lib/calculations";
import type { Question, QuestionGroup } from "@/types";

function question(overrides: Partial<Question> & { id: string }): Question {
  return {
    groupId: "qg-test",
    type: "rating",
    criterion: "teamwork",
    prompt: "How reliably did they carry their share of the work?",
    appliesTo: ["student"],
    status: "active",
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
    ...overrides,
  };
}

function bank(...questions: Question[]): QuestionGroup[] {
  return [
    {
      id: "qg-test",
      name: "Test group",
      status: "active",
      questions,
      createdAt: "2026-01-05T09:00:00.000Z",
      updatedAt: "2026-01-05T09:00:00.000Z",
    },
  ];
}

describe("copyQuestion", () => {
  it("takes the wording and keeps only the id as provenance", () => {
    const copy = copyQuestion(question({ id: "qn-1", helpText: "Deadlines met." }));

    expect(copy).toEqual({
      sourceQuestionId: "qn-1",
      type: "rating",
      criterion: "teamwork",
      prompt: "How reliably did they carry their share of the work?",
      helpText: "Deadlines met.",
    });
  });

  it("does not carry the status, so archiving the source cannot reach the copy", () => {
    const copy = copyQuestion(question({ id: "qn-1", status: "archived" }));
    expect("status" in copy).toBe(false);
  });
});

describe("questionsForRelation", () => {
  const source = bank(
    question({ id: "qn-teamwork", criterion: "teamwork" }),
    question({ id: "qn-leadership", criterion: "leadership" }),
    question({ id: "qn-staff-only", criterion: "communication", appliesTo: ["teacher"] }),
    question({ id: "qn-archived", criterion: "participation", status: "archived" }),
    question({ id: "qn-text", type: "text", criterion: undefined }),
  );

  it("follows the criteria the relation is asked, in order", () => {
    const copies = questionsForRelation(source, "student", ["leadership", "teamwork"]);
    expect(copies.slice(0, 2).map((copy) => copy.sourceQuestionId)).toEqual([
      "qn-leadership",
      "qn-teamwork",
    ]);
  });

  it("adds the written questions, which belong to no criterion", () => {
    const copies = questionsForRelation(source, "student", ["teamwork"]);
    expect(copies.map((copy) => copy.sourceQuestionId)).toEqual([
      "qn-teamwork",
      "qn-text",
    ]);
  });

  it("skips a question that cannot be asked about this assessee", () => {
    const copies = questionsForRelation(source, "student", ["communication"]);
    expect(copies.some((copy) => copy.sourceQuestionId === "qn-staff-only")).toBe(false);
  });

  it("never picks up an archived question", () => {
    const copies = questionsForRelation(source, "student", ["participation"]);
    expect(copies.some((copy) => copy.sourceQuestionId === "qn-archived")).toBe(false);
  });

  it("asks nothing when the relation has no criteria and no written questions", () => {
    expect(questionsForRelation(bank(), "student", ["teamwork"])).toEqual([]);
  });
});

describe("questionDrift", () => {
  const source = question({ id: "qn-1", helpText: "Deadlines met." });
  const copy = copyQuestion(source);

  it("is none while the bank still says the same thing", () => {
    expect(questionDrift(copy, source)).toBe("none");
  });

  it("is reworded when the prompt changed under the copy", () => {
    expect(questionDrift(copy, { ...source, prompt: "Did they pull their weight?" })).toBe(
      "reworded",
    );
  });

  it("notices a changed help text, which is also part of what was asked", () => {
    expect(questionDrift(copy, { ...source, helpText: "Something else." })).toBe(
      "reworded",
    );
  });

  it("is removed when the question is gone from the bank", () => {
    expect(questionDrift(copy, undefined)).toBe("removed");
  });

  it("is not drift when the source was merely archived", () => {
    expect(questionDrift(copy, { ...source, status: "archived" })).toBe("none");
  });
});
