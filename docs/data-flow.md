# Data flow

How a value gets from a fixture to a pixel, and back.

PRIME is an API-driven frontend with no database. The BFF is real — real HTTP,
real status codes, real payloads — it just reads an in-memory store seeded from
fixtures. Nothing about the client half is simulated.

Related: [decisions/why-bff.md](decisions/why-bff.md) · [architecture.md](architecture.md)

---

## The chain

```
data/mock/*.ts          fixtures — typed, fictional, readable in a diff
      ↓
data/seed/              deterministic generation, for volume
      ↓
server/repositories/    in-memory tables, cloned from the seed
      ↓
server/services/        domain read/write operations; business rules
      ↓  ↓
      ↓  └──────────────→ server components import services DIRECTLY
      ↓
app/api/**/route.ts     the BFF — validates, maps rows to DTOs, picks a status
      ↓
lib/api/client.ts       the only fetch() in the application
      ↓
features/<d>/services/  typed callers, one per endpoint
      ↓
features/<d>/hooks/     TanStack Query wrappers
      ↓
component
```

Everything under `server/` starts with `import "server-only"`, so a client
component importing a repository fails at build time rather than shipping the
whole seed to the browser.

**`proxy.ts` sits in front of the whole diagram.** Every request — page or API —
passes the role check and, on anything that changes state, a same-origin check,
before a route handler or a server component runs. It is described in
[architecture.md](architecture.md#access); what matters here is that a service is
never the place authorization is decided, and a route handler never has to
remember to ask.

---

## Reads and writes

```
Reads    page → feature hook → service → lib/api → /api → route handler → service
Writes   form → Zod → mutation → lib/api → /api → route handler → service
                                       → query invalidation → UI
```

No component calls `fetch` directly. Server data is never copied into local state
by hand.

---

## The split: HTTP or direct?

Both paths end at the same `server/services/*` function. Which path a screen
takes depends on what the screen is:

| Screen | Path | Why |
| --- | --- | --- |
| Interactive lists — search, filter, sort, paginate | **client → `/api`** | The state changes on interaction, so it has to be a client component anyway. TanStack Query gets a real cache, real retries, real invalidation. |
| Detail and report pages | **server component → service** | Nothing to interact with. A server component fetching its own route handler over HTTP is an extra hop and against Next.js guidance. |

Routing everything through HTTP would make the BFF more visible in a Network
tab, and that was considered. It was rejected because a self-fetching server
component is a mistake a Next-literate reader would notice, and knowing when
*not* to make the hop is worth more than the demo value of the extra request.

---

## The list contract

Every list endpoint accepts the same flat query. Flat, because `ListQuery` in
`types/common.ts` round-trips through URL search params without a serializer:

```
?search=&sort=&direction=asc|desc&page=1&pageSize=20
```

plus domain filters, e.g. `&status=enrolled`. It returns `PaginatedResult<T>`:

```ts
{ items: T[]; total: number; page: number; pageSize: number }
```

**Filtering, sorting and pagination happen server-side.** A client that fetches
everything and slices it in the browser demonstrates nothing.

The URL is the source of truth for list state: `useListQueryParams` reads it, the
query key is built from it through `queryKeys.<domain>.list(filters)`, and a
filtered table therefore survives a refresh and can be pasted to a colleague.

---

## Contracts

`types/<domain>.ts` is the hand-written domain type and stays that way.
`lib/api/contracts/<domain>.ts` holds the Zod schema for the wire shape,
declared so the compiler enforces that the two agree:

```ts
export const courseResponse = z.object({ … }) satisfies z.ZodType<Course>;
```

One definition of the shape, one runtime check, and a compile error if they
drift. The request is validated on the server and the response on the client —
not trusting either direction is the point.

**The store shape never reaches the wire.** A route handler maps rows to a
response DTO even when the two are identical today. That mapping is the seam
that lets the store change without breaking the client, and it is the clearest
difference between a BFF and a REST proxy.

---

## Errors

`lib/api/client.ts` expects one envelope:

```ts
{ message?: string; fieldErrors?: Record<string, string> }
```

| Status | When | What the user sees |
| --- | --- | --- |
| 400 | malformed query or body | banner |
| 404 | unknown id | not-found state |
| 409 | conflicting write | banner — "reload and try again" |
| 422 | validation failed | messages bound to the offending form fields |

Everything the API layer throws is an `HttpError`, so hooks and error states
never have to guess at the shape.

**The server's `message` is deliberately discarded for display.** `readError()`
keeps the vetted message from `messageForStatus()` and takes only `fieldErrors`
from the body, because reflecting an arbitrary response body into the page turns
a server fault into an injection surface and can leak internal detail. Put the
useful detail in `fieldErrors`, keyed by form field name.

Requests also carry an `AbortController` timeout, so a hanging upstream cannot
pin a tab open, and `credentials: "same-origin"`, so cookies are never attached
if the base URL ever becomes absolute. Ids go through `apiPath()`, which
percent-encodes each segment, rather than being interpolated into a template
string.

---

## Determinism

No `Math.random()`, no `Date.now()`, no bare `new Date()` — anywhere in `data/`,
`server/repositories/` or `server/services/`.

This is a correctness requirement, not a preference. Seed data that differs
between the server render and the client render is a hydration mismatch. A
seeded PRNG lives in `data/seed/random.ts`, and base dates are fixed literals.
The same input produces the same dataset on every process and every build.

The same rule is why petal positions in `components/decor/` are fixed literals.

---

## Writes are shaped, not stored

A mutation validates its body, runs the business rules, returns the correctly
shaped result and the correct status code — and changes nothing. Every page load
starts from the same deterministic seed.

This is a decision, not an oversight; the reasoning and the three rejected
alternatives are in [decisions/why-bff.md](decisions/why-bff.md). It carries two
obligations, so that the reset reads as a scoping decision rather than a bug:

- the README says plainly that persistence is out of scope;
- the app shell carries a quiet "demo data resets on reload" note.

---

## The simulate switch

`?_simulate=slow|empty|error|500` makes the four required data states
demonstrable on demand — which is worth more than asserting they exist.

- underscore-prefixed, so it can never collide with a domain filter;
- stripped in the handler before the query reaches a service;
- handled in one place, `server/simulate.ts`;
- a small artificial latency on every request by default, so skeletons are
  visible rather than theoretical.

---

## Adding a domain

Ten files. Missing one is how a domain ends up half-wired:

1. `types/<domain>.ts`
2. `data/mock/<domain>.ts`
3. `data/seed/generate.ts` — generation for volume
4. `server/repositories/index.ts` — add the table. There is one file, not one
   per domain: a repository here is a cloned array and a few accessors, and
   fourteen files of three lines each would be filing rather than structure.
5. `server/services/<domain>-service.ts`
6. `lib/api/contracts/<domain>.ts`
7. `app/api/<domain>/route.ts` and `[id]/route.ts`
8. `lib/constants/query-keys.ts` — add the key group
9. `features/<domain>/services/` and `hooks/`
10. `features/<domain>/constants.ts` — map the status union onto a `StatusTone`

---

## Current state

| Piece | State |
| --- | --- |
| `lib/api/` — transport, `HttpError`, `apiPath`, timeouts, envelope | **built** |
| `types/` — including `PaginatedResult<T>` and `ListQuery` | **built** |
| `lib/constants/query-keys.ts` — filter-aware keys, every domain | **built** |
| `hooks/use-list-query-params.ts` — URL ⇄ list state | **built** |
| `data/mock/*.ts` | **built** — 10 <!-- count:mockFiles --> files of hand-written fixtures |
| `data/seed/` | **built** — seeded PRNG, deterministic generator |
| `server/` | **built** — repositories, 14 <!-- count:services --> services, query, simulate, http, validation, principal |
| `app/api/` | **built** — 33 <!-- count:routeHandlers --> route handlers, reads and writes |
| `lib/api/contracts/` | **built** — one per domain, plus shared list shapes and the session |
| `features/*` | **built** — all twelve |

### Writes

Every non-GET method in the BFF, by domain:

| Domain | Writes |
| --- | --- |
| Courses | `POST` a course · `PATCH` · `DELETE` |
| Program terms | `PATCH` · `DELETE` |
| Students | `PATCH` · `DELETE` |
| Enrollment | `POST` an enrollment, discriminated on `source` · `DELETE` a membership |
| Cost sheets | `PATCH` the sheet · `POST` an item · `PATCH` and `DELETE` an item |
| Program cost sheets | `PATCH` |
| Catalog | `POST` a group · `PATCH` a group · `POST` an item · `PATCH` and `DELETE` an item |
| Invoices | `PATCH` — the status transition |
| Evaluation setups | `PATCH` |
| Questions | `POST` · `PATCH` · `DELETE`, plus groups |
| Session | `POST` to sign in, `DELETE` to sign out |

They validate, run their business rules, return the correct status and shape —
and store nothing. Four of them are worth reading as examples of a rule that only
a server can hold:

- **The evaluation setup blend must total 100.** An unbalanced blend raises no
  error downstream; it merely scales every score in the course by the same
  amount. Server-side validation here is not ceremony, it is the only place the
  fault is visible.
- **The kind of cost decides which sheet it may reach.** An indirect item on a
  course sheet is a 422, and the reverse too — which makes double-counting
  unrepresentable rather than merely detectable.
- **A second program term in the same semester is a 409**, and a term on
  another program a 422. One program, one term per semester, is what makes
  one invoice per student per semester representable.
- **Deleting a catalog item that sheets have copied is a 409.** A sheet takes a
  snapshot rather than a reference, and its provenance must not point at nothing.

The session write is the odd one out, and deliberately: it is the only write that
changes anything that survives the response, because what it changes is a cookie
rather than a row.

Still ahead: submission contracts — the evaluation forms shape their answers and
discard them — and the computed leaderboard.
