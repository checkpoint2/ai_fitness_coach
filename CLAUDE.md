# CLAUDE.md

## Scope And Precedence

- These instructions apply repository-wide. A nearer agent instruction file adds surface-specific rules; follow both, with the nearer file taking precedence on a conflict.
- Follow system, developer, and user instructions before repository instructions. Safety, privacy, and preservation of user work take priority.
- When editing this file, keep equivalent agent files such as `AGENTS.md` aligned.

## Working Standard

- Answer in the user's language. Work as a staff-level product engineer paired with a product owner; communicate product effects, meaningful tradeoffs, risks, and required user actions in plain language.
- Be autonomous by default: inspect, decide, implement, validate, and report. Ask only when ambiguity blocks a safe decision, the product choice is genuinely open, or the action is risky or destructive.
- Start from repository evidence. Verify uncertain claims through current code, scripts, schemas, docs, tests, runtime output, or current official documentation.
- Preserve unrelated user changes. Do not revert, overwrite, reformat, clean, stage, or commit work outside the requested scope.
- Prefer the smallest coherent solution and the lightest workflow that proves it. Fix the owning layer; do not hide upstream errors with leaf-level fallbacks or duplicate decision logic.
- Use existing utilities, framework APIs, libraries, package scripts, and generators. Do not add a dependency unless the user requested it by name or explicitly approved it after the product and maintenance impact was explained.
- For non-trivial work, inspect the affected vertical path and directly coupled neighbors before editing. Keep business rules in their owning product boundary, not in routes, screens, providers, or UI primitives.

## Sources Of Truth

- [`README.md`](README.md): first-run setup, workspace commands, active surfaces, and repository entry points.
- [`CHECKLIST.md`](CHECKLIST.md): approved product needs and durable choices. Its capability ledger governs: an `absent`, `removed`, or unlisted capability must not be built without user confirmation and a ledger update.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): module boundaries, runtime shape, infrastructure escape conditions, and cross-surface architecture.
- [`docs/TESTING.md`](docs/TESTING.md): canonical validation contract, test-level selection, and local E2E runbooks.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`infra/README.md`](infra/README.md), and the selected provider runbook: deployment and infrastructure policy.
- [`docs/WEB_SURFACES.md`](docs/WEB_SURFACES.md): required reading before website data, catalogs, carts, checkout, orders, subscriptions, entitlements, or payments.
- Product behavior belongs in its owning specification: onboarding in [`docs/ONBOARDING.md`](docs/ONBOARDING.md), AI and memory in [`docs/AI_COACH.md`](docs/AI_COACH.md), fitness evidence in [`docs/EVIDENCE.md`](docs/EVIDENCE.md), approved decisions in [`docs/DECISIONS.md`](docs/DECISIONS.md), and mobile UX in [`docs/MOBILE_PILOT_UX.md`](docs/MOBILE_PILOT_UX.md).
- Surface-specific engineering rules live in `mobile/`, `backend/`, `packages/contracts/`, and `docs/` agent files. Do not duplicate those rules here.

## Task And Change Discipline

- Review requests are read-only unless the user asks for changes. Diagnosis identifies and explains the cause; implement a fix only when requested. Cosmetic or obvious local edits use a direct workflow. Behavior, contracts, auth, permissions, persistence, validation, routing, state transitions, and other non-trivial runtime changes use TDD-first at the highest-confidence practical boundary.
- For non-trivial changes, define a short acceptance contract when it clarifies done. Cover important success, failure, boundary, permission, persistence, and recovery cases in proportion to risk.
- When contracts, routes, queries, persistence, auth, or async workflows change, inspect their producers, consumers, state handling, retries, idempotency, invalidation, and failure visibility as applicable.
- Do not add empty layers, framework-like abstractions, generic repositories, CQRS, event sourcing, flags, wrappers, or services without a concrete current need.
- Update durable docs only when setup, architecture, operations, contracts, product behavior, or an approved decision materially changes. Link to the owning source instead of restating it.

## Validation

- Run the smallest meaningful checks first and the wider local gate only when the risk warrants it. `bun run template:check` is the minimum documentation/instruction check; `bun run architecture:check` is required when module, feature, contracts, platform, or UI dependency boundaries change. The complete ordinary-task gate is defined in [`docs/TESTING.md`](docs/TESTING.md).
- Treat every non-zero exit, runtime error, unhandled rejection, failed assertion, type error, lint error, build failure, or timeout as a failed signal. Do not call a task complete while its primary user-visible signal still fails.
- If validation cannot run, report why, the substitute evidence, and the remaining risk.

## Git, Safety, And Workspace Hygiene

- Inspect `git remote -v` and `git status --short --branch` before branch, commit, push, PR, or deployment work. Do not create or switch branches unless explicitly requested.
- Treat this as an installed project, not a template contribution. Never push to a template remote; configure or change `origin` only when the user explicitly supplies or requests the destination.
- Do not stage, commit, amend, rebase, reset, stash, push, delete files, or perform destructive actions unless the user explicitly authorizes that operation. Never use cleanup commands to make deployment possible.
- Never print or commit secrets, tokens, credentials, cookies, private customer data, or raw `.env` values. Do not weaken auth, permissions, validation, encryption, rate limits, or auditability.
- Do not stop processes to free ports, create hosted CI/CD, copy this repository, or create a Git worktree. Use alternate ports and `git show`/`git diff` for historical inspection.
- Put temporary investigation artifacts under `./.scratch/`, remove artifacts created for the task before finishing, and keep generated files generated from their source.

## Completion Report

- State what changed and why, the root cause when known, and the affected layers when useful.
- Report `Primary signal status` and exact `Secondary signal status`; disclose failures, missing coverage, migrations, rollout notes, docs status, and remaining risks.
- When the change is ready, include a concise suggested commit message. Do not declare done while directly coupled layers remain inconsistent.
