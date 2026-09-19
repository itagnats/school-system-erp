import { NextResponse, type NextRequest } from "next/server";
import {
  API_ACCESS,
  PAGE_ACCESS,
  PRINCIPAL_COOKIE,
  canCallApi,
  canOpenPath,
  mayPassAsOwner,
  parsePrincipalCookie,
} from "@/lib/access";

/**
 * Role enforcement, before anything renders (direction.md §3a).
 *
 * Next 16 renamed Middleware to Proxy; the file convention is `proxy.ts` and
 * `middleware.ts` is deprecated
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`).
 *
 * This is the **only** enforcement point, and putting it here rather than in
 * thirty-one route handlers is a deliberate trade. One table, one check, no
 * endpoint that quietly forgot to call a guard - at the cost of the check
 * sitting beside the routes instead of inside them. Next's own guidance is that
 * a proxy should not be a whole authorization solution, and for a real system
 * that is right: each handler would re-verify a signed session against the
 * principal it is acting for, because a check that runs once at the edge is one
 * deployment mistake away from not running at all.
 *
 * What makes it honest enough here is that the cookie **is** the claim. It is
 * unsigned and self-asserted; there is no session store to verify it against
 * and no secret it could be signed with that is not also in the repository. So
 * a second check inside the handler would read the same unverified string and
 * reach the same answer. This demonstrates where authorization goes and what it
 * costs - it does not pretend to be authentication.
 */

/** Reachable with no principal at all: the door, and the thing that opens it. */
const PUBLIC_PATHS = new Set(["/login", "/api/session"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    const crossSite = rejectCrossSiteWrite(request);
    if (crossSite) return crossSite;
  }

  if (isPublic(pathname)) return NextResponse.next();

  const principal = parsePrincipalCookie(
    request.cookies.get(PRINCIPAL_COOKIE)?.value,
  );

  if (!principal) {
    return isApi
      ? deny(401, "Sign in to continue")
      : toLogin(request, pathname);
  }

  const allowed = isApi
    ? canCallApi(principal.role, pathname, request.method)
    : canOpenPath(principal.role, pathname);

  if (allowed) return NextResponse.next();

  // A record the role may reach only when it is their own. The edge cannot
  // settle that - it knows the path and not whose record it names - so the
  // request goes through and `requireOwnStudent` decides on the other side.
  // This is the one case where passing the proxy is not the same as being
  // allowed, and every path beneath such a prefix owes that check (`AUD-026`).
  const rules = isApi ? API_ACCESS : PAGE_ACCESS;
  if (mayPassAsOwner(rules, principal.role, pathname, request.method)) {
    return NextResponse.next();
  }

  // Names the role rather than the path. Telling somebody which door they tried
  // is useful; telling them what is behind it is not.
  return isApi
    ? deny(403, `Not available to a ${principal.role}`)
    : toNoAccess(request, pathname);
}

/**
 * Same-origin check on anything that changes state.
 *
 * A browser sends `Origin` on every non-GET request, so a cross-site form or
 * script posting to this app arrives with somebody else's origin on it and is
 * refused here. `SameSite=Lax` on the session cookie already stops most of it;
 * this is the second lock, and the one that does not depend on the browser
 * being recent.
 *
 * A request with **no** `Origin` is allowed through: that is curl, a test, or
 * another server, none of which carry a user's cookies to be ridden. The attack
 * this defends against needs a browser, and a browser always sends the header.
 */
function rejectCrossSiteWrite(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") return undefined;

  const origin = request.headers.get("origin");
  if (!origin) return undefined;

  const host = request.headers.get("host");
  if (!host) return deny(403, "Cross-site request refused");

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return deny(403, "Cross-site request refused");
  }

  return originHost === host ? undefined : deny(403, "Cross-site request refused");
}

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    [...PUBLIC_PATHS].some((path) => pathname.startsWith(`${path}/`))
  );
}

/**
 * The error envelope `lib/api/client.ts` expects.
 *
 * The reason travels in `fieldErrors` rather than `message`, because the client
 * keeps its own vetted prose for display and reads only `fieldErrors` out of
 * the body - the same contract `server/http.ts` follows.
 */
function deny(status: number, reason: string) {
  return NextResponse.json(
    { message: reason, fieldErrors: { access: reason } },
    { status },
  );
}

function toLogin(request: NextRequest, attempted: string) {
  const url = new URL("/login", request.url);
  // Only the path, never the whole URL: an open redirect is what happens when a
  // "where were you going" parameter is trusted to be somewhere in this app.
  url.searchParams.set("next", attempted);
  return NextResponse.redirect(url);
}

function toNoAccess(request: NextRequest, attempted: string) {
  const url = new URL("/no-access", request.url);
  url.searchParams.set("from", attempted);
  return NextResponse.redirect(url);
}

export const config = {
  /*
   * Everything except Next's own assets and the files in `public/`.
   *
   * Without the negative match this runs on every stylesheet and image, and a
   * redirect to the sign-in screen would be served in place of the CSS - the
   * failure the Next docs specifically warn about.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
