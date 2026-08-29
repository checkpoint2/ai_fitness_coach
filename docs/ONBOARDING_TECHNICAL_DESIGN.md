# Onboarding And Persistent Memory — Technical Design

**Status:** IMPLEMENTATION IN PROGRESS / PRODUCT CAPABILITIES ABSENT

**Date:** 2026-08-29

Этот документ переводит утверждённый продуктовый контракт
[`ONBOARDING.md`](ONBOARDING.md) в план реализации. Он не меняет продуктовые поля, UX или
capability ledger, не выбирает AI/speech-провайдера и не утверждает формулу энергетических расчётов.
Общие архитектурные правила остаются в [`ARCHITECTURE.md`](ARCHITECTURE.md), а обязательная стратегия
проверок — в [`TESTING.md`](TESTING.md).

## Implementation Status

- **Stage 1 complete (2026-08-29):** shared Zod contracts, closed field registry, current-user request
  shapes, state-transition rules, readiness rules, and focused tests.
- **Stage 2 complete (2026-08-29):** Prisma models and generated migration for resumable drafts,
  versioned facts, goals, measurements, safety flags, plan envelopes, opt-in notes, and mutation
  receipts; user-scoped repositories; PostgreSQL tests for resume, idempotency conflicts,
  correction/supersession, isolation, and account-deletion cascade.
- **Stage 3 complete (2026-08-29):** authenticated current-user HTTP routes for snapshot, draft,
  pause/resume, atomic profile confirmation, evidence-limited plan envelope, exact plan-version
  confirmation, and completion; optimistic concurrency and idempotent replay; a purpose-bounded
  plan context builder; PostgreSQL API tests for isolation, retention, safety, failure, and resume.
- **Stages 4–7 not started:** no mobile onboarding screens, evidence-approved automatic plan content,
  AI provider, extraction, or speech provider exist. The backend flow alone is not a usable pilot.
- `Hybrid onboarding`, `Persistent user memory`, `AI fitness domain`, and `Voice` remain `absent` in
  `CHECKLIST.md` until their complete tested user journeys exist.

## 1. Acceptance Contract

Проектирование готово к реализации, если:

1. Подтверждённые сведения, черновик и производные AI-результаты имеют разные границы хранения.
2. Ни один API-контракт не принимает `userId` для выбора памяти текущего пользователя.
3. Повторная отправка, конфликт версий, закрытие приложения и ошибка backend имеют однозначное
   поведение.
4. Удаление, исправление и safety-флаг влияют на последующий контекст и план.
5. Ручной путь можно реализовать до выбора AI и speech-провайдеров.

Основной будущий сигнал готовности — полный ручной путь на iOS и Android: вход → возобновляемый
черновик → подтверждённый профиль → подтверждённый и сохранённый план → экран «Сегодня». Наличие
таблиц или отдельных API само по себе capability не активирует.

## 2. Архитектурное решение

Первый пилот остаётся модульным монолитом с PostgreSQL. Отдельный vector database, сервис памяти,
очередь или кэш не нужны.

- `onboarding` владеет незавершённым процессом, черновиком и переходами состояний;
- `fitness-profile` владеет подтверждёнными сведениями и предпочтениями;
- `fitness-planning` владеет версиями целей и планов;
- будущий `ai-coach` читает данные только через ограниченный context builder;
- провайдеры AI и распознавания речи подключаются через узкие backend-порты после отдельного выбора.

На первом этапе context builder читает актуальные данные непосредственно из PostgreSQL. Это делает
исправления и удаления видимыми сразу и не создаёт проблему протухшего кэша. Кэш допустим только после
измеренного ограничения; тогда каждая производная запись должна ссылаться на версии источников и
инвалидироваться при их изменении.

## 3. Модель данных

Эти сущности реализованы декларативно в `backend/prisma/schema/onboarding.prisma` и сгенерированной
миграции. Они являются persistence foundation, а не доказательством готового onboarding или памяти:
application orchestration, HTTP и mobile ещё отсутствуют.

### 3.1 `onboarding_runs`

Одна workflow-запись на пользователя. Пока процесс не завершён, она хранит возобновляемый черновик;
после завершения остаются только минимальный статус и даты, а draft и исходный рассказ очищаются.

| Поле | Назначение |
| --- | --- |
| `id` | UUIDv7 попытки |
| `user_id` | Владелец; FK с `ON DELETE CASCADE` |
| `status` | Состояние процесса из продуктового контракта |
| `resume_status` | Предыдущее состояние для выхода из `PAUSED` |
| `initial_entry_mode` | Первый выбранный путь: `STRUCTURED`, `TEXT` или `VOICE_TRANSCRIPT`; далее способы можно сочетать |
| `draft_schema_version` | Версия Zod-контракта черновика |
| `draft_payload` | JSONB только для непроверенных полей и их состояний |
| `source_narrative` | Временный полный текст или исправленная транскрипция; nullable |
| `source_kind` | `TEXT`, `VOICE_TRANSCRIPT` или `NONE` |
| `retention_choice` | `UNDECIDED`, `DELETE` или `SAVE_AS_COACH_NOTE` |
| `revision` | Целое число для optimistic concurrency |
| `created_at`, `updated_at` | Аудит жизненного цикла |
| `profile_confirmed_at`, `plan_confirmed_at`, `completed_at` | Доказательство переходов |

`draft_payload` не является постоянной памятью. Каждый read и write валидируется версионированной
Zod-схемой. После подтверждения профиля структурированные значения переносятся в предметные записи, а
draft очищается. Исходный рассказ удаляется в той же транзакции. Если пользователь отдельно выбрал
сохранение, полный показанный текст переносится в `coach_notes`, после чего поле черновика всё равно
очищается. Отсутствие отдельного выбора всегда разрешается как `DELETE`, а не как сохранение.

Аудио не имеет поля, object key или отдельной таблицы: backend не должен уметь сохранить исходный
аудиофайл.

### 3.2 `user_facts`

Атомарные подтверждённые сведения профиля и предпочтений, которые не принадлежат отдельному журналу.
Это PostgreSQL-реализация памяти, а не произвольная AI-memory.

| Поле | Назначение |
| --- | --- |
| `id`, `user_id` | Идентификатор и владелец |
| `fact_key` | Значение из закрытого registry полей, например `profile.height_cm` |
| `value_json` | Значение, проверенное схемой конкретного `fact_key` |
| `truth_kind` | `FACT`, `ESTIMATE`, `INFERENCE`, `HYPOTHESIS`; `UNKNOWN` строкой не сохраняется |
| `confirmation_state` | Для активной памяти только `CONFIRMED`; предыдущая версия становится `SUPERSEDED` |
| `source_kind` | `STRUCTURED`, `USER_TEXT`, `VOICE_TRANSCRIPT`, `AI_EXTRACTED_CONFIRMED`, `IMPORT` |
| `source_ref` | Необязательная ссылка на attempt/measurement, но не копия удалённого рассказа |
| `is_approximate` | Пользователь явно указал приблизительность |
| `observed_at`, `recorded_at`, `confirmed_at` | Когда факт относится к реальности, записан и подтверждён |
| `valid_from`, `superseded_at`, `supersedes_id` | История исправлений без тихого перезаписывания |

Ключи и типы задаются кодовым registry и shared contracts; клиент и модель не могут прислать
произвольный ключ. В каждый момент допускается только одна активная подтверждённая версия одного
однозначного факта пользователя. Исправление создаёт новую версию и supersede старую в транзакции.
Явное удаление пользователя физически удаляет все версии выбранного факта и зависимые производные
данные, а не оставляет их доступными AI как «историю».

`UNKNOWN` означает отсутствие активной строки плюс зафиксированный ответ в черновике, если важно не
переспрашивать в текущем onboarding. Значения «отказался сообщить» для года рождения и расчётного пола
хранятся отдельными подтверждёнными disclosure-фактами, а не фиктивным годом или полом.

### 3.3 Предметные записи

Данные с самостоятельным жизненным циклом не представлены только через `user_facts`:

| Сущность | Основные свойства |
| --- | --- |
| `fitness_goals` | Версии цели, приоритета и пользовательской формулировки; `PROPOSED`, `CONFIRMED`, `SUPERSEDED` |
| `body_measurements` | Вес и будущие замеры с датой, источником, приблизительностью и epistemic kind |
| `safety_flags` | Область `TRAINING`/`NUTRITION`, ответ, статус `UNRESOLVED`/`RESOLVED`, даты; без диагноза |
| `fitness_plans` | Неизменяемые версии плана: `DRAFT`, `CONFIRMED`, `ACTIVE`, `SUPERSEDED`; версия payload/evidence и ограничения |
| `coach_notes` | Только явно сохранённый пользователем исходный рассказ или будущая заметка; доступна пользователю для удаления |

Питание, тренировки и последующие замеры получат собственные журналы на соответствующих этапах.
Постоянная память строит контекст из этих предметных источников, а не дублирует их в общей таблице.

Во время onboarding подтверждённые поля цели, веса и safety-контекста также сохраняются как
версионированные per-field facts с точным provenance. Предметные записи остаются владельцами своего
жизненного цикла, а facts — подтверждённым снимком отдельных полей для bounded context. Обе формы
создаются одной транзакцией. Будущие исправления таких полей обязаны обновлять предметную запись и
её fact-проекцию через один owning use case; независимое редактирование одной копии запрещено.

План хранит структурированный versioned payload, но не получает точных calorie/sex/age-specific
значений до evidence-review. Safety-блоки хранятся отдельно от состояния onboarding и явно указывают,
какую автоматическую часть нельзя применить.

### 3.4 `onboarding_mutation_receipts`

Таблица защищает значимые команды от двойного применения при плохой сети или повторном нажатии.

- уникальный ключ: `(user_id, client_mutation_id)`;
- сохраняются тип команды, hash нормализованного запроса, итоговый resource revision и время;
- повтор того же ID с тем же hash возвращает прежний успешный результат;
- тот же ID с другим содержимым возвращает конфликт;
- receipts не содержат исходный рассказ, медицинский текст или provider payload.

Срок технического хранения receipts определяется перед реализацией в рамках общей политики удаления.
Удаление аккаунта каскадно удаляет их.

## 4. Backend Boundaries

### 4.1 Модульные границы

Рекомендуемые backend-контексты:

- `backend/src/modules/onboarding` — workflow, draft repository, confirmation orchestration;
- `backend/src/modules/fitness-profile` — confirmed facts, measurements, safety flags;
- `backend/src/modules/fitness-planning` — goal and plan versions;
- будущий `backend/src/modules/ai-coach` — context builder и provider ports.

HTTP и auth middleware остаются в `transport`, orchestration и транзакции — в `application`, чистые
переходы/registry/readiness — в `domain`, Prisma и provider adapters — в `infrastructure`. Контексты
взаимодействуют через явные application ports; универсальный repository или service locator не нужен.

Все repository-методы получают `userId` только от application service после `requireAuth`. DTO текущего
пользователя не содержат поле, способное выбрать аккаунт. Route с `/{userId}` для onboarding и памяти
не существует.

### 4.2 Context Builder

Context builder принимает внутренние `authenticatedUserId` и `purpose`, но не свободный запрос модели.
Для каждого purpose определён закрытый allowlist:

| Purpose | Допустимый контекст |
| --- | --- |
| `ONBOARDING_EXTRACTION` | Проверенный исходный текст, разрешённая схема полей, уже заполненные draft-поля |
| `PLAN_DRAFT` | Подтверждённый профиль, активная цель, предпочтения, measurements, safety-блоки, версии ACTIVE evidence-правил |
| `COACH_CHAT` | Только записи, нужные для текущего вопроса; не вся история и не чужие диалоги |
| `WEEKLY_REVIEW` | Подтверждённые записи периода, полнота, plan version и применимые evidence-правила |

Provider получает сформированный DTO без database handles, SQL, произвольного `userId` и внутренних
полей доступа. Результат provider сначала валидируется и становится `DRAFT`, `ESTIMATE`, `INFERENCE`
или `HYPOTHESIS`; он не пишет в таблицы напрямую.

## 5. Backend Contracts

Ниже указан целевой REST-контракт. Shared Zod-схемы должны жить в
`@ai-fitness-coach/contracts`; transport только валидирует и вызывает use case.

### 5.1 Общий response

`OnboardingSnapshot` содержит:

- `status`, `revision` и `initialEntryMode`;
- редактируемые field drafts с `state`, `sourceKind`, `isApproximate` и безопасным source hint;
- `readiness` (`READY`, `LIMITED`, `BLOCKED`) и понятные причины;
- safety-блоки и затронутые области без диагностических выводов;
- подтверждённый snapshot, `nextAction` и доступные переходы;
- никогда — `userId`, исходное аудио или скрытый provider payload.

Ошибки используют действующий `ApiError`: `401` для отсутствующей сессии, `409` для stale revision или
повторного mutation ID с другим телом, `422` для невозможного перехода/недостаточных данных, `429` для
ограничения AI/speech-запросов и `503` для временной недоступности provider. Ошибка записи не возвращает
состояние `saved`.

### 5.2 Команды первого ручного среза

| Method и path | Назначение | Ключевые входы |
| --- | --- | --- |
| `GET /api/onboarding` | Вернуть вычисленный пустой snapshot или возобновить текущий без побочного эффекта | Только авторизованная сессия |
| `PUT /api/onboarding/draft` | Сохранить разрешённые draft-поля и временный текст | `expectedRevision`, `clientMutationId`, patch полей |
| `POST /api/onboarding/pause` | Перевести в `PAUSED` без потери черновика | revision и mutation ID |
| `POST /api/onboarding/resume` | Вернуть сохранённое `resumeStatus` | revision и mutation ID |
| `POST /api/onboarding/profile-confirmation` | Атомарно создать факты/цель/preferences/safety и удалить либо явно перенести рассказ | revision, подтверждённые поля, отдельный opt-in на note или default delete |
| `POST /api/onboarding/plan-draft` | Создать versioned plan draft после readiness/evidence gates | revision и mutation ID |
| `POST /api/onboarding/plan-confirmation` | Подтвердить ровно показанную версию плана и сделать её активной | `planId`, `planVersion`, revision, mutation ID |
| `POST /api/onboarding/complete` | После успешного открытия «Сегодня» завершить процесс | revision и mutation ID |

`GET` не принимает `userId`. Mutating-запросы используют optimistic revision и client mutation ID.
`PUT /draft` принимает patch только из registry, имеет строгий размер тела и не может подтверждать
поля. `profile-confirmation` повторно проверяет полноту и safety на сервере, даже если UI уже проверил.

Backend возвращает `nextAction`, но mobile владеет навигацией. После `plan-confirmation` приложение
открывает «Сегодня» и вызывает идемпотентный `complete`. Если приложение закрылось между этими
действиями, следующий `GET` возвращает `PLAN_CONFIRMED` и снова направляет на «Сегодня»; после
успешного открытия процесс завершается.

### 5.3 Будущие provider-команды

| Method и path | Назначение | Ограничение |
| --- | --- | --- |
| `POST /api/onboarding/extraction` | Извлечь field patch из сохранённого проверенного текста | Не принимает произвольный user context; результат только draft |
| `POST /api/onboarding/speech-transcription` | Получить временную транскрипцию | Не сохраняет аудио; provider и транспорт ещё не выбраны |

Эти маршруты не входят в первый ручной implementation slice. Их нельзя реализовывать до выбора
российского контура и проверки no-training/deletion условий. Текстовый ручной fallback остаётся
доступен независимо от provider.

### 5.4 Исправление и удаление после onboarding

Будущий профильный контракт предоставляет read/update/delete для закрытого набора фактов. Исправление
создаёт подтверждённую новую версию; значимые goal/plan changes остаются `PROPOSED` до отдельного
подтверждения. Удаление факта, заметки или аккаунта выполняется на backend, очищает зависимые
производные данные и влияет на следующий context build. Модель не получает mutation API.

## 6. State Machine

Продуктовые состояния не переименовываются:

```text
NOT_STARTED
  -> COLLECTING
  -> REVIEW_REQUIRED
  -> PROFILE_CONFIRMED
  -> PLAN_DRAFT_READY
  -> PLAN_CONFIRMED
  -> COMPLETED
```

`COLLECTING` и `REVIEW_REQUIRED` могут переходить друг в друга после редактирования или обнаружения
конфликта. `PAUSED` сохраняет `resume_status` и возвращается только в него. После подтверждения
профиля изменение значимого поля создаёт новый draft изменения, а не молча откатывает состояние.

Правила переходов:

- только backend решает, допустим ли переход;
- каждый переход сравнивает `expectedRevision` и увеличивает revision в одной транзакции;
- `PROFILE_CONFIRMED` требует сохранённых подтверждённых фактов и выполненного retention choice;
- `PLAN_DRAFT_READY` требует readiness не `BLOCKED` для соответствующих частей;
- `PLAN_CONFIRMED` ссылается на точную неизменяемую версию показанного плана;
- `COMPLETED` возможен только после успешной записи плана и открытия «Сегодня»;
- safety state является ортогональным: профиль сохраняется, но затронутая автоматизация блокируется.

`READY`, `LIMITED` и `BLOCKED` вычисляются из актуальных фактов, цели, safety-флагов и доступных ACTIVE
evidence-правил. Они не сохраняются как вечная истина, чтобы не устареть после исправления данных.

## 7. Транзакции, конкуренция и удаление

Одна транзакция подтверждения профиля:

1. блокирует активный onboarding run пользователя;
2. проверяет revision, mutation receipt и переход;
3. валидирует все значения shared contracts и field registry;
4. создаёт/обновляет подтверждённые факты, goal, measurement и safety flags;
5. при opt-in создаёт `coach_note` из полного показанного текста;
6. очищает `source_narrative` независимо от retention choice;
7. записывает новый status/revision и mutation receipt;
8. возвращает snapshot только после commit.

Две конкурентные правки не объединяются молча: первая увеличивает revision, вторая получает `409` и
свежий snapshot для осознанного повторного применения. Mobile хранит несинхронизированный patch
локально до успешного ответа и не показывает «сохранено» заранее.

Удаление аккаунта каскадно удаляет активные данные onboarding и памяти. Производные async-задачи, если
они появятся, получают user/data version и перед side effect повторно проверяют существование и
актуальность источника. Удалённые сведения не должны вернуться из поздней задачи. Активные данные
удаляются максимум за 24 часа, backup — максимум за 30 дней согласно `CHECKLIST.md`.

## 8. Последовательность реализации

Каждый этап начинается с failing tests и заканчивается проверкой своего вертикального среза.

### Этап 1 — contracts и чистые правила

- enums, field registry, draft/snapshot schemas, transition/readiness functions;
- contract tests для неизвестных, отказов, приблизительности, strict payload и limits;
- capability остаётся `absent`.

### Этап 2 — PostgreSQL foundation

- Prisma models и сгенерированная миграция для onboarding, facts, goals, measurements, safety,
  plan envelope, notes и mutation receipts;
- repositories с обязательным user scope и транзакциями;
- account deletion cascade и correction/supersession tests.

### Этап 3 — ручной backend flow

- authenticated snapshot, draft, pause/resume и profile confirmation;
- plan envelope/confirmation без неподтверждённой энергетической формулы;
- idempotency, optimistic concurrency, source deletion/opt-in note и failure behavior;
- context builder read model на подтверждённых данных.

**Выполнено 2026-08-29.** Текущий plan envelope сохраняет подтверждённую цель и организационные
настройки, но явно помечает энергетическую цель и содержимое тренировок как ожидающие evidence-review.
Он не содержит калорий, макросов, упражнений или медицинских выводов и не означает, что полноценный
автоматический план уже реализован.

### Этап 4 — ручной mobile flow

- mobile feature boundary, TanStack Query/Form и безопасный local pending draft;
- структурированные экраны, review, conflicts, offline/retry, resume и «Сегодня»;
- Maestro критического пути на iOS и Android;
- capability не становится available, пока весь утверждённый пилотный onboarding не завершён.

### Этап 5 — evidence-gated plan content

- провести review формулы, энергетических ориентиров и safety-checkpoint;
- реализовать только ACTIVE правила с version IDs и ограничениями;
- при недостатке данных возвращать `LIMITED` или `BLOCKED`, не ложную точность.

### Этап 6 — AI extraction

- выбрать допустимый российский LLM-контур и заключить требования по no-training/deletion;
- добавить provider port, strict output validation и extraction matrices;
- AI заполняет только draft, чувствительные значения не выводит.

### Этап 7 — voice input

- выбрать speech path с российской обработкой;
- временная передача аудио без постоянного object storage;
- показ/исправление транскрипции и полный manual fallback.

Только после всех обязательных пилотных путей и проверок соответствующие строки capability ledger
могут быть пересмотрены. AI coach chat, журналы питания/тренировок и weekly review продолжаются
следующими вертикальными срезами поверх той же памяти.

## 9. Тестовый план

### 9.1 Contracts и domain unit tests

- strict schemas отклоняют неизвестные ключи, неверные enum/value types и лишний `userId`;
- год рождения и расчётный пол поддерживают подтверждённый отказ без фиктивного значения;
- `UNKNOWN` не сериализуется как факт, zero или average;
- матрица допустимых/запрещённых переходов и safety/readiness combinations;
- одинаковый mutation ID + body идемпотентен, другой body конфликтует;
- field-source и truth-kind не повышаются до `FACT` без подтверждения.

### 9.2 Backend integration с PostgreSQL

- каждый route требует auth и игнорирует/отклоняет попытку выбрать другого пользователя;
- два пользователя не читают draft, факты, цели, notes или plans друг друга;
- draft восстанавливается после новой сессии и app restart;
- stale revision и параллельные подтверждения дают один commit и один `409`;
- profile confirmation атомарно сохраняет факты и очищает рассказ;
- opt-in создаёт ровно одну note с показанным текстом; default создаёт ни одной;
- исходное аудио отсутствует в schema, storage, логах и outbox;
- исправление supersede старый факт, удаление убирает его из следующего context build;
- account deletion удаляет onboarding/memory и поздняя задача не воскрешает данные;
- backend failure не создаёт receipt и не возвращает saved state;
- safety-флаг сохраняет профиль и блокирует только затронутую часть плана;
- plan confirmation активирует ровно показанную version; completion повторяем и идемпотентен.

### 9.3 Provider contract tests после выбора провайдера

- model output проходит strict validation и не содержит произвольных keys;
- чувствительные значения из имени, голоса, фото или стиля речи остаются `UNKNOWN`;
- conflict/low confidence становятся review, а не confirmed fact;
- timeout, invalid output, rate limit и outage сохраняют ручной путь;
- provider request содержит только purpose-allowlisted context и не содержит SQL/user selector;
- аудио не остаётся после успешной или ошибочной транскрипции.

### 9.4 Mobile tests

- unit/contract: local pending patch, merge после `409`, retry и source preview choice;
- integration: login/session restore, server snapshot, pending local draft и logout account boundary;
- Maestro: ручной happy path, закрытие/возобновление, отказ микрофона, AI unavailable, validation,
  backend failure без ложного «сохранено», safety block и переход на «Сегодня»;
- критический Maestro flow выполняется на iOS и Android development builds, не Expo Go.

### 9.5 Обязательные completion gates

Для каждого implementation slice: targeted contract/domain tests, backend integration при persistence,
affected typecheck/lint, `template:check`, `architecture:check` и затем полный `bun run check`. Mobile
navigation/state changes дополнительно требуют Maestro audit и релевантный flow.

## 10. Риски и решения до соответствующего этапа

| Риск или открытое решение | Когда блокирует | Текущее обращение |
| --- | --- | --- |
| Энергетическая формула и числовые ориентиры не прошли evidence-review | Точный nutrition/energy plan | Хранить данные, но не рассчитывать ложную точность |
| Safety-checkpoint не прошёл методическую/правовую проверку | Автоматическое применение затронутого плана | Сохранять профиль и блокировать часть automation |
| LLM provider не выбран | AI extraction | Ручной и текстовый structured path реализуются раньше |
| Speech provider не выбран | Voice transcription | Не проектировать постоянное audio storage; сохранить fallback |
| Retention mutation receipts не утверждён операционно | Production rollout | Определить короткий срок до реализации cleanup job |

Ни одно из этих решений не блокирует этапы 1–4 ручного пути, кроме содержательного автоматического
плана: он может хранить и подтверждать versioned envelope, но не должен включать неподтверждённые
физиологические расчёты.
