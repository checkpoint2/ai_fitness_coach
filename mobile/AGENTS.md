# Mobile AGENTS.md

## Scope

- These rules apply under `mobile/` in addition to the repository root instructions. Keep the peer agent instruction file in this directory equivalent.
- [`README.md`](README.md) owns mobile setup, commands, runtime status, and dependencies. [`../docs/MOBILE_PILOT_UX.md`](../docs/MOBILE_PILOT_UX.md) owns screen behavior; [`../docs/TESTING.md`](../docs/TESTING.md) owns the mobile test and Maestro runbooks.
- Read the owning product specification before changing onboarding, AI/memory, fitness evidence, subscriptions, social auth, notifications, or storage. Route from the root instruction file instead of restating those contracts here.

## Architecture And UX

- Mobile is a user-only Expo surface. Keep administrator behavior in the browser webapp and preserve the active/deferred surface choices in [`../CHECKLIST.md`](../CHECKLIST.md).
- Product contexts live in `src/features/<context>` and expose public feature APIs. Routes and screens compose them; endpoint-agnostic capabilities belong in `src/platform`. Follow the client dependency direction in [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).
- Keep endpoint paths, schemas, server-state adapters, cache keys, mutations, and invalidation in the owning feature. Inspect loading, empty, error, success, disabled, optimistic, stale, retry, and account-switch states that the change can affect.
- Follow existing components and styling. Shared components own their surface, padding, radius, internal spacing, typography, and control sizing; compose them externally instead of overriding their internals.
- Preserve accessibility semantics and stable touch targets around `44-48pt` or larger. Use stable `testID` values from `src/constants/testIds.ts` for mobile E2E selectors, never coordinates or fragile copy selectors.

## Validation

- For a normal mobile change, run the relevant tests plus `bun run --cwd mobile typecheck` and `bun run --cwd mobile lint`. Run `bun run architecture:check` when feature/platform/UI dependency boundaries change.
- Use Maestro only for valuable cross-layer journeys. Run against an installed Expo development build, not Expo Go; follow `MAESTRO_DEV_SERVER_URL` and `EXPO_PUBLIC_E2E=1` rules in [`../docs/TESTING.md`](../docs/TESTING.md).
- Keep production password fields secure, avoid `hideKeyboard`, and center important CTA targets before taps. After changing Maestro flows, runner inputs, selectors, or E2E-only app behavior, run `bun run --cwd mobile e2e:maestro:audit` with the relevant flow validation.
