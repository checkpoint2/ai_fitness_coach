import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { createApp } from '../../app'
import { createPrisma } from '../../db'
import { loadEnv } from '../../env'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('manual onboarding API', () => {
  const env = loadEnv({
    DATABASE_URL: databaseUrl!,
    ACCESS_TOKEN_TTL_SECONDS: '60',
    CORS_ORIGINS: 'http://localhost:5173',
    JWT_SECRET: '12345678901234567890123456789012',
  })
  const prisma = createPrisma(databaseUrl!)
  const app = createApp({ env, prisma })

  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('requires authentication and returns an empty snapshot without creating a row', async () => {
    const unauthorized = await app.request('/api/onboarding')
    expect(unauthorized.status).toBe(401)

    const session = await register('empty-onboarding@example.com')
    const response = await app.request('/api/onboarding', {
      headers: authenticatedHeaders(session.accessToken),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      status: 'NOT_STARTED',
      revision: 0,
      patch: {},
      nextAction: 'START',
    })
    expect(await prisma.onboardingRun.count()).toBe(0)
  })

  test('saves, restores, pauses, resumes, and rejects stale or repurposed mutations', async () => {
    const session = await register('draft-onboarding@example.com')
    const request = saveDraftRequest()

    const saved = await putDraft(session.accessToken, request)
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      status: 'REVIEW_REQUIRED',
      revision: 1,
      initialEntryMode: 'TEXT',
      nextAction: 'REVIEW_DRAFT',
    })

    const replay = await putDraft(session.accessToken, request)
    expect(replay.status).toBe(200)
    expect((await replay.json()).revision).toBe(1)

    const repurposed = await putDraft(session.accessToken, {
      ...request,
      sourceNarrative: 'Другой текст с тем же mutation id',
    })
    expect(repurposed.status).toBe(409)

    const stale = await putDraft(session.accessToken, {
      ...request,
      clientMutationId: randomUUID(),
    })
    expect(stale.status).toBe(409)

    const paused = await command(session.accessToken, '/api/onboarding/pause', 1)
    expect(paused).toMatchObject({ status: 'PAUSED', revision: 2 })
    const resumed = await command(session.accessToken, '/api/onboarding/resume', 2)
    expect(resumed).toMatchObject({ status: 'REVIEW_REQUIRED', revision: 3 })

    const restored = await app.request('/api/onboarding', {
      headers: authenticatedHeaders(session.accessToken),
    })
    expect(await restored.json()).toMatchObject({
      status: 'REVIEW_REQUIRED',
      revision: 3,
      patch: request.patch,
    })
  })

  test('atomically confirms profile data and deletes the source narrative by default', async () => {
    const session = await register('confirm-onboarding@example.com')
    const request = saveDraftRequest()
    await putDraft(session.accessToken, request)
    const confirmation = {
      expectedRevision: 1,
      clientMutationId: randomUUID(),
      confirmedFieldKeys: Object.keys(request.patch),
    }

    const response = await app.request('/api/onboarding/profile-confirmation', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify(confirmation),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      status: 'PROFILE_CONFIRMED',
      revision: 2,
      patch: {},
      nextAction: 'REVIEW_PLAN',
    })

    const userId = session.user.id
    const run = await prisma.onboardingRun.findUniqueOrThrow({ where: { userId } })
    expect(run.sourceNarrative).toBeNull()
    expect(run.draftPayload).toEqual({})
    expect(await prisma.coachNote.count({ where: { userId } })).toBe(0)
    expect(await prisma.userFact.count({ where: { userId, state: 'confirmed' } })).toBe(
      Object.keys(request.patch).length,
    )
    expect(await prisma.fitnessGoal.count({ where: { userId, state: 'confirmed' } })).toBe(1)
    expect(await prisma.bodyMeasurement.count({ where: { userId, kind: 'weight' } })).toBe(1)

    const replay = await app.request('/api/onboarding/profile-confirmation', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify(confirmation),
    })
    expect(replay.status).toBe(200)
    expect((await replay.json()).revision).toBe(2)
    expect(await prisma.bodyMeasurement.count({ where: { userId, kind: 'weight' } })).toBe(1)
  })

  test('requires explicit safety answers and equipment context before profile review', async () => {
    const safetySession = await register('missing-safety-onboarding@example.com')
    const completeSafetyDraft = saveDraftRequest()
    const { currentPainOrInjury: _omittedSafety, ...safetyPatch } = completeSafetyDraft.patch
    const missingSafety = { ...completeSafetyDraft, patch: safetyPatch }

    const safetyResponse = await putDraft(safetySession.accessToken, missingSafety)
    expect(safetyResponse.status).toBe(200)
    expect(await safetyResponse.json()).toMatchObject({
      status: 'COLLECTING',
      readiness: { profile: 'BLOCKED' },
    })

    const equipmentSession = await register('missing-equipment-onboarding@example.com')
    const completeEquipmentDraft = saveDraftRequest()
    const { equipment: _omittedEquipment, ...equipmentPatch } = completeEquipmentDraft.patch
    const missingEquipment = { ...completeEquipmentDraft, patch: equipmentPatch }

    const equipmentResponse = await putDraft(equipmentSession.accessToken, missingEquipment)
    expect(equipmentResponse.status).toBe(200)
    expect(await equipmentResponse.json()).toMatchObject({
      status: 'COLLECTING',
      readiness: { profile: 'BLOCKED' },
    })
  })

  test('retains the previewed narrative only by opt-in and keeps safety blocking scoped', async () => {
    const session = await register('safe-onboarding@example.com')
    const request = saveDraftRequest({
      currentPainOrInjury: draftField('UNSURE'),
    })
    await putDraft(session.accessToken, request)

    const response = await app.request('/api/onboarding/profile-confirmation', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({
        expectedRevision: 1,
        clientMutationId: randomUUID(),
        confirmedFieldKeys: Object.keys(request.patch),
        sourceNarrativeRetention: 'SAVE_AS_COACH_NOTE',
      }),
    })
    const snapshot = await response.json()

    expect(response.status).toBe(200)
    expect(snapshot).toMatchObject({
      status: 'PROFILE_CONFIRMED',
      safetyBlocks: ['TRAINING'],
      readiness: { overall: 'LIMITED', trainingPlan: 'BLOCKED', nutritionPlan: 'READY' },
    })
    expect(
      await prisma.coachNote.findFirst({ where: { userId: session.user.id } }),
    ).toMatchObject({ text: request.sourceNarrative })
    expect(
      await prisma.safetyFlag.findFirst({ where: { userId: session.user.id } }),
    ).toMatchObject({ scope: 'training', answer: 'unsure', state: 'unresolved' })
  })

  test('never accepts a client-selected user id and never exposes another account draft', async () => {
    const first = await register('first-onboarding-api@example.com')
    const second = await register('second-onboarding-api@example.com')
    const request = saveDraftRequest()
    await putDraft(first.accessToken, request)

    const forged = await putDraft(second.accessToken, {
      ...request,
      clientMutationId: randomUUID(),
      userId: first.user.id,
    })
    expect(forged.status).toBe(400)

    const secondSnapshot = await app.request('/api/onboarding', {
      headers: authenticatedHeaders(second.accessToken),
    })
    expect(await secondSnapshot.json()).toMatchObject({ status: 'NOT_STARTED', patch: {} })
  })

  test('creates an evidence-limited plan envelope, confirms the exact version, and completes', async () => {
    const session = await register('plan-onboarding@example.com')
    const request = saveDraftRequest()
    await putDraft(session.accessToken, request)
    await confirmProfile(session.accessToken, request, 1)
    const planDraftMutationId = randomUUID()

    const draftResponse = await app.request('/api/onboarding/plan-draft', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ expectedRevision: 2, clientMutationId: planDraftMutationId }),
    })
    const draft = await draftResponse.json()

    expect(draftResponse.status).toBe(200)
    expect(draft).toMatchObject({
      status: 'PLAN_DRAFT_READY',
      revision: 3,
      nextAction: 'REVIEW_PLAN',
      plan: {
        version: 1,
        state: 'DRAFT',
        limitations: expect.arrayContaining([
          'ENERGY_TARGET_PENDING_EVIDENCE_REVIEW',
          'TRAINING_CONTENT_PENDING_EVIDENCE_REVIEW',
        ]),
      },
    })
    expect(JSON.stringify(draft.plan.payload)).not.toContain('calories')
    expect(JSON.stringify(draft.plan.payload)).not.toContain('macros')

    const planDraftReplay = await app.request('/api/onboarding/plan-draft', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({ expectedRevision: 2, clientMutationId: planDraftMutationId }),
    })
    expect(planDraftReplay.status).toBe(200)
    expect((await planDraftReplay.json()).revision).toBe(3)
    expect(await prisma.fitnessPlan.count({ where: { userId: session.user.id } })).toBe(1)

    const wrongPlan = await app.request('/api/onboarding/plan-confirmation', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({
        expectedRevision: 3,
        clientMutationId: randomUUID(),
        planId: randomUUID(),
        planVersion: 1,
      }),
    })
    expect(wrongPlan.status).toBe(422)

    const planConfirmation = {
      expectedRevision: 3,
      clientMutationId: randomUUID(),
      planId: draft.plan.id,
      planVersion: draft.plan.version,
    }
    const confirmedResponse = await app.request('/api/onboarding/plan-confirmation', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify(planConfirmation),
    })
    const confirmed = await confirmedResponse.json()
    expect(confirmedResponse.status).toBe(200)
    expect(confirmed).toMatchObject({
      status: 'PLAN_CONFIRMED',
      revision: 4,
      nextAction: 'OPEN_TODAY',
      plan: { id: draft.plan.id, state: 'ACTIVE' },
    })

    const confirmationReplay = await app.request('/api/onboarding/plan-confirmation', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify(planConfirmation),
    })
    expect(confirmationReplay.status).toBe(200)
    expect((await confirmationReplay.json()).revision).toBe(4)

    const completed = await command(session.accessToken, '/api/onboarding/complete', 4)
    expect(completed).toMatchObject({ status: 'COMPLETED', revision: 5, nextAction: 'NONE' })
  })

  function putDraft(accessToken: string, body: Record<string, unknown>) {
    return app.request('/api/onboarding/draft', {
      method: 'PUT',
      headers: authenticatedJsonHeaders(accessToken),
      body: JSON.stringify(body),
    })
  }

  async function command(accessToken: string, path: string, expectedRevision: number) {
    const response = await app.request(path, {
      method: 'POST',
      headers: authenticatedJsonHeaders(accessToken),
      body: JSON.stringify({ expectedRevision, clientMutationId: randomUUID() }),
    })
    expect(response.status).toBe(200)
    return response.json()
  }

  async function register(email: string) {
    const response = await app.request('/api/auth/token/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    })
    expect(response.status).toBe(201)
    return response.json() as Promise<{
      accessToken: string
      user: { id: string; email: string }
    }>
  }

  async function confirmProfile(
    accessToken: string,
    request: ReturnType<typeof saveDraftRequest>,
    expectedRevision: number,
  ) {
    const response = await app.request('/api/onboarding/profile-confirmation', {
      method: 'POST',
      headers: authenticatedJsonHeaders(accessToken),
      body: JSON.stringify({
        expectedRevision,
        clientMutationId: randomUUID(),
        confirmedFieldKeys: Object.keys(request.patch),
      }),
    })
    expect(response.status).toBe(200)
    return response.json()
  }
})

function saveDraftRequest(overrides: Record<string, unknown> = {}) {
  return {
    expectedRevision: 0,
    clientMutationId: randomUUID(),
    initialEntryMode: 'TEXT',
    sourceNarrative: 'Хочу тренироваться три раза в неделю и улучшить форму.',
    patch: {
      adultConfirmed: draftField(true),
      birthYear: draftField({ kind: 'DECLINED' }),
      calculationSex: draftField({ kind: 'DECLINED' }),
      heightCm: draftField(180),
      currentWeightKg: draftField(90, true),
      timezone: draftField('Europe/Moscow'),
      bodyGoal: draftField('RECOMPOSITION'),
      trainingGoal: draftField('GENERAL_FITNESS'),
      trainingExperience: draftField('Начальный'),
      trainingLocations: draftField(['GYM']),
      equipment: draftField(['Тренажёры', 'Гантели']),
      trainingDaysPerWeek: draftField(3),
      workoutDurationMinutes: draftField(60),
      ordinaryDayDescription: draftField('В основном работаю за компьютером'),
      allergiesAndExclusions: draftField({ kind: 'NONE' }),
      nutritionTrackingMode: draftField('HYBRID'),
      currentPainOrInjury: draftField('NO'),
      doctorRestriction: draftField('NO'),
      ordinaryFitnessSuitabilityDoubt: draftField('NO'),
      supervisedNutritionOrActivityOnly: draftField('NO'),
      ...overrides,
    },
  }
}

function draftField(value: unknown, isApproximate = false) {
  return { state: 'DRAFT', value, sourceKind: 'STRUCTURED', isApproximate }
}

function authenticatedHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

function authenticatedJsonHeaders(accessToken: string) {
  return { ...authenticatedHeaders(accessToken), 'Content-Type': 'application/json' }
}
