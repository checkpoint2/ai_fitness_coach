import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { createApp } from '../../app'
import { createPrisma } from '../../db'
import { loadEnv } from '../../env'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip
const occurredAt = '2026-08-30T16:00:00.000Z'

maybeDescribe('training API', () => {
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
    await prisma.exerciseDefinition.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('persists, restores, corrects, isolates, and deletes confirmed workout history', async () => {
    const unauthorized = await list('')
    expect(unauthorized.status).toBe(401)

    const owner = await register('training-owner@example.com')
    const stranger = await register('training-stranger@example.com')
    const request = workoutRequest()

    const created = await create(owner.accessToken, request)
    expect(created.status).toBe(201)
    const session = (await created.json()).session
    expect(session).toMatchObject({
      revision: 1,
      title: request.title,
      effort: 'RIGHT',
      sourceKind: 'STRUCTURED',
      exercises: [{
        position: 1,
        name: 'Присед с гантелью',
        sets: [
          { position: 1, reps: 10, loadKg: 16, completed: true },
          { position: 2, reps: 9, loadKg: 16, completed: true },
        ],
      }],
    })
    expect(session).not.toHaveProperty('userId')
    expect(session).not.toHaveProperty('planId')

    const replay = await create(owner.accessToken, request)
    expect(replay.status).toBe(201)
    expect((await replay.json()).session.id).toBe(session.id)
    expect(await prisma.workoutSession.count()).toBe(1)

    const repurposed = await create(owner.accessToken, { ...request, title: 'Другая тренировка' })
    expect(repurposed.status).toBe(409)

    expect((await (await list(owner.accessToken)).json()).sessions).toHaveLength(1)
    expect((await (await list(stranger.accessToken)).json()).sessions).toHaveLength(0)

    const forged = await app.request(`/api/training/sessions/${session.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(stranger.accessToken),
      body: JSON.stringify(updateRequest(1)),
    })
    expect(forged.status).toBe(404)

    const corrected = await app.request(`/api/training/sessions/${session.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(updateRequest(1)),
    })
    expect(corrected.status).toBe(200)
    expect(await corrected.json()).toMatchObject({
      session: {
        revision: 2,
        effort: 'HARD',
        exercises: [{ sets: [{ reps: 8 }] }],
      },
    })

    const stale = await app.request(`/api/training/sessions/${session.id}`, {
      method: 'PATCH',
      headers: authenticatedJsonHeaders(owner.accessToken),
      body: JSON.stringify(updateRequest(1)),
    })
    expect(stale.status).toBe(409)

    const strangerDelete = await app.request(`/api/training/sessions/${session.id}`, {
      method: 'DELETE',
      headers: authenticatedJsonHeaders(stranger.accessToken),
      body: JSON.stringify({ expectedRevision: 2 }),
    })
    expect(strangerDelete.status).toBe(200)
    expect(await prisma.workoutSession.count()).toBe(1)

    await prisma.user.delete({ where: { id: owner.user.id } })
    expect(await prisma.workoutSession.count()).toBe(0)
    expect(await prisma.workoutExercise.count()).toBe(0)
    expect(await prisma.workoutSet.count()).toBe(0)
  })

  test('requires auth and exposes only complete active reviewed exercise content', async () => {
    expect((await app.request('/api/training/exercises')).status).toBe(401)
    const user = await register('exercise-catalog@example.com')
    const complete = exerciseDefinition({ slug: 'goblet-squat', status: 'active', activeKey: 'goblet-squat' })
    await prisma.exerciseDefinition.createMany({ data: [
      complete,
      exerciseDefinition({ slug: 'draft-plank', status: 'draft', activeKey: null }),
      exerciseDefinition({ slug: 'unpublished-active', status: 'active', activeKey: null }),
      { ...exerciseDefinition({ slug: 'broken-active', status: 'active', activeKey: 'broken-active' }), reviewReference: null },
    ] })

    const response = await app.request('/api/training/exercises', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      exercises: [expect.objectContaining({
        slug: 'goblet-squat',
        contentVersion: 1,
        demonstration: expect.objectContaining({ kind: 'LOOP_ANIMATION' }),
        reviewReference: 'exercise-review-2026-001',
      })],
    })
  })

  function list(accessToken: string) {
    const from = encodeURIComponent('2026-08-30T00:00:00.000Z')
    const to = encodeURIComponent('2026-08-31T00:00:00.000Z')
    return app.request(`/api/training/sessions?from=${from}&to=${to}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
  }

  function create(accessToken: string, body: ReturnType<typeof workoutRequest>) {
    return app.request('/api/training/sessions', {
      method: 'POST',
      headers: authenticatedJsonHeaders(accessToken),
      body: JSON.stringify(body),
    })
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

function workoutRequest() {
  return {
    clientMutationId: randomUUID(),
    title: 'Силовая тренировка A',
    occurredAt,
    durationMinutes: 55,
    effort: 'RIGHT' as const,
    notes: 'Без боли',
    exercises: [{
      name: 'Присед с гантелью',
      equipmentText: 'Гантель 16 кг',
      notes: null,
      sets: [
        { reps: 10, loadKg: 16, durationSeconds: null, completed: true as const },
        { reps: 9, loadKg: 16, durationSeconds: null, completed: true as const },
      ],
    }],
  }
}

function updateRequest(expectedRevision: number) {
  const { clientMutationId: _clientMutationId, ...request } = workoutRequest()
  return {
    ...request,
    expectedRevision,
    effort: 'HARD' as const,
    exercises: [{
      ...request.exercises[0]!,
      sets: [{ reps: 8, loadKg: 16, durationSeconds: null, completed: true as const }],
    }],
  }
}

function authenticatedJsonHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

function exerciseDefinition(input: {
  slug: string
  status: 'draft' | 'active'
  activeKey: string | null
}) {
  return {
    ...input,
    contentVersion: 1,
    name: input.slug,
    environments: ['HOME_EQUIPMENT', 'GYM_FREE_WEIGHT'],
    equipment: ['Гантель'],
    instructions: 'Проверенная текстовая инструкция.',
    techniqueCues: ['Опора на всю стопу'],
    commonMistakes: ['Потеря устойчивого положения'],
    demonstrationKind: 'loop_animation' as const,
    demonstrationAssetKey: `exercise/${input.slug}/v1`,
    demonstrationAltText: `Демонстрация ${input.slug}`,
    reviewReference: 'exercise-review-2026-001',
    reviewedAt: new Date('2026-08-31T10:00:00.000Z'),
  }
}
