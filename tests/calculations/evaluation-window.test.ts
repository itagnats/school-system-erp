import { describe, expect, it } from "vitest";
import {
  EVALUATION_WINDOW_TRANSITIONS,
  canTransitionWindow,
  toStoredDate,
  windowDateErrors,
} from "@/lib/calculations";
import type { EvaluationWindowStatus } from "@/types";

const WINDOW = {
  opensOn: "2026-02-02T00:00:00.000Z",
  closesOn: "2026-02-27T00:00:00.000Z",
  reportDate: "2026-03-06T00:00:00.000Z",
};

describe("canTransitionWindow", () => {
  it("walks a setup from draft to published", () => {
    expect(canTransitionWindow("draft", "open")).toBe(true);
    expect(canTransitionWindow("open", "closed")).toBe(true);
    expect(canTransitionWindow("closed", "published")).toBe(true);
  });

  it("reopens a closed window, which is a real administrative act", () => {
    expect(canTransitionWindow("closed", "open")).toBe(true);
  });

  it("refuses to move a published evaluation anywhere", () => {
    const statuses: EvaluationWindowStatus[] = ["draft", "open", "closed"];
    for (const status of statuses) {
      expect(canTransitionWindow("published", status)).toBe(false);
    }
  });

  it("refuses to skip the window entirely", () => {
    expect(canTransitionWindow("draft", "published")).toBe(false);
    expect(canTransitionWindow("draft", "closed")).toBe(false);
    expect(canTransitionWindow("open", "published")).toBe(false);
  });

  it("treats a move to the status it already holds as a no-op", () => {
    for (const status of Object.keys(
      EVALUATION_WINDOW_TRANSITIONS,
    ) as EvaluationWindowStatus[]) {
      expect(canTransitionWindow(status, status)).toBe(true);
    }
  });
});

describe("windowDateErrors", () => {
  it("passes a window that opens, closes and then reports", () => {
    expect(windowDateErrors(WINDOW)).toBeNull();
  });

  it("refuses a window that closes before it opens", () => {
    const errors = windowDateErrors({ ...WINDOW, closesOn: "2026-01-20T00:00:00.000Z" });
    expect(errors?.closesOn).toBeDefined();
    expect(errors?.reportDate).toBeUndefined();
  });

  it("refuses a window that closes on the day it opens", () => {
    expect(windowDateErrors({ ...WINDOW, closesOn: WINDOW.opensOn })?.closesOn).toBeDefined();
  });

  it("refuses reports that arrive before there is anything to report", () => {
    const errors = windowDateErrors({ ...WINDOW, reportDate: "2026-02-10T00:00:00.000Z" });
    expect(errors?.reportDate).toBeDefined();
  });

  it("allows reports on the day the window closes", () => {
    expect(windowDateErrors({ ...WINDOW, reportDate: WINDOW.closesOn })).toBeNull();
  });

  it("compares whole days, not timestamps", () => {
    const errors = windowDateErrors({
      ...WINDOW,
      closesOn: "2026-02-27T23:59:00.000Z",
      reportDate: "2026-02-27T00:00:00.000Z",
    });
    expect(errors).toBeNull();
  });
});

describe("toStoredDate", () => {
  it("puts a date input's value in the shape the store holds", () => {
    expect(toStoredDate("2026-03-06")).toBe("2026-03-06T00:00:00.000Z");
  });

  it("leaves an already-stored value where it is", () => {
    expect(toStoredDate("2026-03-06T00:00:00.000Z")).toBe("2026-03-06T00:00:00.000Z");
  });
});
