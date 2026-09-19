import { describe, expect, it } from "vitest";
import { NAV_ITEM_TOTAL, navItemCountFor, navigationFor } from "@/config/navigation";
import { canOpenPath, mayPassAsOwner, PAGE_ACCESS } from "@/lib/access";
import { APP_ROLES, type AppRole } from "@/types";

/**
 * The sidebar a principal actually gets.
 *
 * Worth testing rather than eyeballing, because two of its properties are
 * invisible in the running app until they are wrong: a section heading left
 * standing over nothing, and a link offered to somebody the server will refuse.
 */

describe("navigationFor", () => {
  it("offers a role nothing it cannot open", () => {
    for (const role of APP_ROLES) {
      for (const section of navigationFor({ role })) {
        for (const item of section.items) {
          const allowed =
            canOpenPath(role, item.href) || mayPassAsOwner(PAGE_ACCESS, role, item.href);
          expect(allowed, `${role} was offered ${item.href}`).toBe(true);
        }
      }
    }
  });

  it("drops a section whose every item is filtered out", () => {
    // A heading over nothing reads as a bug. Cost Management is the live case:
    // four administrator-only items, so the label goes with them.
    const labels = navigationFor({ role: "student" }).map((section) => section.label);
    expect(labels).not.toContain("Cost Management");

    for (const section of navigationFor({ role: "ta" })) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it("shrinks monotonically from administrator to student", () => {
    const counts = APP_ROLES.map((role) => navItemCountFor({ role }));
    const administrator = navItemCountFor({ role: "administrator" });

    expect(administrator).toBe(NAV_ITEM_TOTAL);
    for (const count of counts) expect(count).toBeLessThanOrEqual(administrator);
  });
});

/**
 * Items whose href is a record rather than a route: the student's own profile
 * and their own reports. Both are added by `navigationFor` from the principal,
 * so neither is in the static table and neither can be found by `canOpenPath`.
 */
const OWNED_HREFS = ["/students/stu-007", "/reports/students/stu-007"] as const;

/** The staff collections they must never be handed alongside. */
const STAFF_HREFS = ["/students", "/reports"] as const;

describe("the student's own records in the sidebar", () => {
  it("appear only for a student who has a record", () => {
    const withRecord = hrefsFor({ role: "student", studentId: "stu-007" });
    for (const href of OWNED_HREFS) expect(withRecord).toContain(href);

    // No record, no item. A link to `/students/undefined` is worse than a
    // missing link: it is a refusal dressed up as a destination.
    const without = hrefsFor({ role: "student" });
    for (const prefix of STAFF_HREFS) {
      expect(without.some((href) => href.startsWith(prefix))).toBe(false);
    }
  });

  it("are never offered to a role that does not own a record", () => {
    for (const role of ["administrator", "teacher", "ta"] as const) {
      const hrefs = hrefsFor({ role, studentId: "stu-007" });
      for (const href of OWNED_HREFS) expect(hrefs).not.toContain(href);
    }
  });

  it("do not hand the student the staff collections alongside them", () => {
    const hrefs = hrefsFor({ role: "student", studentId: "stu-007" });
    for (const href of STAFF_HREFS) expect(hrefs).not.toContain(href);
  });

  it("are counted in the reach the sign-in card promises", () => {
    // The card and the sidebar read the same function, so a card saying six
    // sections is promising the six that will be there.
    const withRecord = navItemCountFor({ role: "student", studentId: "stu-007" });
    const without = navItemCountFor({ role: "student" });

    expect(withRecord).toBe(without + OWNED_HREFS.length);
  });
});

function hrefsFor(principal: { role: AppRole; studentId?: string }): string[] {
  return navigationFor(principal)
    .flatMap((section) => section.items)
    .map((item) => item.href);
}
