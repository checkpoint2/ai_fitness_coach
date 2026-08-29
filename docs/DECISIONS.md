# Product Decision Log

This compact log records significant owner-approved and genuinely open decisions. Detailed scope
remains in `CHECKLIST.md`, screen behavior in `MOBILE_PILOT_UX.md`, AI behavior in `AI_COACH.md`, and
architecture in `ARCHITECTURE.md`.

## Active Decisions

| ID | Status | Date | Area | Decision | Detailed source | Revisit when |
| --- | --- | --- | --- | --- | --- | --- |
| `D-0001` | ACTIVE | 2026-08-29 | Positioning | Public positioning is “Персональный AI-тренер по тренировкам, питанию и трансформации тела”; “AI body transformation system” is an internal category description only. | [CHECKLIST: Product](../CHECKLIST.md#2-product) | Explicit owner repositioning |
| `D-0002` | ACTIVE | 2026-08-29 | Product | The four independent goals are fat/weight loss, muscle gain, recomposition, and maintenance; the product serves men and women and is not reduced to weight loss. | [CHECKLIST: Pilot scope and delivery order](../CHECKLIST.md#pilot-scope-and-delivery-order) | Explicit owner product-direction change |
| `D-0003` | ACTIVE | 2026-08-29 | Onboarding | Pilot onboarding is hybrid and progressive: structured fields, free text, voice, editable AI extraction, targeted missing questions, confirmation, backend save, and a complete manual fallback. | [Mobile UX: Первый запуск](MOBILE_PILOT_UX.md#3-первый-запуск) | Evidence of unacceptable friction or explicit owner change |
| `D-0004` | ACTIVE | 2026-08-29 | UX | Primary surfaces are insight-first: interpretation and the next useful action take priority over a wall of collected metrics. | [Mobile UX: Принципы опыта](MOBILE_PILOT_UX.md#1-принципы-опыта) | Explicit owner UX-direction change |
| `D-0005` | ACTIVE | 2026-08-29 | Navigation | Mobile uses five primary tabs: Сегодня, План, Дневник, Тренер, Прогресс; profile opens through the avatar. | [Mobile UX: Основная навигация](MOBILE_PILOT_UX.md#2-основная-навигация) | Explicit owner navigation change |
| `D-0006` | ACTIVE | 2026-08-29 | Memory | Persistent personal memory is mandatory in the pilot; PostgreSQL, not chat history, is the source of truth and corrections/deletions affect later AI use. | [CHECKLIST: AI interaction and persistent memory](../CHECKLIST.md#ai-interaction-and-persistent-memory) | A measured PostgreSQL limitation plus owner approval |
| `D-0007` | ACTIVE | 2026-08-29 | AI control | Significant goals, plans, and AI-proposed changes require user confirmation; AI may report saved only after a successful backend commit. | [AI Coach: Context And Persistent Memory](AI_COACH.md#context-and-persistent-memory) | Explicit owner change that preserves data integrity |
| `D-0008` | ACTIVE | 2026-08-29 | Today | The energy card is informational, uses recorded intake and approximate expenditure relative to the confirmed daily target, and links explicitly to the Progress calendar. | [Mobile UX: Энергетическая плашка](MOBILE_PILOT_UX.md#51-энергетическая-плашка) | Evidence or owner-approved change to energy logic |
| `D-0009` | ACTIVE | 2026-08-29 | Access | The first pilot is free. Dormant native subscriptions stay off; product modules will depend on a future server-owned access policy rather than store SDK state. | [CHECKLIST: Pilot scope and delivery order](../CHECKLIST.md#pilot-scope-and-delivery-order) | Owner approves monetization activation |
| `D-0010` | ACTIVE | 2026-08-29 | Privacy | Photos are private; AI analysis is a separate voluntary action with specific consent, Russian processing, no provider training, and defined deletion requirements. | [CHECKLIST: Photos, privacy, and deletion](../CHECKLIST.md#photos-privacy-and-deletion) | Explicit owner privacy change subject to law and safety |

## Open Decisions

| ID | Status | Date | Area | Open decision | Detailed source | Resolve before |
| --- | --- | --- | --- | --- | --- | --- |
| `O-0001` | OPEN | 2026-08-29 | AI providers | Select the LLM provider and its Russian pilot processing path. | [Architecture: Planned AI Coach And Persistent Memory](ARCHITECTURE.md#planned-ai-coach-and-persistent-memory) | Implementing AI-backed coach responses |
| `O-0002` | OPEN | 2026-08-29 | Voice | Select speech recognition; cloud TTS and continuous realtime conversation remain outside the pilot. | [CHECKLIST: Voice](../CHECKLIST.md#voice) | Implementing voice onboarding or input |
| `O-0003` | OPEN | 2026-08-29 | Images | Select technical food-vision and body-photo-analysis paths that keep real pilot photos in the approved Russian contour. | [CHECKLIST: Photos, privacy, and deletion](../CHECKLIST.md#photos-privacy-and-deletion) | Implementing either photo-analysis flow |
| `O-0004` | OPEN | 2026-08-29 | Evidence | Review, revise, or withdraw the five preliminary pilot numeric settings. | [Evidence: Pilot Settings Awaiting Review](EVIDENCE.md#pilot-settings-awaiting-review) | Treating any setting as an active fitness rule |
