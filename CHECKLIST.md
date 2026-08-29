# Install Checklist

This file is the intake record for this repository. The installing agent fills it in during first-run setup and keeps it current afterwards.

**For the agent:** ask the questions below in the user's language, in product terms, and write the answers into this file as you go. Do not start feature work until everything through _First-version capabilities_ and every conditional section activated by those answers is completed. Never ask the user anything under _Decided by the agent_ - make those calls yourself and explain them in product terms.

**For the product owner:** this is the record of what was decided about your project. If something here is wrong, say so - the agent treats this file as the source of truth for what your product needs.

Answer cells hold `_unanswered_` until the question is asked, and `n/a` when the question cannot apply to this project. Answers are written in the product owner's language, but the section headings and the capability-ledger state words stay in English: other documents refer to them by those exact names. Keep every section heading, even when its rows are all `n/a`.

**When working on the template itself** (not installing it for a project), there is nothing to record: leave every answer cell at `_unanswered_` and every checkbox unchecked - those would otherwise ship to each future install. The capability ledger is the exception: it always describes the current branch, so keep it current when template work adds or removes a capability.

**Install status:** `completed 2026-08-29`
<!-- Set to: not started | in progress | completed YYYY-MM-DD -->

---

## 1. Project identity

| Question                                                        | Answer       |
| --------------------------------------------------------------- | ------------ |
| New project from this template, or work on the template itself? | Новый самостоятельный продукт AI Fitness Coach. Это не доработка исходного шаблона и не PR его автору. |
| Project name / slug                                             | AI Fitness Coach / `ai_fitness_coach`. Для локальной разработки используется временный mobile ID `com.example.aifitnesscoach`; постоянные Apple/Google ID и владелец Expo будут назначены на этапе подготовки сборок. |
| Your own GitHub repository URL, if you have one                 | https://github.com/checkpoint2/ai_fitness_coach. Подключён как локальный `origin`; ветка `mobile` опубликована и отслеживает `origin/mobile`. |

If no GitHub destination is chosen, the repository is left without `origin` and publishing stays unconfigured. The template remote is detached during setup unless this checkout is explicitly for improving the template.

## 2. Product

| Question                                                  | Answer       |
| --------------------------------------------------------- | ------------ |
| What product do you want to build first?                  | Мобильный персональный AI-тренер по тренировкам, питанию и трансформации тела для мужчин и женщин. Он поддерживает снижение веса/жира, набор мышечной массы, рекомпозицию и поддержание формы, подтверждает план с пользователем, сопровождает день живым дружеским языком, принимает записи текстом, фото и голосом, хранит постоянную память и анализирует прогресс. Первый закрытый пилот бесплатный, рассчитан на iOS и Android и не является медицинской услугой. |
| What is the first user journey that must work end to end? | Аккаунт → гибридный onboarding со структурированными полями, свободным текстом или голосом → редактируемый AI-черновик и подтверждение важных значений → цель и подтверждённый план → экран «Сегодня» с информационной плашкой энергетического баланса, планом и следующими действиями → запись питания и тренировки → сохранение и исправление истории после нового входа/перезапуска → недельный разбор при достаточных данных. Полноценный ручной путь и постоянная память реализуются первыми; голос, фото еды и добровольный AI-анализ фото тела входят в тот же первый пилот. |

## 3. Active surfaces

Mark what is active now, and set the install status to `in progress` as soon as this section is answered. From then on, everything unmarked is deferred and must be left alone: no features, no setup, no test flows. While the status is still `not started` nothing has been decided yet, so unmarked boxes mean "not asked", not "forbidden".

- [x] `backend` - API, database, auth
- [ ] `webapp` - browser screens behind sign-in (no SEO)
- [ ] `website` - public pages that must rank in search or preview when shared
- [x] `mobile` - Expo app (lives on the `mobile` branch; switch branches before setup)

| Question                                                                                                             | Answer       |
| -------------------------------------------------------------------------------------------------------------------- | ------------ |
| Why the unmarked surfaces are deferred, if it needs explaining                                                       | `webapp`, `website` и административная веб-панель сохраняются в репозитории и дорожной карте, но не настраиваются и не развиваются для первого пилота. Активный продуктовый путь — mobile + backend. |
| If `mobile` is active: are Expo/EAS builds, Expo Push, and Maestro E2E needed now, or left unconfigured until later? | Development builds и проверка ключевых сценариев нужны на iOS и Android до допуска к пилоту; Maestro E2E также нужен. Expo Push и Apple/Google social sign-in пока остаются выключенными. EAS cloud builds, реальный Expo owner и project ID настраиваются только на этапе сборок. |

The split between `webapp` and `website` is the agent's call, not the user's; `README.md` explains how to route a feature between them.

## 4. First-version capabilities

Ask about product needs, not implementations. Mark what the first version actually needs, then fill the row below even when nothing was ticked, so a later session can tell "asked, and the answer was no" from "not asked yet".

- [x] Accounts / sign-in
- [x] Saved data that survives a restart
- [x] File, image, or media uploads → also answer _Files, images, and media_
- [ ] Paid subscriptions or one-off payments → also answer _Payments_
- [ ] Admin tools or roles
- [x] External integrations (which: AI-провайдеры для текста, изображений и распознавания речи выбираются до интеграции с учётом обработки в России, запрета обучения и удаления данных; безопасная продуктовая аналитика подключается отдельно)
- [ ] Real-time chat, presence, collaboration, or live updates

| Question                                                                                          | Answer       |
| ------------------------------------------------------------------------------------------------- | ------------ |
| What the first version explicitly should NOT do (write "nothing ruled out" if that is the answer) | Не ставить диагнозы и не назначать лечение; не обещать точную калорийность или состав тела по фото; не менять цели и планы без подтверждения; не делать фото публичными; не давать AI произвольный SQL или доступ к чужим данным; не принимать оплату и не требовать карту в бесплатном пилоте. Push, social sign-in, web/admin-поверхности, общение пользователей, часы/браслеты, маркетплейс тренеров, социальная лента, облачный голос и разговор с AI в реальном времени отложены, но сохранены в дорожной карте. |

## 5. Files, images, and media

This project ships private file storage with user avatars, so answer these for the files your product adds on top; otherwise mark the rows `n/a`. Keep the section either way - `docs/STORAGE.md` sends the agent here when uploads are added later.

| Question                                                                                      | Answer       |
| --------------------------------------------------------------------------------------------- | ------------ |
| What do users upload?                                                                         | Фото еды и этикеток; добровольные фото тела для сравнения прогресса и AI-анализа. Голос используется для вопросов и ввода данных, но исходное аудио после распознавания не хранится. Аватар остаётся baseline-примером шаблона, а не реализацией продуктовых фото-сценариев. |
| Public, private, shared with selected people, or mixed?                                       | Только приватные. Фото не становятся публичными и не используются в маркетинге. Передача AI для конкретного анализа требует отдельного понятного согласия. |
| Who can upload, view, replace, and delete?                                                    | Пользователь управляет своими файлами. Администраторы приложения и поддержка не видят фото. Технический оператор может получить доступ только в исключительной аварийной ситуации; доступ ограничивается и журналируется. AI получает фото только после отдельного согласия на конкретный анализ. |
| Maximum file size and allowed file types                                                      | В первом пилоте нужны изображения, но не видео, PDF или произвольные файлы. Точные лимиты и поддерживаемые форматы должны быть технически проверены до реализации; API обязан проверять реальный тип, декодирование и размер, а HEIC/HEIF при необходимости преобразуется на устройстве. |
| Do images need thumbnails, resizing, format conversion, compression, cropping, or moderation? | Да: нормализация, удаление EXIF/геоданных, уменьшение и сжатие с сохранением читаемости этикеток. Фото тела нельзя ретушировать, «улучшать» или искажать по пропорциям. Производные изображения наследуют приватность и правила удаления оригинала. |
| How long do files live after the owning record is deleted?                                    | После удаления они сразу исчезают из интерфейса; оригиналы, производные файлы, AI-результаты и задания удаляются из активных систем максимум за 24 часа, из резервных копий — максимум за 30 дней. Удаление аккаунта применяет те же правила ко всем данным пользователя и AI-памяти. |
| Should filenames be visible to users, or opaque?                                              | В хранилище используются непрозрачные идентификаторы без имени и email. В интерфейсе показываются назначение и дата, а не внутренний путь или исходное имя. |

## 6. Website data and freshness

Answer these when `website` is active; otherwise mark the rows `n/a`. Keep product choices here and
follow the implementation contract in `docs/WEB_SURFACES.md`.

| Question                                                                                    | Answer       |
| ------------------------------------------------------------------------------------------- | ------------ |
| Which public product or content data comes from the backend/database at website build time? | n/a — `website` отложен. |
| How soon after that data changes must the public website show the change?                   | n/a — `website` отложен. |
| Which changes require an automatic rebuild/redeploy rather than a manual release?           | n/a — `website` отложен. |

The default is Astro SSG. Database-backed public data is fetched while building static output. If
published database changes must appear automatically, implement the documented `website:rebuild`
outbox path. SSR or request-time rendering is an exception recorded here only when the required
freshness or personalization cannot be met by rebuild/redeploy.

## 7. Payments

Answer these only when payments are active above; otherwise mark the rows `n/a`. Keep the section either way, and replace the `n/a` answers if payments are added later.

| Question                                                                                                                    | Answer       |
| --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| What exactly do users pay for?                                                                                              | В первом закрытом пилоте — ни за что. Пилот бесплатный; цена и состав будущего платного предложения пока не утверждены. |
| Recurring subscription, one-off purchase, or both?                                                                          | Сохраняется существующая выключенная основа для будущих подписок. Разовые покупки не добавляются без отдельной продуктовой потребности. В пилоте нет оплаты, автопродления и запроса карты. |
| Does the public website need a local cart or offer selection before registration/sign-in?                                   | n/a — `website` и браузерные продажи отложены. |
| Which active surfaces need payment: browser checkout, App Store / Google Play, native card entry, Apple Pay, or Google Pay? | Сейчас ни одна. Существующий App Store / Google Play IAP сохраняется выключенным как основа будущего подключения; браузерный обход и собственный ввод карты не добавляются. |
| What stops working when someone does not pay?                                                                               | В бесплатном пилоте отсутствие покупки ничего не блокирует. Серверная политика доступа выдаёт права участнику пилота независимо от IAP. Будущий состав платных функций ещё не выбран; просмотр и удаление собственных данных нельзя связывать с оплатой. |

Whatever this project ends up with, the ledger below is what states it. Read `docs/WEB_SURFACES.md`
before implementing any payment surface. Browser checkout is built in authenticated `webapp` plus
the backend; `website` may pass a local cart but never owns a second payment flow. The `mobile`
template line ships App Store and Google Play subscriptions as working code that is switched off,
and may independently add policy-compliant card, Apple Pay, or Google Pay flows when the product
needs them. Declining a shipped payment capability means deleting its code during setup and
recording it as `removed`. Payments are never half-present and are never reintroduced on a guess.

## 8. Deployment

| Question                                                                                     | Answer       |
| -------------------------------------------------------------------------------------------- | ------------ |
| Is deployment needed now, or local-only for the moment?                                      | Сейчас только локальная подготовка и тестовые данные. Облачное развёртывание и удалённый пилот требуют отдельной задачи и разрешения. |
| Where are your users, and must the data stay in Russia?                                      | Первый рынок и участники пилота — Россия. Персональные данные и фотографии должны храниться в России; реальные фото нельзя передавать зарубежному AI-провайдеру без отдельного согласованного решения. Для разработки используются синтетические изображения. |
| Hosting, picked by the agent from the answer above: DigitalOcean / Yandex Cloud / own server | Yandex Cloud — направление для будущего российского запуска по правилу шаблона; инфраструктура пока не создаётся. |
| Production domains / URLs for API, webapp, and website; is Yandex CDN needed now?            | n/a — production и домены сейчас не настраиваются. |
| Which surfaces are released first                                                            | При отдельном разрешении на пилот первыми выпускаются `backend` и `mobile`; `webapp` и `website` остаются отложенными. |

**Ask the audience question, not the provider question.** A product owner knows where their users
are and whether data must stay in Russia; they should not be asked to compare clouds. The agent
picks the hosting from that answer:

| Hosting      | Chosen when                                                                        | What the template gives you                                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DigitalOcean | Default for an audience outside Russia.                                            | Terraform creates App Platform API/static sites, a scheduler worker, migration gate, Managed PostgreSQL, DOCR, private media Spaces, and remote state. Release everything with `bun run release -- digitalocean`. |
| Yandex Cloud | Users in Russia, or data must stay there.                                          | Terraform creates Serverless Containers/timers, Managed PostgreSQL, API Gateway, static and private media Object Storage, remote state, and opt-in CDN. Release everything with `bun run release -- yandex`.      |
| Own server   | Full control wanted, no vendor lock-in, and someone is willing to run the machine. | The same Docker image plus the in-repo scheduler, with a short runbook in the "Own Server" section of `docs/DEPLOYMENT.md`. No release script: you own TLS, backups, updates, and monitoring.                     |

Pick exactly one and record it above. In an installed project, delete the unused provider directory
under `infra/` and its provider runbook rather than keeping a second possible production state.
Keep `scripts/infra.mjs` and `docs/DEPLOYMENT.md`: they own the shared safety/release contract. An
own-server project deletes both provider directories and runbooks. Local development never requires
cloud credentials regardless of the choice.

Deployment is often deferred at install time, which leaves these rows `_unanswered_`. When the user later asks to deploy, ask the unanswered questions then and write the answers back here before following `docs/DEPLOYMENT.md`.

## 9. Decided by the agent - do not ask the user

The user is a product owner, not an engineer. These are engineering decisions the agent owns, makes, and explains only in product terms:

- Which browser surface a feature belongs to (`website` for SEO/public, `webapp` for behind-login).
- Which email provider the recorded hosting implies: Yandex Cloud means Postbox, anything else means Resend. Ask where the users are, not which mail service the owner prefers.
- SSG plus build-time backend data and rebuild/redeploy for public product information unless a recorded freshness or personalization need requires runtime rendering.
- One browser checkout in authenticated `webapp`; `website` may hand off a local cart but never owns payment. Mobile payment UI stays native and separate.
- Monolithic backend; no microservices during setup.
- Docker Compose for local PostgreSQL on every OS; never a native install unless the user insists.
- Astro for `website`; Next.js only if Vercel-style ISR is a stated product requirement.
- The selected Terraform launch profile, machine sizes, serverless/static shape, and when an HA or CDN upgrade is justified.
- Which hosting the recorded audience implies: Russia means Yandex Cloud, elsewhere means DigitalOcean, and an explicit wish for full control means an own server. Explain the pick in product terms; never ask the owner to compare providers.
- Managed Redis-compatible Pub/Sub only when real-time needs to scale across instances.
- Test boundaries: E2E for important user journeys, integration for API/auth/persistence, unit for pure rules.
- Libraries, file layout, naming, refactors, and validation scope.

## 10. Capability ledger

What this project actually contains. The agent updates it whenever a capability is added or removed. Every row carries exactly one state:

- `included` - present and expected to work.
- `available` - partly there but not usable yet; the note says exactly what is still missing, which may be configuration, routes, or UI.
- `absent` - not part of this project. Build it only after the product owner asks.
- `removed` - deliberately deleted during setup. **Do not re-add it.** A leftover reference, migration, or doc mention is not a product requirement; ask the product owner first.

A capability with no row is `absent` by default. Add the row instead of assuming. The State column always holds one of the four states above - never `_unanswered_` or `n/a`.

| Capability                      | State    | Note                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth (email + password)         | included | Template baseline.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Admin roles                     | included | Roles and seeding in `backend`; admin UI in `webapp`.                                                                                                                                                                                                                                                                                                                                                                |
| Password reset email delivery   | included | Two providers behind one port, Yandex Cloud Postbox and Resend, selected by `EMAIL_DELIVERY`. It defaults to `disabled`, so a fresh install sends nothing and queues nothing; `console` prints messages locally. Delivery is durable: a request queues a `task_outbox` row and the shipped scheduler drains it every minute. Production needs an account with a provider and a deployed runner. See `docs/EMAIL.md`. |
| File/media storage              | included | Private uploads end to end on both clients, with user avatars as the worked example. Stores on local disk by default and on any S3-compatible bucket via `PRIVATE_STORAGE_*`, with no code change between them. See `docs/STORAGE.md`.                                                                                                                                                                              |
| Infrastructure as code          | included | Provider-specific Terraform bootstrap, foundation, migration/runtime, and static roots cover DigitalOcean and Yandex Cloud, with remote state, guarded plan/apply, migration-gated immutable releases, media storage, static hosting, and jobs. `scripts/infra.mjs` is the one operations entry point. See `infra/README.md` and `docs/DEPLOYMENT.md`.                                                               |
| Static asset precompression     | included | `bun run static:precompress` writes `.br` and `.gz` next to the text assets in `webapp/dist` and `website/dist`, using `node:zlib` and no dependency. It is own-server tooling: hosted releases do not upload those sidecars and use their edge/runtime compression when available.                                                                                                                                  |
| Storybook component catalogs    | included | Separate local React/Vite catalogs cover every `src/components/ui` module in `webapp` and `website`, with official docs/a11y addons and story-only composition examples. They are not deployed; Astro sections remain outside Storybook and the website stays static SSG.                                                                                                                                       |
| Website build-time backend data | absent   | The baseline landing content is repository-owned; add a shared public DTO and build fetch only when `website` needs database-backed information.                                                                                                                                                                                                                                                                     |
| Automatic SSG rebuild           | absent   | Durable desired/published revision state, single-flight deployment reconciliation, immutable atomic/blue-green release promotion, public-marker verification, and a provider adapter are not implemented. Yandex additionally needs a separate builder/upload component. See `docs/WEB_SURFACES.md`.                                                                                                                 |
| Website cart handoff            | absent   | No local cart or cross-origin handoff exists. When activated, it feeds the one authenticated browser checkout defined in `docs/WEB_SURFACES.md`.                                                                                                                                                                                                                                                                      |
| Browser checkout / payments     | absent   | No browser checkout or payment code exists. Build it in `webapp` plus the backend, never in `website`; native store subscriptions remain the separate mobile path below.                                                                                                                                                                                                                                            |
| Payments / subscriptions        | available | App Store and Google Play subscriptions are implemented but switched off: tables are commented out and routes are unmounted. Turn on or delete them per `docs/IAP.md`.                                                                                                                                                                                                                                             |
| Push notifications              | available | Expo Push is wired but inert until the installed project has an EAS project ID and configured credentials. The shared schedule includes delivery/receipt processing; `ENABLE_TEST_PUSH` remains off by default.                                                                                                                                                                                                     |
| Social sign-in (Apple / Google) | available | Implemented but switched off: the route is not mounted and the buttons are not rendered. Turn on or delete per `docs/SOCIAL_AUTH.md`.                                                                                                                                                                                                                                                                                 |
| Real-time / WebSockets          | absent   | Отложено после первого пилота; идея общения пользователей сохранена в дорожной карте.                                                                                                                                                                                                                                                                                                                                |
| Background jobs                 | included | Jobs live in `backend/src/jobs.ts`. The mobile schedule runs task-outbox and push processing every minute, upload cleanup hourly, and combined auth/notification maintenance every 15 minutes. Terraform deploys that scheduler as a DigitalOcean worker and the same executor in Yandex HTTP job containers/timer triggers; own servers run it under a supervisor. `workerLoops` stays empty. See `docs/BACKGROUND_JOBS.md`. |
| Durable task outbox             | included | `task_outbox` in PostgreSQL with handlers in `backend/src/outbox/handlers.ts`, drained by `outbox:drain`. Ships with the password-reset emails as its only producers, and stays empty until something enqueues. Adding a task type is a code change, never a migration.                                                                                                                                              |
| AI fitness domain               | absent   | Требуется для первого пилота; питание, тренировки, цели, планы и прогресс ещё не реализованы.                                                                                                                                                                                                                                                                                                                         |
| Hybrid onboarding               | absent   | Обязателен в первом пилоте: структурированные поля, свободный текст и голос создают редактируемый черновик; важные значения подтверждаются до записи backend, а ручной путь работает без микрофона и AI. Реализация ещё не начата.                                                                                                                                                                                       |
| Persistent user memory          | absent   | Обязательна в первом пилоте. PostgreSQL хранит профиль, цели, предпочтения, версии планов, питание, тренировки и замеры с датой, происхождением и отделением подтверждённых фактов от AI-оценок. Реализация ещё не начата.                                                                                                                                                                                                |
| Today dashboard                 | absent   | Обязателен в первом пилоте. Энергетический баланс — информационная плашка сверху; основное содержание — план, живое обращение тренера и следующие действия на день.                                                                                                                                                                                                                                                     |
| AI coach and contextual advice  | absent   | Обязательны отдельный чат «Тренер», короткие советы на основных экранах и контекстные подсказки. Значимые данные сохраняются только после подтверждения и успешной записи backend.                                                                                                                                                                                                                                     |
| Nutrition and food-photo input  | absent   | Обязательны ручной ввод и фото-ввод с подтверждением оценки пользователем. Аватарный upload не является реализацией распознавания еды.                                                                                                                                                                                                                                                                                |
| Training plans and history      | absent   | Обязательны подтверждённый план, действия на сегодня и история тренировок.                                                                                                                                                                                                                                                                                                                                           |
| Measurements and weekly review  | absent   | Обязательны замеры, история прогресса и недельный разбор только при достаточных данных.                                                                                                                                                                                                                                                                                                                               |
| AI body-photo analysis          | absent   | Обязателен и доброволен в первом пилоте. Нужны отдельное согласие, сравнимость снимков, ограниченные честные выводы, российская обработка и проверенные правила приватности/удаления.                                                                                                                                                                                                                                    |
| Voice input and spoken replies  | absent   | В пилоте обязателен голосовой ввод с проверкой распознанного текста; исходное аудио не хранится. Ответы AI можно необязательно озвучить системным голосом устройства. Облачный голос и разговор в реальном времени отложены.                                                                                                                                                                                             |
| Product access policy           | absent   | Бесплатный пилот должен работать без IAP через единую серверную политику доступа; будущая проверенная подписка станет другим основанием доступа без переписывания продуктовых модулей.                                                                                                                                                                                                                                  |
| Product analytics               | absent   | Подключается отдельно только с безопасной схемой событий без фото, дневников, промптов, AI-ответов, email и медицинских ограничений.                                                                                                                                                                                                                                                                                   |
| Wearable integrations           | absent   | Часы и фитнес-браслеты отложены, но сохранены в дорожной карте.                                                                                                                                                                                                                                                                                                                                                       |
| Coach marketplace               | absent   | Маркетплейс живых тренеров отложен, но сохранён в дорожной карте.                                                                                                                                                                                                                                                                                                                                                     |
| User social features            | absent   | Общение пользователей и публичная социальная лента отложены, но сохранены в дорожной карте.                                                                                                                                                                                                                                                                                                                          |

## 11. Environment checks

Verified by the agent during setup, not asked.

- [x] `docker compose version` and `docker info` succeed (needed for backend/API, uploads, or DB-backed validation)
- [x] `git remote -v` inspected; template remote detached unless contributing to the template
- [x] App-local `.env` files created from `.env.example`, with a locally generated `JWT_SECRET` (never committed)
- [x] Smallest meaningful validation run for the active surfaces — pristine `mobile` template published gate passed on 2026-08-28 before this intake edit
- [x] Installed-project validation passed on 2026-08-29: checklist, architecture and infrastructure checks, dependency audit, backend/mobile typechecks, mobile lint, contracts/backend/mobile tests, backend integration tests, and Maestro policy audit

## 12. After setup

- [x] Durable answers above filled in, install status set to `completed 2026-08-29`
- [x] Validation scope recorded for this project: always run `template:check` and `architecture:check`; for ordinary active-surface work run affected contracts, backend or mobile typecheck/tests and mobile lint; run backend integration for persistence/auth/API changes and Maestro policy audit plus the relevant flow for mobile E2E changes; run dependency audit when dependencies or the lock-file change
- [x] Project renamed to package `ai-fitness-coach`, workspace scope `@ai-fitness-coach`, database `ai_fitness_coach`, and Expo slug `ai-fitness-coach`; `bun.lock` regenerated
- [x] Deferred-surface notes added to the READMEs of surfaces that are not active
- [x] `Bootstrap-Only Instructions` blocks deleted from `AGENTS.md` and `CLAUDE.md`
- [x] Local URLs and remaining manual authorizations recorded: backend `http://localhost:3000`, Metro `http://localhost:8081`; permanent store IDs, Expo owner/EAS project, and store accounts wait until the build stage

`README.md`, `AGENTS.md`, `CLAUDE.md`, and some `docs/` runbooks route agents into this file by section name, so renaming a heading breaks those pointers silently. Add rows and sections a project needs, and cross-reference sections by name rather than by number so renumbering stays harmless.

## 13. AI Fitness Coach product decisions

### Pilot scope and delivery order

The first pilot includes accounts, onboarding, goals, confirmed plans, the Today dashboard, nutrition,
training, measurements, persistent memory, weekly review, AI coach chat, voice input, food-photo
estimation, and voluntary AI body-photo analysis on both iOS and Android. Build the reliable manual
path and persistent memory first, then add voice and image-assisted input without removing them from
the first-pilot scope.

Onboarding is hybrid and progressive. Structured fields, free text, and voice are equal pilot inputs:
natural input becomes an AI-extracted structured draft, the user can edit it, the product asks only
for materially missing data, and important values are confirmed before the backend saves them. A
complete manual path remains available when the microphone is refused or AI is unavailable. Original
audio is not retained. Continuous real-time voice and cloud TTS remain deferred.

[`docs/ONBOARDING.md`](docs/ONBOARDING.md) is the approved, not-yet-implemented exact contract for
first-launch fields, branches, states, extraction, confirmation, and source-draft retention. It does
not change the `absent` capability states in the ledger.

The first-launch body-goal choices explicitly include weight/fat loss, maintaining form, muscle gain,
and body recomposition. Recomposition is a separate goal: do not silently map it to maintenance or
force a fixed calorie deficit. Its plan combines strength training, an appropriate nutrition target,
and progress assessment across weight trend, measurements, strength results, and optional comparable
photos. The product explains the proposed starting strategy and applies it only after the user confirms
the plan.

The pilot is free. Keep the existing native subscription implementation switched off and design
product modules against one server-owned access policy rather than Apple/Google SDK state. Turning on
payments later must not require rewriting nutrition, training, progress, or memory modules.

### Today dashboard and coach voice

The approved mobile screen hierarchy, navigation, states, and user flows are specified in
[`docs/MOBILE_PILOT_UX.md`](docs/MOBILE_PILOT_UX.md). It is a product contract, not evidence that the
capabilities marked `absent` below have been implemented.

The Today screen helps the user understand what to do today. Its energy balance is an informational
card at the top, not the whole screen. The main content is the current plan, the next useful action,
training or recovery status, nutrition actions, reminders, progress context, and access to the AI
coach.

The energy card shows recorded intake, approximate expenditure, current energy balance, the selected
daily target, remaining calories or overage, and a preliminary day status:

`Current energy balance = recorded intake - approximate expenditure`
`Remaining = confirmed daily target - recorded intake`

Expenditure never replaces the target, and exercise calories are not automatically added back into
the target. Missing food records mean incomplete data, not zero intake. Negative remaining calories
are shown as an overage rather than clamped to zero. Day boundaries follow the user's timezone and
the value is recalculated after edits or deletions.

The card is an explicit shortcut to the energy calendar in `Progress`: its whole surface is tappable
and it includes a visible calendar/history label. The calendar is also permanently discoverable at
the top of the `Progress` tab. Opening the card selects today; selecting a past day explains its
color from the nutrition, activity, completeness, uncertainty, and plan version recorded for that
date. Current-day color is preliminary until nutrition and activity are confirmed complete.

The product speaks to the user as a supportive, confident friend: informal Russian `ты`, light humor,
no crude or artificial slang, shame, pressure, or invented achievements. Messages vary by context
such as training, recovery, missing data, progress, or returning after a break, but stay stable within
the same day/situation instead of changing randomly on every render. A lively phrase must still lead
to a concrete next action.

### AI interaction and persistent memory

AI behavior, evidence-dependent rules, and durable owner decisions are defined without duplication in
[`docs/AI_COACH.md`](docs/AI_COACH.md), [`docs/EVIDENCE.md`](docs/EVIDENCE.md), and
[`docs/DECISIONS.md`](docs/DECISIONS.md).

Use a hybrid AI experience: short advice on primary screens, a dedicated full chat named `Тренер`,
and contextual help inside nutrition, training, and progress. A new chat, login, or app restart does
not erase what the application has already saved.

PostgreSQL is the source of truth, not conversation history. Persist the user's profile, goals,
preferences, active and historical plans, nutrition, workouts, and measurements. Every record has a
date and provenance; confirmed user facts are distinct from AI estimates and interpretations.

The backend builds a bounded context for the authenticated user. Identity comes from the authorized
session, never a model-provided `userId`. AI receives no arbitrary SQL interface and no path to
another user's data. Separate memory services are not added without a measured PostgreSQL limitation,
an explanation, and product-owner approval.

Users can inspect and correct saved information. Edits and deletions must affect later answers,
summaries, derived results, and caches. Significant goal or plan changes require explicit
confirmation. AI may say that something was saved only after the backend successfully commits it.
Account deletion includes persistent memory and derived AI data.

Required tests cover persistence across sessions/restarts, freshness after edits and deletions,
cross-user isolation, rejection of a supplied/forged user id, confirmation of significant changes,
and failure paths where a write does not complete.

### Voice

The first pilot supports voice questions and voice entry for nutrition, training, measurements, and
notes. Show the transcription and let the user correct it before important data is saved. Do not keep
the original audio after recognition. Text remains the canonical AI response; the user may explicitly
play it through the device's system voice. Do not speak unexpectedly. Cloud TTS and continuous
real-time voice conversation remain roadmap items.

Voice processing follows the same Russia residency, no-training, deletion, session scoping, and
confirmation rules as text and images.

The LLM, speech recognition, photo analysis, food vision, and cloud TTS providers are open technical
decisions. No provider is implied by the template. Pilot processing must preserve Russian data
residency, cross-user isolation, provider no-training terms, deletion requirements, authenticated
backend scoping, and the manual fallback described above.

### Photos, privacy, and deletion

Food/label photos and body photos are separate purposes with separate user understanding. Body photos
are voluntary; refusing upload or AI analysis does not block journals, workouts, measurements, or
other progress tracking. AI analysis requires a specific consent action and must distinguish visible
observations, journal facts, and interpretation.

Do not claim medical diagnosis, exact body-fat percentage, guaranteed muscle gain, attractiveness,
or calibrated numeric certainty that the product has not validated. Check whether comparison photos
are sufficiently similar in angle, lighting, distance, pose, and visibility; when they are not, say
that the trend is unreliable. Weight, measurements, and strength values come from saved records, not
image guesses. Photo analysis alone never changes a goal or plan.

Store personal data and photos in Russia. Until a separately approved decision, do not send real
photos to a foreign AI provider. Development uses synthetic images. Providers may not train models on
user photos or data.

Application administrators and support cannot view body photos through UI, API, exports, or logs.
Infrastructure operators may access them only for an exceptional incident under restricted,
auditable access. Use short-lived access paths and keep images, URLs, personal prompts, and AI output
out of ordinary logs and product analytics.

Deletion removes originals, derivatives, AI results, pending jobs, and persistent memory from active
systems within 24 hours and backups within 30 days. Prevent deleted data from being reprocessed by a
late job.

### Roadmap, not removed

The following ideas are deliberately deferred rather than rejected: Push notifications, Apple/Google
social sign-in, webapp and website surfaces, an administrative panel, user-to-user communication,
wearables, a live-coach marketplace, a public social feed, cloud branded voice, continuous real-time
voice conversation, and paid subscriptions. Each requires a separate product decision before it is
activated; none may be inferred from dormant template code.
