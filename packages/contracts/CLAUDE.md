# Contracts CLAUDE.md

## Scope

- These rules apply under `packages/contracts/` in addition to the repository root instructions. Keep the peer agent instruction file in this directory equivalent.
- [`README.md`](README.md) owns package purpose, commands, schema practice, and upstream references. [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) owns cross-surface contract direction; [`../../docs/TESTING.md`](../../docs/TESTING.md) owns validation levels.

## Contract Discipline

- This package is the shared source of truth for API payloads, DTOs, and stable error shapes. Define or change the Zod contract here before adapting backend transport and client features; never hand-copy an API shape into a consumer.
- Export schemas and inferred types through `src/index.ts`. Keep the package limited to validation, bounded normalization, and shared types; runtime-only business rules belong to the owning product context.
- Treat response additions consumed by strict installed mobile clients as compatibility-sensitive. Inspect every producer, serializer, parser, form, API adapter, and supported client before removing or tightening a field.
- Validate public media URL schemes explicitly as described in [`README.md`](README.md); do not rely on generic URL syntax when the product requires HTTPS.

## Validation

- Start with `bun run --cwd packages/contracts test` and `bun run --cwd packages/contracts typecheck`.
- In the same change, validate affected backend and mobile/web consumers and run `bun run architecture:check`. Use integration or E2E coverage when the risk is serialization, permissions, persistence, or a user-visible cross-layer flow.
