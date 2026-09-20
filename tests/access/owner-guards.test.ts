import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { API_ACCESS, PAGE_ACCESS } from "@/lib/access";
import type { AccessRule } from "@/lib/access";

/**
 * The guard for the half of an owner rule the edge cannot enforce (`AUD-026`).
 *
 * `lib/access/policy.ts` decides what a role reaches, and for one kind of rule
 * it deliberately cannot finish the job. `owner: ["student"]` means "let this
 * role past `proxy.ts` and make something downstream compare the ids", because
 * the edge sees `/students/stu-007` and has no idea whose record that is.
 *
 * Which leaves an obligation written only in prose: **every page and every
 * handler beneath an owner-scoped prefix must assert ownership itself.** Miss
 * one and the failure is silent and total — the proxy waves a student through
 * to another student's record and nothing else looks.
 *
 * `AUD-026` recorded that nothing verified the promise. This is the
 * verification. It reads the access table, finds the route files that sit
 * beneath each owner-scoped prefix, and fails if one of them does not call a
 * guard. It is a grep with the prefix list supplied by the thing being
 * enforced, so adding a fourth `owner` rule adds its routes to the check with
 * no edit here — which is the property that matters, since the list grew from
 * two prefixes to three on 2026-09-19 and would have grown unnoticed.
 *
 * What it cannot do is check that the guard compares the *right* ids. That
 * stays a matter of reading `server/principal.ts`, where all of them live.
 */

/** Vitest resolves its root from `vitest.config.mts`, which is the repository root. */
const ROOT = process.cwd();

/**
 * The functions that count as asserting ownership, all from `server/principal.ts`.
 *
 * A page redirects and a handler returns a status, so they cannot share one
 * function — but they do share one file, and the list being short and explicit
 * is the point. A new guard has to be added here deliberately, which is a
 * cheaper review than discovering that a route invented its own comparison.
 */
const OWNERSHIP_GUARDS = [
  "requireOwnStudent",
  "requireWritableStudent",
  "mayReadStudent",
  "mayWriteStudent",
] as const;

/** Every `page.tsx` and `route.ts` under `app/`, with the URL path it serves. */
function appRoutes(): { file: string; path: string }[] {
  const found: { file: string; path: string }[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (entry !== "page.tsx" && entry !== "route.ts") continue;

      const segments = relative(join(ROOT, "app"), full).split(sep).slice(0, -1);
      found.push({
        file: relative(ROOT, full).split(sep).join("/"),
        // A route group - `(dashboard)` - organizes files and does not appear
        // in the URL, so a check that kept it would match no prefix at all and
        // report a clean pass over routes it had never looked at.
        path: `/${segments.filter((s) => !s.startsWith("(")).join("/")}`,
      });
    }
  };

  walk(join(ROOT, "app"));
  return found;
}

const ROUTES = appRoutes();

function ownerRules(rules: readonly AccessRule[]): AccessRule[] {
  return rules.filter((rule) => rule.owner && rule.owner.length > 0);
}

const OWNER_RULES = [...ownerRules(PAGE_ACCESS), ...ownerRules(API_ACCESS)];

describe("every owner-scoped route asserts ownership", () => {
  it("finds the routes at all", () => {
    // The trap this project has hit twice: a check that cannot match reports
    // zero and reads as a pass. If the walk breaks, or `app/` moves, the rest
    // of this file would pass over an empty list and prove nothing.
    expect(ROUTES.length).toBeGreaterThan(20);
    expect(ROUTES.map((r) => r.path)).toContain("/students/[studentId]");
  });

  it("has owner rules to check", () => {
    expect(OWNER_RULES.map((rule) => rule.prefix).sort()).toEqual([
      "/api/students",
      "/reports/students",
      "/students",
    ]);
  });

  for (const rule of OWNER_RULES) {
    // Strictly deeper than the prefix, which is exactly what `mayPassAsOwner`
    // lets an owner reach. The collection itself stays staff-only and needs no
    // guard, so including it would demand one where the table already refuses.
    const beneath = ROUTES.filter((route) => route.path.startsWith(`${rule.prefix}/`));

    it(`${rule.prefix} has records beneath it`, () => {
      expect(beneath.length).toBeGreaterThan(0);
    });

    for (const route of beneath) {
      it(`${route.file} calls a guard`, () => {
        const source = readFileSync(join(ROOT, route.file), "utf8");
        const called = OWNERSHIP_GUARDS.filter((guard) =>
          new RegExp(`\\b${guard}\\s*\\(`).test(source),
        );
        expect(
          called,
          `${route.file} sits under the owner-scoped prefix ${rule.prefix}, so a ` +
            `student reaches it through the edge. It must call one of ` +
            `${OWNERSHIP_GUARDS.join(", ")} before it reads a record.`,
        ).not.toHaveLength(0);
      });
    }
  }
});
