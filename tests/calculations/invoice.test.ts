import { describe, expect, it } from "vitest";
import {
  CREDIT_RATE,
  DEMO_BILLER_ID,
  amountInSatang,
  buildPaymentCode,
  calculateInvoiceTotals,
  canTransition,
  courseLineAmount,
  creditLineAmount,
  creditReasonFor,
  isBilled,
  isCollected,
  isOutstanding,
  paymentReference,
  programFeeAmount,
} from "@/lib/calculations";
import type { InvoiceLine } from "@/types";

function course(amount: number, id = "l1"): InvoiceLine {
  return { id, kind: "course", description: "IT101", amount };
}

function credit(amount: number, id = "l9"): InvoiceLine {
  return { id, kind: "credit", description: "Credit - IT101", amount };
}

describe("courseLineAmount", () => {
  it("prices a course from its credit hours", () => {
    expect(courseLineAmount(3)).toBe(3 * CREDIT_RATE);
  });

  it("accepts a rate, so a term priced differently is still expressible", () => {
    expect(courseLineAmount(2, 5000)).toBe(10000);
  });
});

describe("programFeeAmount", () => {
  it("is the gap between the course lines and the package price", () => {
    expect(programFeeAmount(35100, 33600)).toBe(1500);
  });

  it("is zero when the courses account for the whole package", () => {
    expect(programFeeAmount(33600, 33600)).toBe(0);
  });
});

describe("creditReasonFor", () => {
  it("credits a cancelled course in full and a dropped one by half", () => {
    expect(creditReasonFor("cancelled")).toBe("cancelled");
    expect(creditReasonFor("dropped")).toBe("dropped");
    expect(creditLineAmount(8400, "cancelled")).toBe(-8400);
    expect(creditLineAmount(8400, "dropped")).toBe(-4200);
  });

  it("gives nothing back for a course still running or already finished", () => {
    expect(creditReasonFor("active")).toBeNull();
    expect(creditReasonFor("completed")).toBeNull();
    expect(creditReasonFor("enrolled")).toBeNull();
    expect(creditReasonFor("pending")).toBeNull();
  });

  it("gives nothing back for a curriculum course never enrolled in", () => {
    // The absence of an enrollment row, not a status. Choosing not to attend
    // what was bought is not a billing event (direction.md §13b).
    expect(creditReasonFor(undefined)).toBeNull();
  });
});

describe("calculateInvoiceTotals", () => {
  it("sums the charges and subtracts the credits", () => {
    const totals = calculateInvoiceTotals([
      course(12600, "l1"),
      course(12600, "l2"),
      course(8400, "l3"),
      { id: "l4", kind: "fee", description: "Program fee", amount: 1500 },
      credit(-8400),
    ]);

    expect(totals.subtotal).toBe(35100);
    expect(totals.creditTotal).toBe(8400);
    expect(totals.total).toBe(26700);
  });

  it("reports the credit total as a positive number", () => {
    // "Credits ฿8,400" reads correctly on a document; "Credits -฿8,400" does
    // not. The sign stays on the line.
    const totals = calculateInvoiceTotals([course(8400), credit(-4200)]);
    expect(totals.creditTotal).toBe(4200);
  });

  it("totals an empty invoice to zero rather than to NaN", () => {
    expect(calculateInvoiceTotals([])).toEqual({
      subtotal: 0,
      creditTotal: 0,
      total: 0,
    });
  });

  it("can total to zero when everything is credited back", () => {
    const totals = calculateInvoiceTotals([course(8400), credit(-8400)]);
    expect(totals.total).toBe(0);
  });
});

describe("revenue predicates", () => {
  it("counts only a paid invoice as collected", () => {
    expect(isCollected("paid")).toBe(true);
    expect(isCollected("issued")).toBe(false);
    expect(isCollected("overdue")).toBe(false);
  });

  it("counts an overdue invoice as outstanding, not as lost", () => {
    expect(isOutstanding("issued")).toBe(true);
    expect(isOutstanding("overdue")).toBe(true);
    expect(isOutstanding("paid")).toBe(false);
  });

  it("excludes a draft and a cancelled invoice from revenue entirely", () => {
    // An unsent document must not inflate a program's revenue.
    expect(isBilled("draft")).toBe(false);
    expect(isBilled("cancelled")).toBe(false);
    expect(isBilled("issued")).toBe(true);
    expect(isBilled("overdue")).toBe(true);
    expect(isBilled("paid")).toBe(true);
  });
});

describe("canTransition", () => {
  it("allows the one move the UI offers", () => {
    expect(canTransition("issued", "paid")).toBe(true);
    expect(canTransition("overdue", "paid")).toBe(true);
  });

  it("refuses to reopen a settled invoice", () => {
    expect(canTransition("paid", "issued")).toBe(false);
    expect(canTransition("cancelled", "paid")).toBe(false);
  });

  it("refuses to pay something that was never sent", () => {
    expect(canTransition("draft", "paid")).toBe(false);
    expect(canTransition("draft", "issued")).toBe(true);
  });
});

describe("paymentReference", () => {
  it("strips the punctuation a scanner does not carry", () => {
    expect(paymentReference("ST-2026-001")).toBe("ST2026001");
    expect(paymentReference("INV-2026-0142")).toBe("INV20260142");
  });

  it("uppercases, so one student cannot become two references", () => {
    expect(paymentReference("st-2026-001")).toBe("ST2026001");
  });

  it("clips to the twenty characters the field holds", () => {
    expect(paymentReference("A".repeat(30))).toHaveLength(20);
  });
});

describe("amountInSatang", () => {
  it("is twelve zero-padded digits of satang", () => {
    expect(amountInSatang(126000)).toBe("000012600000");
    expect(amountInSatang(0)).toBe("000000000000");
  });

  it("keeps the satang rather than rounding to baht", () => {
    expect(amountInSatang(1234.56)).toBe("000000123456");
  });

  it("clamps a negative total, which is not a thing to pay", () => {
    expect(amountInSatang(-500)).toBe("000000000000");
  });
});

describe("buildPaymentCode", () => {
  const code = buildPaymentCode({
    studentCode: "ST-2026-001",
    invoiceNumber: "INV-2026-0142",
    total: 117600,
  });

  it("carries the four fields a counter payment needs", () => {
    expect(code.billerId).toBe(DEMO_BILLER_ID);
    expect(code.ref1).toBe("ST2026001");
    expect(code.ref2).toBe("INV20260142");
    expect(code.amount).toBe("000011760000");
  });

  it("builds the payload from those same four fields", () => {
    expect(code.payload).toBe(
      `|${DEMO_BILLER_ID}|ST2026001|INV20260142|000011760000`,
    );
  });

  it("takes a biller, so the placeholder is not baked into the format", () => {
    const other = buildPaymentCode({
      studentCode: "ST-2026-002",
      invoiceNumber: "INV-2026-0143",
      total: 100,
      billerId: "999999999999999",
    });
    expect(other.payload.startsWith("|999999999999999|")).toBe(true);
  });
});
