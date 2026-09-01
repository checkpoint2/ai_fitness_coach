import { describe, expect, test } from 'bun:test'

import {
  createWorkoutSessionRequestSchema,
  exerciseCatalogResponseSchema,
  listWorkoutSessionsQuerySchema,
  updateWorkoutSessionRequestSchema,
  workoutSessionSchema,
} from './training'

const occurredAt = '2026-08-30T16:00:00.000Z'

describe('training contracts', () => {
  test('accepts a confirmed structured workout with exercises and completed sets', () => {
    const result = createWorkoutSessionRequestSchema.parse({
      clientMutationId: '018fd4f2-1f3a-7c88-bc49-000000000001',
      title: 'Силовая тренировка A',
      occurredAt,
      durationMinutes: 55,
      effort: 'RIGHT',
      notes: 'Работал спокойно, без боли',
      exercises: [
        {
          name: 'Присед с гантелью',
          equipmentText: 'Гантель 16 кг',
          notes: null,
          sets: [
            { reps: 10, loadKg: 16, durationSeconds: null, completed: true },
            { reps: 10, loadKg: 16, durationSeconds: null, completed: true },
          ],
        },
      ],
    })

    expect(result.exercises[0]?.sets).toHaveLength(2)
  })

  test('rejects user selectors, empty sets, and internally inconsistent set data', () => {
    const base = {
      clientMutationId: '018fd4f2-1f3a-7c88-bc49-000000000001',
      title: 'Тренировка',
      occurredAt,
      durationMinutes: null,
      effort: null,
      notes: null,
      exercises: [{
        name: 'Планка',
        equipmentText: null,
        notes: null,
        sets: [{ reps: null, loadKg: null, durationSeconds: 45, completed: true }],
      }],
    }

    expect(createWorkoutSessionRequestSchema.safeParse({ ...base, userId: crypto.randomUUID() }).success).toBe(false)
    expect(createWorkoutSessionRequestSchema.safeParse({
      ...base,
      exercises: [{ ...base.exercises[0], sets: [] }],
    }).success).toBe(false)
    expect(createWorkoutSessionRequestSchema.safeParse({
      ...base,
      exercises: [{
        ...base.exercises[0],
        sets: [{ reps: null, loadKg: null, durationSeconds: null, completed: true }],
      }],
    }).success).toBe(false)
  })

  test('uses optimistic revision for corrections and bounds history windows', () => {
    const create = createWorkoutSessionRequestSchema.parse({
      clientMutationId: '018fd4f2-1f3a-7c88-bc49-000000000001',
      title: 'Мобилити',
      occurredAt,
      durationMinutes: 25,
      effort: 'EASY',
      notes: null,
      exercises: [{
        name: 'Мобилизация грудного отдела',
        equipmentText: null,
        notes: null,
        sets: [{ reps: 8, loadKg: null, durationSeconds: null, completed: true }],
      }],
    })
    const { clientMutationId: _clientMutationId, ...editable } = create
    expect(updateWorkoutSessionRequestSchema.parse({ ...editable, expectedRevision: 2 })).toMatchObject({ expectedRevision: 2 })
    expect(listWorkoutSessionsQuerySchema.safeParse({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-03-01T00:00:00.000Z',
    }).success).toBe(false)
  })

  test('returns training history without a user selector or invented plan metadata', () => {
    const timestamp = '2026-08-30T17:00:00.000Z'
    const session = workoutSessionSchema.parse({
      id: '018fd4f2-1f3a-7c88-bc49-000000000010',
      revision: 1,
      title: 'Силовая тренировка A',
      occurredAt,
      durationMinutes: 55,
      effort: 'RIGHT',
      notes: null,
      sourceKind: 'STRUCTURED',
      confirmedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      exercises: [{
        id: '018fd4f2-1f3a-7c88-bc49-000000000011',
        position: 1,
        name: 'Присед с гантелью',
        equipmentText: 'Гантель',
        notes: null,
        sets: [{
          id: '018fd4f2-1f3a-7c88-bc49-000000000012',
          position: 1,
          reps: 10,
          loadKg: 16,
          durationSeconds: null,
          completed: true,
        }],
      }],
    })

    expect(session).not.toHaveProperty('userId')
    expect(session).not.toHaveProperty('planId')
  })

  test('describes only versioned reviewed exercise content with a usable demonstration', () => {
    const result = exerciseCatalogResponseSchema.parse({
      exercises: [{
        id: '018fd4f2-1f3a-7c88-bc49-000000000020',
        slug: 'goblet-squat',
        contentVersion: 1,
        name: 'Присед с гантелью',
        environments: ['HOME_EQUIPMENT', 'GYM_FREE_WEIGHT'],
        equipment: ['Гантель'],
        instructions: 'Держите гантель у груди и двигайтесь в комфортном диапазоне.',
        techniqueCues: ['Опора на всю стопу'],
        commonMistakes: ['Потеря устойчивого положения'],
        demonstration: {
          kind: 'LOOP_ANIMATION',
          assetKey: 'exercise/goblet-squat/v1',
          altText: 'Демонстрация приседа с гантелью',
        },
        reviewReference: 'exercise-review-2026-001',
        reviewedAt: '2026-08-31T10:00:00.000Z',
      }],
    })

    expect(result.exercises[0]?.contentVersion).toBe(1)
    expect(exerciseCatalogResponseSchema.safeParse({
      exercises: [{ ...result.exercises[0], demonstration: null }],
    }).success).toBe(false)
    expect(exerciseCatalogResponseSchema.safeParse({
      exercises: [{ ...result.exercises[0], reviewReference: null }],
    }).success).toBe(false)
  })
})
