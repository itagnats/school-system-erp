import { NextResponse } from "next/server";
import { PRINCIPAL_COOKIE, formatPrincipalCookie } from "@/lib/access";
import { signInSchema } from "@/lib/api/contracts";
import { jsonError } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { findDemoAccount, listDemoAccounts, resolvePrincipal } from "@/server/services";

/**
 * The demo session (direction.md §3a).
 *
 * The one endpoint reachable with no principal, because it is what produces
 * one. `proxy.ts` lets it through by name.
 *
 * Nothing here is authentication. There is no password to check, no account to
 * look up in a directory and no secret to sign the cookie with - PRIME is a
 * frontend piece with no database, and a signing key committed to the
 * repository would be theatre rather than security. What this demonstrates is
 * where a session is established and what the cookie carrying it should look
 * like, which is the part a frontend actually owns.
 */

/**
 * How the cookie is set, and why each flag is on.
 *
 * - `httpOnly` - script has no reason to read it. The shell renders on the
 *   server and receives the principal as props, so nothing client-side ever
 *   needs the raw value. A cookie script cannot read is a cookie an injected
 *   script cannot steal.
 * - `sameSite: "lax"` - the browser will not attach it to a cross-site write at
 *   all, which is the first of the two CSRF locks. The second is the `Origin`
 *   check in `proxy.ts`. "Lax" rather than "strict" so that following a link
 *   into the app does not land on the sign-in screen.
 * - `secure` in production only - the flag would stop the cookie working over
 *   plain http on localhost, and a developer silently signed out is how a
 *   security default gets removed rather than understood.
 * - `maxAge` - a demo identity should not outlive the sitting it was chosen in.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

/** GET /api/session - who this request is being served for, if anyone. */
export async function GET(request: Request) {
  const cookie = readCookie(request, PRINCIPAL_COOKIE);
  const principal = resolvePrincipal(cookie);

  return NextResponse.json({
    principal: principal ?? null,
    accounts: listDemoAccounts(),
  });
}

/** POST /api/session - sign in as one of the demo accounts. */
export async function POST(request: Request) {
  const parsed = parseBody(signInSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const account = findDemoAccount(parsed.data.accountId);
  if (!account) {
    // 422 rather than 404: the request is well-formed and names something that
    // does not exist, which is a problem with the field, not with the route.
    return jsonError(422, "Some fields need attention", {
      accountId: "That is not a demo account",
    });
  }

  const response = NextResponse.json({
    principal: {
      role: account.role,
      accountId: account.id,
      displayName: account.displayName,
      title: account.title,
      context: account.context,
      personaId: account.personaId,
    },
  });

  // The role travels in the cookie beside the account id so that `proxy.ts` can
  // decide access without loading the seed. Both halves are checked against
  // each other on the way back in - see `resolvePrincipal`.
  response.cookies.set(
    PRINCIPAL_COOKIE,
    formatPrincipalCookie(account.role, account.id),
    cookieOptions(),
  );

  return response;
}

/** DELETE /api/session - sign out. */
export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });

  // Overwritten with an expiry rather than only deleted by name: the same
  // attributes have to be sent back or a browser can decline to match it.
  response.cookies.set(PRINCIPAL_COOKIE, "", { ...cookieOptions(), maxAge: 0 });

  return response;
}

/**
 * Reads one cookie off a plain `Request`.
 *
 * The route receives a `Request` rather than a `NextRequest`, and `next/headers`
 * `cookies()` is not usable from here without making the handler dynamic in a
 * way nothing else in this BFF is.
 */
function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}
