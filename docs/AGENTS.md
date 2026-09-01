# Documentation AGENTS.md

## Scope

- These rules apply under `docs/` in addition to the repository root instructions. Keep the peer agent instruction file in this directory equivalent.
- Documentation changes are product-contract changes when they alter approved behavior, scope, evidence, privacy, deployment, or operations. Preserve the owning document and its approval status.

## Source Ownership

- [`../CHECKLIST.md`](../CHECKLIST.md) owns intake answers, active/deferred capabilities, and durable project choices. Do not activate a capability by describing dormant code in another document.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) owns system boundaries and runtime design; [`TESTING.md`](TESTING.md) owns validation policy and runbooks; [`DEPLOYMENT.md`](DEPLOYMENT.md) plus the selected provider document own releases; [`STORAGE.md`](STORAGE.md) owns file-storage behavior.
- [`ONBOARDING.md`](ONBOARDING.md), [`AI_COACH.md`](AI_COACH.md), [`EVIDENCE.md`](EVIDENCE.md), [`DECISIONS.md`](DECISIONS.md), and [`MOBILE_PILOT_UX.md`](MOBILE_PILOT_UX.md) own their product contracts. Link to the owning section instead of copying its rules into a second document.
- Code, schemas, scripts, and runtime output are authoritative for implementation status. Update docs when those surfaces materially change, but do not mirror file inventories or self-evident implementation details.

## Editing And Validation

- Preserve exact distinctions between approved, active, implemented foundation, deferred, absent, and draft behavior. Do not turn proposed fitness guidance into a rule without the evidence and approval recorded in [`EVIDENCE.md`](EVIDENCE.md) and [`DECISIONS.md`](DECISIONS.md).
- Prefer stable heading-based relative Markdown links. When moving or renaming a heading, update every inbound reference, especially links from `README.md`, `CHECKLIST.md`, and agent files.
- Run `bun run template:check` after every documentation or instruction change. Inspect the final Markdown-only diff for duplicated policy, broken ownership, accidental product-code edits, and unintended changes to user work.
