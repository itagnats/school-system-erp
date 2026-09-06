# Why a BFF with no backend behind it

**Status:** accepted · decided 2026-09-05

---

## Context

PRIME is a frontend portfolio project. There is no database, no external service,
and no intention of adding one — but demonstrating API integration is one of the
explicit goals, and the product specification calls for "an API-driven frontend"
with loading and error states, form submission, data transformation, validation,
invalidation and optimistic interaction.

So the question is not *whether* there is a data layer. It is what sits behind
it, and how honest that thing has to be.

The specification sanctions three options — a mock API, local API routes, or a
mock service layer — and separately warns: **do not over-engineer the backend.**

One more constraint had already been decided implicitly. The client half was
built first, and it presumes a real HTTP endpoint:

```ts
NEXT_PUBLIC_API_URL: z.string().min(1).default("/api")   // config/env.ts
credentials: "same-origin"                                // lib/api/client.ts
AbortController + 15s timeout
{ message, fieldErrors } envelope → HttpError
```

alongside `PaginatedResult<T>`, `ListQuery`, filter-aware query keys and a
URL-backed list-state hook. Nothing existed under `app/api/`. That gap was the
whole decision.

---

## Decision

**Next.js route handlers under `app/api/` are the BFF**, backed by an in-memory
store seeded from typed fixtures.

Three layers, so the wire shape and the store shape stay separable:

```
data/mock/*.ts          typed, fictional seed
server/repositories/    in-memory tables cloned from the seed
server/services/        domain operations and business rules
app/api/**/route.ts     validates, maps rows → response DTO, picks a status
```

This is a real server. Real HTTP, real status codes, real payloads, real
`AbortController` timeouts. It reads from memory rather than Postgres, and that
is the only part that is not production-shaped.

Three sub-decisions came with it.

### Writes are shaped and validated, but not persisted

A mutation validates its body, runs the business rules, returns the correct
result and status code — and changes nothing. Every page load starts from the
same deterministic seed.

The deploy target is Vercel. There is no long-lived process to hold state.

### The boundary is hybrid

Route handlers stay thin and delegate to `server/services/*`. **Server components
import those services directly** rather than fetching their own HTTP route, which
is an extra hop and against Next.js guidance. Interactive list screens — the ones
that filter, sort and paginate — are client components going through `/api`.

### Data is deterministic

No `Math.random()`, no `Date.now()` in `data/` or `server/`. A seeded PRNG and
fixed base dates. Non-deterministic seed data means the server and client renders
disagree, which is a hydration mismatch — a failure this project has already paid
for once.

---

## Consequences

**Good**

- A reviewer opens the Network tab and sees genuine requests with genuine
  response shapes. Nothing to take on trust.
- TanStack Query's cache, retries, invalidation and optimistic updates are
  exercised against real HTTP rather than a stub.
- The aggregation endpoint — `/api/dashboard/summary`, one screen assembled from
  several services — is the thing that makes it a BFF rather than a REST proxy,
  and it is only possible because there is a server layer at all.
- Validation runs on both sides of the wire, which is a demonstration in itself.
- One deployable. No second service, no cold starts, no external dependency.

**Costs**

- **A reviewer's edit disappears on refresh.** This is the real price. It is
  mitigated, not eliminated, by the README saying so and by a "demo data resets
  on reload" note in the shell. Without those the reset reads as a bug rather
  than as scope.
- More moving parts than importing a fixture array directly into a component.
  That is the point, but it is still more code.
- The BFF is only visible in the Network tab on the screens that use HTTP. The
  server-rendered detail and report pages call services directly, so their data
  never appears as a request. Documented deliberately, since a Next-literate
  reader would otherwise wonder.

---

## Alternatives considered

**Import fixtures directly into components.** Simplest possible, and demonstrates
nothing about API integration. It would also make `lib/api/` — already written,
with its error envelope and timeout handling — dead code.

**MSW (Mock Service Worker) as the primary mechanism.** A service worker
intercepting fetch. Rejected as the main path: it makes the deployed app *less*
real, not more, and a reviewer who knows MSW knows they are looking at a mock.
Still worth adding later for **tests**, where intercepting the network is exactly
the right tool.

**json-server or an external mock API.** Rejected: a second process, a second
deploy, and a cold start on any free tier — in exchange for nothing the route
handlers do not already provide.

**A real database (SQLite, Turso, Postgres).** Rejected: contradicts
"do not over-engineer the backend", adds a deploy dependency and a schema to
maintain, and demonstrates backend skill that is not what this project is for.

### On persistence specifically

Three ways to make writes survive a refresh were considered and rejected:

**Shared server memory.** One mutable store for every visitor. Rejected on a
risk that is easy to miss: a reviewer could open the site and find whatever the
previous visitor typed, or a half-deleted dataset. On serverless it is also
inconsistent, since each instance holds its own memory.

**Per-browser overlay.** Writes persisted in the visitor's own browser and merged
over the seed. Durable and visitor-isolated. Rejected because every *derived*
read would have to merge the overlay too — the dashboard summary that counts
courses, the cost-per-student that divides by enrolment count, the ranking
computed from scores. Miss one and a reviewer adds a course, sees it in the
table, and sees the dashboard still say 40. A partially-updated figure reads as a
bug; a total reset reads as a decision. Partial inconsistency is the worse
failure. It would also have forced editable detail pages off server rendering.

**Server-side per-session store**, keyed by an anonymous `HttpOnly` cookie.
Strictly better than the overlay — visitor-isolated, survives refresh, derived
reads stay consistent because everything is computed server-side, and it would
not disturb the hybrid boundary. Rejected **only** because it depends on a single
long-lived process. On serverless the session store vanishes between requests
unpredictably, which is the shared-memory failure mode wearing a disguise.

**If this project ever moves to an always-on Node host, the per-session store is
the option to revisit.** Nothing in the current design blocks it: the repositories
would take a session key, and no route handler, service contract or client
service would change.
