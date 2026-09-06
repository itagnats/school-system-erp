# data

Fictional demo data only. Never real student or employee information, real
internal identifiers, or third-party branding (scaffold.md §12).

```
mock/   hand-written fixtures the repositories are seeded from
seed/   deterministic generators, for the volume that makes pagination real
```

Nothing here is random. A seeded PRNG lives in `seed/random.ts`; `Math.random()`
and `Date.now()` are forbidden in this folder, because seed data that differs
between the server and client renders is a hydration mismatch.

See `.claude/skills/data-layer/SKILL.md` for how this feeds the repositories,
the services and the BFF under `app/api/`.

Naming follows the specification examples: `IT101`, `202602`, `Student 001`,
`Evaluation Group A`, `ST-2026-001`.
