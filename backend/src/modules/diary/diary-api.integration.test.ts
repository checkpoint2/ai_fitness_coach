import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { createApp } from '../../app'
import { createPrisma } from '../../db'
import { loadEnv } from '../../env'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip
const occurredAt = '2026-08-30T09:30:00.000Z'

maybeDescribe('diary API', () => {
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

  test('requires auth and persists an idempotent mixed timeline for the current user', async () => {
    const unauthorized = await app.request(
      `/api/diary?from=${encodeURIComponent('2026-08-30T00:00:00.000Z')}&to=${encodeURIComponent('2026-08-31T00:00:00.000Z')}`,
    )
    expect(unauthorized.status).toBe(401)

    const session = await register('diary-owner@example.com')
    const nutrition = nutritionRequest()
    const first = await createNutrition(session.accessToken, nutrition)
    const firstBody = await first.json()
    expect(first.status).toBe(201)
    expect(firstBody.entry).toMatchObject({
      kind: 'NUTRITION',
      revision: 1,
      description: nutrition.description,
      sourceKind: 'STRUCTURED',
      nutrition: { truthKind: 'FACT', caloriesKcal: 640 },
    })

    const replay = await createNutrition(session.accessToken, nutrition)
    expect(replay.status).toBe(201)
    expect((await replay.json()).entry.id).toBe(firstBody.entry.id)
    expect(await prisma.nutritionEntry.count()).toBe(1)

    const repurposed = await createNutrition(session.accessToken, {
      ...nutrition,
      description: 'Другое содержание с тем же mutation id',
    })
    expect(repurposed.status).toBe(409)

    const activity = await app.request('/api/diary/activity-entries', {
      method: 'POST',
      headers: authenticatedJsonHeaders(session.accessToken),
      body: JSON.stringify({
        clientMutationId: randomUUID(),
        description: 'Гулял полтора часа в среднем темпе',
        occurredAt: '2026-08-30T18:00:00.000Z',
        durationMinutes: 90,
        expenditure: { caloriesKcal: 420, truthKind: 'ESTIMATE' },
      }),
    })
    expect(activity.status).toBe(201)

    const timeline = await list(session.accessToken)
    expect(timeline.status).toBe(200)
    expect((await timeline.json()).entries).toMatchObject([
      { kind: 'ACTIVITY', expenditure: { truthKind: 'ESTIMATE' } },
      { kind: 'NUTRITION', nutrition: { truthKind: 'FACT' } },
    ])
  })

  test('isolates accounts and applies corrections only to the expected revision', async () => {
    const owner = await register('diary-edit-owner@example.com')
    const stranger = await register('diary-edit-stranger@example.com')
    const created = await createNutrition(owner.accessToken, nutritionRequest())
    const entry = (await created.json()).entry

    const forged = await app.request(`/api/diary/nutrition-entries/${entry.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(stranger.accessToken),
      body: JSON.stringify(updateRequest(entry.revision)),
    })
    expect(forged.status).toBe(404)

    const corrected = await app.request(`/api/diary/nutrition-entries/${entry.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(updateRequest(entry.revision)),
    })
    expect(corrected.status).toBe(200)
    expect(await corrected.json()).toMatchObject({
      entry: { revision: 2, description: 'Исправленная порция' },
    })

    const stale = await app.request(`/api/diary/nutrition-entries/${entry.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(updateRequest(entry.revision)),
    })
    expect(stale.status).toBe(409)
    expect((await stale.json()).error.details).toEqual({
      expectedRevision: 1,
      actualRevision: 2,
    })

    const strangerDelete = await app.request(`/api/diary/nutrition-entries/${entry.id}`, {
      method: 'DELETE',
      headers: authenticatedJsonHeaders(stranger.accessToken),
      body: JSON.stringify({ expectedRevision: 2 }),
    })
    expect(strangerDelete.status).toBe(200)
    expect(await prisma.nutritionEntry.count({ where: { userId: owner.user.id } })).toBe(1)

    const deleted = await app.request(`/api/diary/nutrition-entries/${entry.id}`, {
      method: 'DELETE',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify({ expectedRevision: 2 }),
    })
    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ deleted: true })
    expect(await prisma.nutritionEntry.count({ where: { userId: owner.user.id } })).toBe(0)
  })

  test('persists voluntary measurements and keeps corrections account-scoped', async () => {
    const owner = await register('measurement-owner@example.com')
    const stranger = await register('measurement-stranger@example.com')
    const request = {
      clientMutationId: randomUUID(),
      measurementKind: 'WAIST',
      label: null,
      value: 91.5,
      unit: 'CM',
      occurredAt,
      truthKind: 'FACT',
    }

    const created = await app.request('/api/diary/measurement-entries', {
      method: 'POST',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(request),
    })
    expect(created.status).toBe(201)
    const entry = (await created.json()).entry
    expect(entry).toMatchObject({
      kind: 'MEASUREMENT',
      measurementKind: 'WAIST',
      value: 91.5,
      unit: 'CM',
      truthKind: 'FACT',
      revision: 1,
    })

    const replay = await app.request('/api/diary/measurement-entries', {
      method: 'POST',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(request),
    })
    expect(replay.status).toBe(201)
    expect((await replay.json()).entry.id).toBe(entry.id)

    const forged = await app.request(`/api/diary/measurement-entries/${entry.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(stranger.accessToken),
      body: JSON.stringify({ ...request, clientMutationId: undefined, expectedRevision: 1, value: 80 }),
    })
    expect(forged.status).toBe(404)

    const corrected = await app.request(`/api/diary/measurement-entries/${entry.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify({ ...request, clientMutationId: undefined, expectedRevision: 1, value: 90.5 }),
    })
    expect(corrected.status).toBe(200)
    expect(await corrected.json()).toMatchObject({ entry: { revision: 2, value: 90.5 } })

    const timeline = await list(owner.accessToken)
    expect((await timeline.json()).entries).toContainEqual(
      expect.objectContaining({ id: entry.id, kind: 'MEASUREMENT', value: 90.5 }),
    )

    const removed = await app.request(`/api/diary/measurement-entries/${entry.id}`, {
      method: 'DELETE',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify({ expectedRevision: 2 }),
    })
    expect(removed.status).toBe(200)
    expect(await prisma.bodyMeasurement.count({ where: { userId: owner.user.id } })).toBe(0)
  })

  test('confirms day completeness without inventing an energy status', async () => {
    const owner = await register('day-confirmation-owner@example.com')
    const stranger = await register('day-confirmation-stranger@example.com')
    const request = {
      clientMutationId: randomUUID(),
      localDate: '2026-08-30',
      timeZone: 'Europe/Moscow',
      nutritionComplete: true,
      activityComplete: true,
    }

    const created = await app.request('/api/diary/day-confirmations', {
      method: 'POST',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(request),
    })
    expect(created.status).toBe(201)
    const confirmation = (await created.json()).confirmation
    expect(confirmation).toMatchObject({
      localDate: request.localDate,
      timeZone: request.timeZone,
      nutritionComplete: true,
      activityComplete: true,
      revision: 1,
    })
    expect(confirmation).not.toHaveProperty('color')
    expect(confirmation).not.toHaveProperty('energyStatus')

    const replay = await app.request('/api/diary/day-confirmations', {
      method: 'POST',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(request),
    })
    expect(replay.status).toBe(201)
    expect((await replay.json()).confirmation.id).toBe(confirmation.id)

    const ownerList = await listDayConfirmations(owner.accessToken)
    expect((await ownerList.json()).confirmations).toHaveLength(1)
    const strangerList = await listDayConfirmations(stranger.accessToken)
    expect((await strangerList.json()).confirmations).toHaveLength(0)

    const strangerDelete = await app.request(
      `/api/diary/day-confirmations/${request.localDate}`,
      {
        method: 'DELETE',
        headers: authenticatedJsonHeaders(stranger.accessToken),
        body: JSON.stringify({ expectedRevision: 1 }),
      },
    )
    expect(strangerDelete.status).toBe(200)
    expect(await prisma.diaryDayConfirmation.count()).toBe(1)

    const removed = await app.request(`/api/diary/day-confirmations/${request.localDate}`, {
      method: 'DELETE',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify({ expectedRevision: 1 }),
    })
    expect(removed.status).toBe(200)
    expect(await prisma.diaryDayConfirmation.count()).toBe(0)

    const recreated = await app.request('/api/diary/day-confirmations', {
      method: 'POST',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify({ ...request, clientMutationId: randomUUID() }),
    })
    expect(recreated.status).toBe(201)
    await prisma.user.delete({ where: { id: owner.user.id } })
    expect(await prisma.diaryDayConfirmation.count()).toBe(0)
  })

  function list(accessToken: string) {
    const from = encodeURIComponent('2026-08-30T00:00:00.000Z')
    const to = encodeURIComponent('2026-08-31T00:00:00.000Z')
    return app.request(`/api/diary?from=${from}&to=${to}`, {
      headers: authenticatedHeaders(accessToken),
    })
  }

  function createNutrition(accessToken: string, body: ReturnType<typeof nutritionRequest>) {
    return app.request('/api/diary/nutrition-entries', {
      method: 'POST',
      headers: authenticatedJsonHeaders(accessToken),
      body: JSON.stringify(body),
    })
  }

  function listDayConfirmations(accessToken: string) {
    return app.request(
      '/api/diary/day-confirmations?fromDate=2026-08-01&toDate=2026-08-31',
      { headers: authenticatedHeaders(accessToken) },
    )
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
})

function nutritionRequest() {
  return {
    clientMutationId: randomUUID(),
    description: 'Картофельное пюре, котлета и хлеб',
    occurredAt,
    category: null,
    amountText: 'Одна тарелка',
    nutrition: {
      caloriesKcal: 640,
      proteinGrams: 31,
      fatGrams: 24,
      carbohydrateGrams: 72,
      truthKind: 'FACT',
    },
  }
}

function updateRequest(expectedRevision: number) {
  return {
    expectedRevision,
    description: 'Исправленная порция',
    occurredAt,
    category: null,
    amountText: 'Половина тарелки',
    nutrition: { caloriesKcal: 320, truthKind: 'FACT' },
  }
}

function authenticatedHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

function authenticatedJsonHeaders(accessToken: string) {
  return { ...authenticatedHeaders(accessToken), 'Content-Type': 'application/json' }
}
