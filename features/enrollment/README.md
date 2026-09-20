# features/enrollment

Feature module. Not implemented yet — the design system, theme and shared
components are being finalized first.

```
components/     UI specific to this feature
hooks/          data hooks; call services, never fetch directly
services/       API calls via lib/api
validations/    Zod schemas for this feature
calculations/   pure business math, unit tested
types.ts        feature-local types (domain types live in types/)
constants.ts    status-to-tone maps, labels, option lists
```

Rules that apply here:

- business logic stays inside this folder (direction.md §29);
- status vocabulary is mapped to a `StatusTone` in `constants.ts`, so shared
  components never learn this feature's vocabulary;
- calculations are pure and live in `calculations/`, never inside JSX.
