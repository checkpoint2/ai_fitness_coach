# Backend AGENTS.md

## Scope

- These rules apply under `backend/` in addition to the repository root instructions. Keep the peer agent instruction file in this directory equivalent.
- [`README.md`](README.md) owns backend commands, environment, runtime entrypoints, APIs, and deployment links. [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) owns module and runtime design; [`../docs/TESTING.md`](../docs/TESTING.md) owns test selection and database-backed runbooks.
- Use [`../docs/LOCAL_DATABASE.md`](../docs/LOCAL_DATABASE.md) and [`../docker-compose.yml`](../docker-compose.yml) as the local PostgreSQL source of truth. Default to Docker Compose; do not ask for native PostgreSQL unless the user chooses it.

## Module And Runtime Boundaries

- Keep the backend a modular monolith. Product contexts live in `src/modules/<context>` and expose cross-context behavior only through `index.ts` or explicit application ports.
- Transport owns Hono/HTTP and representation; application owns use cases, permissions, transactions, and orchestration; optional domain code owns pure rules; infrastructure owns Prisma and provider adapters. Do not import inward-facing implementations across those boundaries.
- Keep routes thin, repositories product-specific, provider normalization in infrastructure, and request identity derived only from authenticated server context. Do not introduce universal services, generic CRUD repositories, or one-to-one forwarding layers.
- Declare recurring jobs once in `src/jobs.ts` and schedules in `src/job-schedules.json`. Use `src/background-tasks.ts` only for loss-tolerant request work and `src/outbox`/`task_outbox` for work that must survive restart. Follow [`../docs/BACKGROUND_JOBS.md`](../docs/BACKGROUND_JOBS.md) before changing execution behavior.
- Solve measured limits with existing PostgreSQL and runtime mechanisms before adding queues, caches, brokers, event logs, or search services. The escape conditions live in [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Persistence And Validation

- Never hand-write Prisma migration SQL. Change `prisma/schema.prisma` declaratively and run the repository migration workflow from [`README.md`](README.md); put rollout guards or backfills in an existing repository-supported owning layer.
- For auth, permission, persistence, contract, query, or async changes, test success plus meaningful isolation, failure, concurrency/idempotency, retry, deletion, and recovery behavior at the PostgreSQL/API boundary as applicable.
- Run targeted unit or integration tests first, then `bun run --cwd backend typecheck`. Run `bun run architecture:check` for module or contract-boundary changes; use the wider local gate defined in [`../docs/TESTING.md`](../docs/TESTING.md) when risk warrants it.
