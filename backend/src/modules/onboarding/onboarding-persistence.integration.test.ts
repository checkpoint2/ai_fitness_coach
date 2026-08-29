import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { createPrisma } from '../../db'
import { createPrismaOnboardingRepository } from './infrastructure/onboarding-repository'
import {
  OnboardingIdempotencyConflict,
  OnboardingRevisionConflict,
} from './domain/persistence-errors'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('onboarding and persistent memory repository', () => {
  const prisma = createPrisma(databaseUrl!)
  const repository = createPrismaOnboardingRepository(prisma)

  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('restores a saved draft and replays an identical mutation without a second write', async () => {
    const user = await createUser('resume@example.com')
    const clientMutationId = randomUUID()
    const input = {
      userId: user.id,
      expectedRevision: 0,
      clientMutationId,
      requestHash: 'save-draft-v1',
      initialEntryMode: 'TEXT' as const,
      draftPayload: {
        bodyGoal: {
          state: 'DRAFT',
          value: 'FAT_LOSS',
          sourceKind: 'USER_TEXT',
          isApproximate: false,
        },
      },
      sourceNarrative: 'Хочу привести себя в форму',
      sourceKind: 'USER_TEXT' as const,
      targetStatus: 'COLLECTING' as const,
    }

    const saved = await repository.saveDraft(input)
    const replayed = await repository.saveDraft(input)
    const restored = await createPrismaOnboardingRepository(prisma).findRun(user.id)

    expect(saved).toMatchObject({ replayed: false, run: { revision: 1 } })
    expect(replayed).toMatchObject({ replayed: true, run: { revision: 1 } })
    expect(restored).toMatchObject({
      userId: user.id,
      status: 'COLLECTING',
      revision: 1,
      sourceNarrative: 'Хочу привести себя в форму',
    })
    expect(await prisma.onboardingMutationReceipt.count()).toBe(1)

    await expect(
      repository.saveDraft({ ...input, requestHash: 'different-content' }),
    ).rejects.toBeInstanceOf(OnboardingIdempotencyConflict)
    await expect(
      repository.saveDraft({
        ...input,
        clientMutationId: randomUUID(),
        requestHash: 'stale-write',
      }),
    ).rejects.toMatchObject(
      new OnboardingRevisionConflict(0, 1),
    )
  })

  test('versions a correction, exposes only the current fact, and deletes its complete history', async () => {
    const user = await createUser('facts@example.com')
    const original = await repository.replaceConfirmedFact({
      userId: user.id,
      factKey: 'currentWeightKg',
      value: 91.2,
      truthKind: 'FACT',
      sourceKind: 'STRUCTURED',
      isApproximate: false,
      confirmedAt: new Date('2026-08-28T10:00:00.000Z'),
    })
    const corrected = await repository.replaceConfirmedFact({
      userId: user.id,
      factKey: 'currentWeightKg',
      value: 89.7,
      truthKind: 'FACT',
      sourceKind: 'STRUCTURED',
      isApproximate: false,
      confirmedAt: new Date('2026-08-29T10:00:00.000Z'),
    })

    expect(corrected.supersedesId).toBe(original.id)
    expect(await repository.listCurrentFacts(user.id)).toMatchObject([
      { id: corrected.id, factKey: 'currentWeightKg', value: 89.7 },
    ])

    const history = await prisma.userFact.findMany({
      where: { userId: user.id, factKey: 'currentWeightKg' },
      orderBy: { recordedAt: 'asc' },
    })
    expect(history.map(({ state, activeKey }) => ({ state, activeKey }))).toEqual([
      { state: 'superseded', activeKey: null },
      { state: 'confirmed', activeKey: 'currentWeightKg' },
    ])

    expect(await repository.deleteFactHistory(user.id, 'currentWeightKg')).toBe(2)
    expect(await repository.listCurrentFacts(user.id)).toEqual([])
  })

  test('scopes every read to its user and cascades all memory on account deletion', async () => {
    const first = await createUser('first-memory@example.com')
    const second = await createUser('second-memory@example.com')

    await repository.replaceConfirmedFact({
      userId: first.id,
      factKey: 'bodyGoal',
      value: 'RECOMPOSITION',
      truthKind: 'FACT',
      sourceKind: 'STRUCTURED',
      isApproximate: false,
      confirmedAt: new Date(),
    })
    await repository.replaceConfirmedFact({
      userId: second.id,
      factKey: 'bodyGoal',
      value: 'MAINTENANCE',
      truthKind: 'FACT',
      sourceKind: 'STRUCTURED',
      isApproximate: false,
      confirmedAt: new Date(),
    })
    await seedRelatedMemory(first.id)

    expect(await repository.listCurrentFacts(first.id)).toMatchObject([
      { value: 'RECOMPOSITION' },
    ])
    expect(await repository.listCurrentFacts(second.id)).toMatchObject([
      { value: 'MAINTENANCE' },
    ])

    await prisma.user.delete({ where: { id: first.id } })

    expect(await countsFor(first.id)).toEqual({
      runs: 0,
      facts: 0,
      goals: 0,
      measurements: 0,
      safetyFlags: 0,
      plans: 0,
      notes: 0,
      receipts: 0,
    })
    expect(await repository.listCurrentFacts(second.id)).toHaveLength(1)
  })

  async function createUser(email: string) {
    return prisma.user.create({ data: { email } })
  }

  async function seedRelatedMemory(userId: string) {
    await prisma.onboardingRun.create({
      data: { userId, draftPayload: {}, status: 'PROFILE_CONFIRMED' },
    })
    await repository.replaceConfirmedGoal({
      userId,
      bodyGoal: 'RECOMPOSITION',
      trainingGoal: 'GENERAL_FITNESS',
      confirmedAt: new Date(),
    })
    await repository.addMeasurement({
      userId,
      kind: 'weight',
      value: 89.7,
      unit: 'kg',
      truthKind: 'FACT',
      sourceKind: 'STRUCTURED',
      isApproximate: false,
      observedAt: new Date(),
    })
    await repository.replaceSafetyFlag({
      userId,
      scope: 'training',
      answer: 'unsure',
      sourceKind: 'STRUCTURED',
    })
    await repository.createPlanVersion({
      userId,
      payloadSchemaVersion: 1,
      payload: {},
      limitations: [],
    })
    await repository.saveCoachNote(
      userId,
      'Текст сохранён по отдельному выбору пользователя.',
    )
    await prisma.onboardingMutationReceipt.create({
      data: {
        userId,
        clientMutationId: randomUUID(),
        commandType: 'test',
        requestHash: 'test-hash',
        resultRevision: 1,
      },
    })
  }

  async function countsFor(userId: string) {
    const [runs, facts, goals, measurements, safetyFlags, plans, notes, receipts] =
      await prisma.$transaction([
        prisma.onboardingRun.count({ where: { userId } }),
        prisma.userFact.count({ where: { userId } }),
        prisma.fitnessGoal.count({ where: { userId } }),
        prisma.bodyMeasurement.count({ where: { userId } }),
        prisma.safetyFlag.count({ where: { userId } }),
        prisma.fitnessPlan.count({ where: { userId } }),
        prisma.coachNote.count({ where: { userId } }),
        prisma.onboardingMutationReceipt.count({ where: { userId } }),
      ])
    return { runs, facts, goals, measurements, safetyFlags, plans, notes, receipts }
  }
})
