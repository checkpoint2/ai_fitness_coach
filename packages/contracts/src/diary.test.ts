import { describe, expect, test } from 'bun:test'

import {
  createActivityEntryRequestSchema,
  createMeasurementEntryRequestSchema,
  confirmDiaryDayRequestSchema,
  listDiaryDayConfirmationsQuerySchema,
  createNutritionEntryRequestSchema,
  diaryEntriesResponseSchema,
  listDiaryEntriesQuerySchema,
  updateNutritionEntryRequestSchema,
} from './diary'
import type {
  CreateActivityEntryRequest,
  CreateNutritionEntryRequest,
  DiaryEntriesResponse,
} from './diary'

const mutationId = '018fd4f2-1f3a-7c88-bc49-333333333333'
const occurredAt = '2026-08-30T09:30:00.000Z'

describe('diary contracts', () => {
  test('accepts a confirmed manual nutrition entry with optional known macros', () => {
    const input: CreateNutritionEntryRequest = {
      clientMutationId: mutationId,
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

    expect(createNutritionEntryRequestSchema.parse(input)).toEqual(input)
  })

  test('does not invent nutrition metrics and rejects a client-selected user', () => {
    const withoutMetrics = {
      clientMutationId: mutationId,
      description: 'Перекусил яблоком по дороге',
      occurredAt,
      category: null,
      amountText: null,
      nutrition: null,
    }

    expect(createNutritionEntryRequestSchema.parse(withoutMetrics)).toEqual(withoutMetrics)
    expect(() =>
      createNutritionEntryRequestSchema.parse({ ...withoutMetrics, userId: 'other-user' }),
    ).toThrow()
  })

  test('requires activity expenditure to remain explicitly approximate or factual', () => {
    const input: CreateActivityEntryRequest = {
      clientMutationId: mutationId,
      description: 'Гулял полтора часа в среднем темпе',
      occurredAt,
      durationMinutes: 90,
      expenditure: { caloriesKcal: 420, truthKind: 'ESTIMATE' },
    }

    expect(createActivityEntryRequestSchema.parse(input)).toEqual(input)
    expect(() =>
      createActivityEntryRequestSchema.parse({
        ...input,
        expenditure: { caloriesKcal: 420, truthKind: 'UNKNOWN' },
      }),
    ).toThrow()
  })

  test('bounds diary windows and uses optimistic revision for corrections', () => {
    expect(
      listDiaryEntriesQuerySchema.parse({
        from: '2026-08-30T00:00:00.000Z',
        to: '2026-08-31T00:00:00.000Z',
      }),
    ).toEqual({
      from: '2026-08-30T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
    })
    expect(
      updateNutritionEntryRequestSchema.parse({
        expectedRevision: 2,
        description: 'Исправленная запись',
        occurredAt,
        category: null,
        amountText: null,
        nutrition: null,
      }).expectedRevision,
    ).toBe(2)
  })

  test('returns a mixed current-user timeline without a user selector', () => {
    const response: DiaryEntriesResponse = {
      entries: [
        {
          id: mutationId,
          kind: 'NUTRITION',
          revision: 1,
          description: 'Яблоко',
          category: null,
          amountText: null,
          occurredAt,
          sourceKind: 'STRUCTURED',
          nutrition: null,
          confirmedAt: occurredAt,
          createdAt: occurredAt,
          updatedAt: occurredAt,
        },
      ],
    }

    expect(diaryEntriesResponseSchema.parse(response)).toEqual(response)
    expect(() =>
      diaryEntriesResponseSchema.parse({
        entries: [{ ...response.entries[0], userId: 'other-user' }],
      }),
    ).toThrow()
  })

  test('accepts voluntary measurements and enforces matching units', () => {
    const waist = {
      clientMutationId: mutationId,
      measurementKind: 'WAIST',
      label: null,
      value: 91.5,
      unit: 'CM',
      occurredAt,
      truthKind: 'FACT',
    } as const

    expect(createMeasurementEntryRequestSchema.parse(waist)).toEqual(waist)
    expect(() => createMeasurementEntryRequestSchema.parse({ ...waist, unit: 'KG' })).toThrow()
    expect(() => createMeasurementEntryRequestSchema.parse({
      ...waist,
      measurementKind: 'CUSTOM',
    })).toThrow()
    expect(createMeasurementEntryRequestSchema.parse({
      ...waist,
      measurementKind: 'CUSTOM',
      label: 'Обхват плеч',
    }).label).toBe('Обхват плеч')
  })

  test('confirms a local diary day without claiming an energy result', () => {
    const input = {
      clientMutationId: mutationId,
      localDate: '2026-08-30',
      timeZone: 'Europe/Moscow',
      nutritionComplete: true,
      activityComplete: true,
    } as const

    expect(confirmDiaryDayRequestSchema.parse(input)).toEqual(input)
    expect(() => confirmDiaryDayRequestSchema.parse({ ...input, userId: 'other-user' })).toThrow()
    expect(() => confirmDiaryDayRequestSchema.parse({ ...input, nutritionComplete: false })).toThrow()
    expect(listDiaryDayConfirmationsQuerySchema.parse({
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
    })).toEqual({ fromDate: '2026-08-01', toDate: '2026-08-31' })
    expect(() => listDiaryDayConfirmationsQuerySchema.parse({
      fromDate: '2026-08-01',
      toDate: '2026-09-01',
    })).toThrow()
  })
})
