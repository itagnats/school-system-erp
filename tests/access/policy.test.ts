import { describe, expect, it } from "vitest";
import {
  API_ACCESS,
  DEMO_ACCOUNT_ROLES,
  PAGE_ACCESS,
  canCallApi,
  canOpenPath,
  formatPrincipalCookie,
  landingPathFor,
  mayPassAsOwner,
  parsePrincipalCookie,
  ruleFor,
  safeReturnPath,
} from "@/lib/access";
import { APP_ROLES, type AppRole } from "@/types";

/**
 * The access table is the only thing standing between a role and a screen, and
 * it is a table - so it is tested rather than reasoned about. The cases that
 * matter are the ones where a mistake would not look like a mistake: a prefix
 * that swallows a longer one, an unlisted path that falls open, and a cookie
 * that parses when it should not.
 */

describe("ruleFor", () => {
  it("gives a longer prefix precedence over a shorter one", () => {
    expect(ruleFor(PAGE_ACCESS, "/evaluation/manage")?.prefix).toBe("/evaluation/manage");
    expect(ruleFor(PAGE_ACCESS, "/evaluation")?.prefix).toBe("/evaluation");
  });

  it("carries a rule down to detail routes", () => {
    expect(ruleFor(PAGE_ACCESS, "/students/ST-2026-001/edit")?.prefix).toBe("/students");
    expect(ruleFor(API_ACCESS, "/api/invoices/inv-1")?.prefix).toBe("/api/invoices");
  });

  it("does not let a prefix match a longer sibling segment", () => {
    // /costs must not own /costsomething. The boundary is the slash.
    expect(ruleFor(PAGE_ACCESS, "/costsomething")).toBeUndefined();
  });

  it("matches the root rule only at the root", () => {
    expect(ruleFor(PAGE_ACCESS, "/")?.prefix).toBe("/");
    expect(ruleFor(PAGE_ACCESS, "/nothing-here")).toBeUndefined();
  });

  it("ignores a trailing slash", () => {
    expect(ruleFor(PAGE_ACCESS, "/invoices/")?.prefix).toBe("/invoices");
  });
});

describe("canOpenPath", () => {
  it("denies an unlisted path to every role", () => {
    // The allowlist falls closed. A route added without a rule stops working
    // loudly instead of serving everybody quietly.
    for (const role of APP_ROLES) {
      expect(canOpenPath(role, "/some-new-module")).toBe(false);
    }
  });

  it("gives the administrator every listed page", () => {
    for (const rule of PAGE_ACCESS) {
      expect(canOpenPath("administrator", rule.prefix)).toBe(true);
    }
  });

  it("keeps money away from a student and a TA", () => {
    for (const path of ["/costs", "/costs/courses", "/invoices", "/invoices/inv-1"]) {
      expect(canOpenPath("student", path)).toBe(false);
      expect(canOpenPath("ta", path)).toBe(false);
      expect(canOpenPath("teacher", path)).toBe(false);
      expect(canOpenPath("administrator", path)).toBe(true);
    }
  });

  it("leaves a student their own queue but not the management screen", () => {
    expect(canOpenPath("student", "/evaluation")).toBe(true);
    expect(canOpenPath("student", "/evaluation/assign-1")).toBe(true);
    expect(canOpenPath("student", "/evaluation/manage")).toBe(false);
  });

  it("lets a TA into the management screen", () => {
    expect(canOpenPath("ta", "/evaluation/manage")).toBe(true);
  });

  it("keeps the dashboard and the develop section open to everyone", () => {
    for (const role of APP_ROLES) {
      expect(canOpenPath(role, "/dashboard")).toBe(true);
      expect(canOpenPath(role, "/design-system")).toBe(true);
      expect(canOpenPath(role, "/system-guide")).toBe(true);
    }
  });
});

describe("canCallApi", () => {
  it("denies an unlisted endpoint to every role", () => {
    for (const role of APP_ROLES) {
      expect(canCallApi(role, "/api/unlisted", "GET")).toBe(false);
    }
  });

  it("separates reading from writing where the roles differ", () => {
    // A TA reads Manage Evaluation to see who still owes work, and changes
    // nothing. That distinction is the whole reason the table has two columns.
    expect(canCallApi("ta", "/api/evaluation/setup-1", "GET")).toBe(true);
    expect(canCallApi("ta", "/api/evaluation/setup-1", "PATCH")).toBe(false);
    expect(canCallApi("teacher", "/api/evaluation/setup-1", "PATCH")).toBe(true);
  });

  it("lets a teacher read a student and only an administrator change one", () => {
    expect(canCallApi("teacher", "/api/students/ST-2026-001", "GET")).toBe(true);
    expect(canCallApi("teacher", "/api/students/ST-2026-001", "PATCH")).toBe(false);
    expect(canCallApi("administrator", "/api/students/ST-2026-001", "PATCH")).toBe(true);
  });

  it("treats HEAD as a read", () => {
    expect(canCallApi("student", "/api/evaluation/queue", "HEAD")).toBe(true);
  });

  it("refuses every write to the queue, including the administrator's", () => {
    // It lists what you owe; it is not somewhere anything is decided.
    for (const role of APP_ROLES) {
      expect(canCallApi(role, "/api/evaluation/queue", "POST")).toBe(false);
    }
  });

  it("leaves signing in reachable to a role that can reach nothing else", () => {
    expect(canCallApi("student", "/api/session", "POST")).toBe(true);
    expect(canCallApi("student", "/api/session", "DELETE")).toBe(true);
  });

  it("gives every page rule an endpoint rule that agrees about reading", () => {
    // A page a role can open whose endpoint refuses them is a spinner that
    // never resolves. Checked pair by pair rather than trusted.
    const pairs: Array<[string, string]> = [
      ["/programs", "/api/programs"],
      ["/courses", "/api/courses"],
      ["/semesters", "/api/semesters"],
      ["/enrollment", "/api/enrollment"],
      ["/students", "/api/students"],
      ["/invoices", "/api/invoices"],
    ];

    for (const [page, api] of pairs) {
      for (const role of APP_ROLES) {
        expect(canCallApi(role, api, "GET")).toBe(canOpenPath(role, page));
      }
    }
  });
});

describe("landingPathFor", () => {
  it("lands every role somewhere that role may open", () => {
    for (const role of APP_ROLES) {
      expect(canOpenPath(role, landingPathFor(role))).toBe(true);
    }
  });
});

describe("the principal cookie", () => {
  it("round-trips a role and an account id", () => {
    const parsed = parsePrincipalCookie(formatPrincipalCookie("ta", "acc-ta"));
    expect(parsed).toEqual({ role: "ta", accountId: "acc-ta" });
  });

  it("refuses a role that is not the one that account holds", () => {
    // The hole found by probing the built server on 2026-09-16: both halves
    // were valid on their own, nothing asked whether they belonged together,
    // and `administrator:acc-student` was served as an administrator.
    expect(parsePrincipalCookie("administrator:acc-student")).toBeUndefined();
    expect(parsePrincipalCookie("student:acc-registrar")).toBeUndefined();
  });

  it("refuses an account id nobody issued", () => {
    expect(parsePrincipalCookie("administrator:acc-invented")).toBeUndefined();
  });

  it("accepts every account in the map paired with its own role", () => {
    for (const [accountId, role] of Object.entries(DEMO_ACCOUNT_ROLES)) {
      expect(parsePrincipalCookie(`${role}:${accountId}`)).toEqual({ role, accountId });
    }
  });

  it.each([
    ["nothing", undefined],
    ["an empty string", ""],
    ["no separator", "administrator"],
    ["an empty role", ":acc-1"],
    ["an unknown role", "superuser:acc-registrar"],
    ["an empty account id", "administrator:"],
    ["an account id with a path in it", "administrator:../../etc"],
    ["an account id with a quote in it", 'administrator:acc"1'],
  ])("reads %s as nobody", (_label, value) => {
    // Client-supplied data. Anything that does not parse is nobody rather than
    // a default, because a default here would be a role somebody did not pick.
    expect(parsePrincipalCookie(value as string | undefined)).toBeUndefined();
  });

  it("keeps a role that arrives with the right shape but the wrong case out", () => {
    expect(parsePrincipalCookie("Administrator:acc-registrar")).toBeUndefined();
  });
});

describe("safeReturnPath", () => {
  it("keeps a path inside the application", () => {
    expect(safeReturnPath("/invoices/inv-1", "/dashboard")).toBe("/invoices/inv-1");
  });

  it.each([
    ["nothing", null],
    ["an empty string", ""],
    ["another site", "https://evil.example/steal"],
    ["a protocol-relative URL", "//evil.example/steal"],
    ["a backslash variant", "/\\evil.example"],
    ["a scheme buried in a path", "/redirect?to=javascript://evil"],
    ["a bare word", "dashboard"],
  ])("falls back rather than leaving the site for %s", (_label, value) => {
    expect(safeReturnPath(value, "/dashboard")).toBe("/dashboard");
  });
});

describe("owner-scoped rules", () => {
  it("keeps the collection itself out of reach", () => {
    // The whole point of the rule: a student reaches their own record and not
    // the directory it sits in. A student who could list every profile has been
    // handed exactly what the ownership check exists to prevent.
    expect(canOpenPath("student", "/students")).toBe(false);
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/students")).toBe(false);
    expect(canCallApi("student", "/api/students", "GET")).toBe(false);
    expect(mayPassAsOwner(API_ACCESS, "student", "/api/students", "GET")).toBe(false);
  });

  it("lets a student past the edge to a record", () => {
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/students/stu-007")).toBe(true);
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/students/stu-007/edit")).toBe(true);
    expect(mayPassAsOwner(API_ACCESS, "student", "/api/students/stu-007", "GET")).toBe(true);
  });

  it("passes any record, because the edge cannot tell whose it is", () => {
    // This is the contract, not a gap: `mayPassAsOwner` says "somebody
    // downstream must decide", and `ownsStudent` in server/principal.ts is what
    // decides. A test asserting false here would be asserting a check this
    // function deliberately does not make.
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/students/stu-999")).toBe(true);
  });

  it("gives an owner the verbs the rule names and no others", () => {
    // Editing a profile and deleting one are different acts. The student was
    // given the first on 2026-09-16 and never the second, and that distinction
    // lives in the table rather than inside a handler.
    expect(mayPassAsOwner(API_ACCESS, "student", "/api/students/stu-007", "PATCH")).toBe(true);
    expect(mayPassAsOwner(API_ACCESS, "student", "/api/students/stu-007", "DELETE")).toBe(false);
    expect(mayPassAsOwner(API_ACCESS, "student", "/api/students/stu-007", "POST")).toBe(false);
  });

  it("reads only, where a rule names no owner verbs", () => {
    // The page table carries no `ownerMethods`, so a student may open their
    // profile and cannot POST to the route that renders it.
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/students/stu-007", "POST")).toBe(false);
  });

  it("offers nothing to a role the rule does not name", () => {
    for (const role of ["administrator", "teacher", "ta"] as const) {
      expect(mayPassAsOwner(API_ACCESS, role, "/api/students/stu-007", "PATCH")).toBe(false);
    }
  });

  it("offers nothing on a prefix with no owner entry", () => {
    for (const role of APP_ROLES) {
      expect(mayPassAsOwner(API_ACCESS, role, "/api/invoices/inv-1", "GET")).toBe(false);
      expect(mayPassAsOwner(PAGE_ACCESS, role, "/invoices/inv-1")).toBe(false);
    }
  });

  it("does not let an owner rule leak to a neighbouring prefix", () => {
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/studentsomething/x")).toBe(false);
  });
});

describe("a student's own reports", () => {
  it("keeps the picker and the results table staff-only", () => {
    // `/reports` is the setup picker and every subject's score. The deeper rule
    // must not open it: longest-prefix-wins is what keeps the two apart, and a
    // rule accidentally written at `/reports` would hand a student the cohort.
    expect(canOpenPath("student", "/reports")).toBe(false);
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/reports")).toBe(false);
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/reports/students")).toBe(false);
  });

  it("lets a student past the edge to a report record", () => {
    expect(canOpenPath("student", "/reports/students/stu-007")).toBe(false);
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/reports/students/stu-007")).toBe(true);
  });

  it("keeps staff reading it by role rather than by ownership", () => {
    for (const role of ["administrator", "teacher"] as const) {
      expect(canOpenPath(role, "/reports/students/stu-007")).toBe(true);
      expect(mayPassAsOwner(PAGE_ACCESS, role, "/reports/students/stu-007")).toBe(false);
    }
    // A TA runs an evaluation and reads its results; they are not in the
    // Reports section at all, and the deeper rule does not change that.
    expect(canOpenPath("ta", "/reports/students/stu-007")).toBe(false);
    expect(mayPassAsOwner(PAGE_ACCESS, "ta", "/reports/students/stu-007")).toBe(false);
  });

  it("is a read, never a write", () => {
    expect(mayPassAsOwner(PAGE_ACCESS, "student", "/reports/students/stu-007", "POST")).toBe(
      false,
    );
    expect(
      mayPassAsOwner(PAGE_ACCESS, "student", "/reports/students/stu-007", "DELETE"),
    ).toBe(false);
  });
});

describe("the table itself", () => {
  it("names only known roles", () => {
    const known = new Set<string>(APP_ROLES);
    const roles = [...PAGE_ACCESS, ...API_ACCESS].flatMap((rule) => [
      ...rule.read,
      ...(rule.write ?? []),
    ]) as AppRole[];

    for (const role of roles) expect(known.has(role)).toBe(true);
  });

  it("names an owner only where a downstream check exists", () => {
    // An `owner` entry is a promise that every page and handler beneath the
    // prefix asserts ownership itself, and nothing in lib/ can verify that
    // (`AUD-026`). What this test can do is keep the list short and deliberate:
    // adding a prefix here fails until somebody writes the guard and updates
    // this line.
    const owned = [...PAGE_ACCESS, ...API_ACCESS]
      .filter((rule) => rule.owner && rule.owner.length > 0)
      .map((rule) => rule.prefix)
      .sort();

    // /students        -> requireOwnStudent, in the page and the edit page
    // /api/students    -> mayReadStudent / mayWriteStudent, in GET and PATCH
    // /reports/students-> requireOwnStudent, in the reports page
    expect(owned).toEqual(["/api/students", "/reports/students", "/students"]);
  });

  it("has no duplicate prefix in either table", () => {
    for (const rules of [PAGE_ACCESS, API_ACCESS]) {
      const prefixes = rules.map((rule) => rule.prefix);
      expect(new Set(prefixes).size).toBe(prefixes.length);
    }
  });
});
