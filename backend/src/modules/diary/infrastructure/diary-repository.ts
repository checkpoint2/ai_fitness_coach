import type {
  ActivityEntry as ActivityEntryDto,
  DiaryDayConfirmation as DiaryDayConfirmationDto,
  DiaryEntry,
  DiaryMetricTruthKind,
  DiarySourceKind,
  ListDiaryEntriesQuery,
  MeasurementEntry as MeasurementEntryDto,
  NutritionEntry as NutritionEntryDto,
} from '@ai-fitness-coach/contracts'

import {
  Prisma,
  type ActivityEntry,
  type BodyMeasurement,
  type DiaryDayConfirmation,
  type NutritionEntry,
} from '../../../generated/prisma/client'
import type { DbClient } from '../../../db'
import type { DiaryRepository } from '../application/ports'
import {
  DiaryEntryNotFound,
  DiaryIdempotencyConflict,
  DiaryRevisionConflict,
} from '../domain/errors'

export function createPrismaDiaryRepository(db: DbClient): DiaryRepository {
  return {
    async list(userId, query) {
      const where = {
        userId,
        occurredAt: { gte: new Date(query.from), lt: new Date(query.to) },
      }
      const [nutrition, activity, measurements] = await Promise.all([
        db.nutritionEntry.findMany({ where, orderBy: { occurredAt: 'desc' } }),
        db.activityEntry.findMany({ where, orderBy: { occurredAt: 'desc' } }),
        db.bodyMeasurement.findMany({
          where: {
            userId,
            observedAt: { gte: new Date(query.from), lt: new Date(query.to) },
          },
          orderBy: { observedAt: 'desc' },
        }),
      ])
      return [
        ...nutrition.map(toNutritionDto),
        ...activity.map(toActivityDto),
        ...measurements.map(toMeasurementDto),
      ].sort(
        (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
      )
    },

    async listDayConfirmations(userId, query) {
      const confirmations = await db.diaryDayConfirmation.findMany({
        where: {
          userId,
          localDate: {
            gte: localDateToDb(query.fromDate),
            lte: localDateToDb(query.toDate),
          },
        },
        orderBy: { localDate: 'desc' },
      })
      return confirmations.map(toDayConfirmationDto)
    },

    createNutrition(input) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, input.userId)
        const existing = await tx.nutritionEntry.findUnique({
          where: {
            userId_clientMutationId: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
            },
          },
        })
        if (existing) {
          assertIdempotent(existing.mutationHash, input.requestHash, input.request.clientMutationId)
          return toNutritionDto(existing)
        }
        const nutrition = input.request.nutrition
        return toNutritionDto(
          await tx.nutritionEntry.create({
            data: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
              mutationHash: input.requestHash,
              description: input.request.description,
              category: input.request.category,
              amountText: input.request.amountText,
              occurredAt: new Date(input.request.occurredAt),
              sourceKind: 'structured',
              metricsTruthKind: truthKindToDb(nutrition?.truthKind),
              caloriesKcal: nutrition?.caloriesKcal,
              proteinGrams: nutrition?.proteinGrams,
              fatGrams: nutrition?.fatGrams,
              carbohydrateGrams: nutrition?.carbohydrateGrams,
              confirmedAt: input.confirmedAt,
            },
          }),
        )
      })
    },

    createActivity(input) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, input.userId)
        const existing = await tx.activityEntry.findUnique({
          where: {
            userId_clientMutationId: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
            },
          },
        })
        if (existing) {
          assertIdempotent(existing.mutationHash, input.requestHash, input.request.clientMutationId)
          return toActivityDto(existing)
        }
        const expenditure = input.request.expenditure
        return toActivityDto(
          await tx.activityEntry.create({
            data: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
              mutationHash: input.requestHash,
              description: input.request.description,
              occurredAt: new Date(input.request.occurredAt),
              durationMinutes: input.request.durationMinutes,
              sourceKind: 'structured',
              expenditureTruthKind: truthKindToDb(expenditure?.truthKind),
              expenditureKcal: expenditure?.caloriesKcal,
              confirmedAt: input.confirmedAt,
            },
          }),
        )
      })
    },

    createMeasurement(input) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, input.userId)
        const existing = await tx.bodyMeasurement.findUnique({
          where: {
            userId_clientMutationId: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
            },
          },
        })
        if (existing) {
          assertIdempotent(
            existing.mutationHash ?? '',
            input.requestHash,
            input.request.clientMutationId,
          )
          return toMeasurementDto(existing)
        }
        return toMeasurementDto(
          await tx.bodyMeasurement.create({
            data: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
              mutationHash: input.requestHash,
              kind: measurementKindToDb(input.request.measurementKind),
              label: input.request.label,
              value: input.request.value,
              unit: measurementUnitToDb(input.request.unit),
              truthKind: truthKindToDb(input.request.truthKind)!,
              sourceKind: 'structured',
              isApproximate: input.request.truthKind === 'ESTIMATE',
              observedAt: new Date(input.request.occurredAt),
              confirmedAt: input.confirmedAt,
            },
          }),
        )
      })
    },

    confirmDay(input) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, input.userId)
        const existingMutation = await tx.diaryDayConfirmation.findUnique({
          where: {
            userId_clientMutationId: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
            },
          },
        })
        if (existingMutation) {
          assertIdempotent(
            existingMutation.mutationHash,
            input.requestHash,
            input.request.clientMutationId,
          )
          return toDayConfirmationDto(existingMutation)
        }
        const existingDay = await tx.diaryDayConfirmation.findUnique({
          where: {
            userId_localDate: {
              userId: input.userId,
              localDate: localDateToDb(input.request.localDate),
            },
          },
        })
        if (existingDay) return toDayConfirmationDto(existingDay)
        return toDayConfirmationDto(
          await tx.diaryDayConfirmation.create({
            data: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
              mutationHash: input.requestHash,
              localDate: localDateToDb(input.request.localDate),
              timeZone: input.request.timeZone,
              nutritionComplete: input.request.nutritionComplete,
              activityComplete: input.request.activityComplete,
              confirmedAt: input.confirmedAt,
            },
          }),
        )
      })
    },

    updateNutrition(input) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, input.userId)
        const current = await tx.nutritionEntry.findFirst({
          where: { id: input.entryId, userId: input.userId },
        })
        if (!current) throw new DiaryEntryNotFound()
        assertRevision(input.request.expectedRevision, current.revision)
        const nutrition = input.request.nutrition
        return toNutritionDto(
          await tx.nutritionEntry.update({
            where: { id: current.id },
            data: {
              revision: { increment: 1 },
              description: input.request.description,
              category: input.request.category,
              amountText: input.request.amountText,
              occurredAt: new Date(input.request.occurredAt),
              metricsTruthKind: truthKindToDb(nutrition?.truthKind),
              caloriesKcal: nutrition?.caloriesKcal ?? null,
              proteinGrams: nutrition?.proteinGrams ?? null,
              fatGrams: nutrition?.fatGrams ?? null,
              carbohydrateGrams: nutrition?.carbohydrateGrams ?? null,
              confirmedAt: input.confirmedAt,
            },
          }),
        )
      })
    },

    updateActivity(input) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, input.userId)
        const current = await tx.activityEntry.findFirst({
          where: { id: input.entryId, userId: input.userId },
        })
        if (!current) throw new DiaryEntryNotFound()
        assertRevision(input.request.expectedRevision, current.revision)
        const expenditure = input.request.expenditure
        return toActivityDto(
          await tx.activityEntry.update({
            where: { id: current.id },
            data: {
              revision: { increment: 1 },
              description: input.request.description,
              occurredAt: new Date(input.request.occurredAt),
              durationMinutes: input.request.durationMinutes,
              expenditureTruthKind: truthKindToDb(expenditure?.truthKind),
              expenditureKcal: expenditure?.caloriesKcal ?? null,
              confirmedAt: input.confirmedAt,
            },
          }),
        )
      })
    },

    updateMeasurement(input) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, input.userId)
        const current = await tx.bodyMeasurement.findFirst({
          where: { id: input.entryId, userId: input.userId },
        })
        if (!current) throw new DiaryEntryNotFound()
        assertRevision(input.request.expectedRevision, current.revision)
        return toMeasurementDto(
          await tx.bodyMeasurement.update({
            where: { id: current.id },
            data: {
              revision: { increment: 1 },
              kind: measurementKindToDb(input.request.measurementKind),
              label: input.request.label,
              value: input.request.value,
              unit: measurementUnitToDb(input.request.unit),
              truthKind: truthKindToDb(input.request.truthKind)!,
              isApproximate: input.request.truthKind === 'ESTIMATE',
              observedAt: new Date(input.request.occurredAt),
              confirmedAt: input.confirmedAt,
            },
          }),
        )
      })
    },

    deleteNutrition(userId, entryId, expectedRevision) {
      return deleteEntry(db, 'nutrition', userId, entryId, expectedRevision)
    },
    deleteActivity(userId, entryId, expectedRevision) {
      return deleteEntry(db, 'activity', userId, entryId, expectedRevision)
    },
    deleteMeasurement(userId, entryId, expectedRevision) {
      return deleteEntry(db, 'measurement', userId, entryId, expectedRevision)
    },
    deleteDayConfirmation(userId, localDate, expectedRevision) {
      return db.$transaction(async (tx) => {
        await acquireDiaryUserLock(tx, userId)
        const current = await tx.diaryDayConfirmation.findUnique({
          where: { userId_localDate: { userId, localDate: localDateToDb(localDate) } },
        })
        if (!current) return
        assertRevision(expectedRevision, current.revision)
        await tx.diaryDayConfirmation.delete({ where: { id: current.id } })
      })
    },
  }
}

async function deleteEntry(
  db: DbClient,
  kind: 'nutrition' | 'activity' | 'measurement',
  userId: string,
  entryId: string,
  expectedRevision: number,
) {
  await db.$transaction(async (tx) => {
    await acquireDiaryUserLock(tx, userId)
    const current = kind === 'nutrition'
      ? await tx.nutritionEntry.findFirst({ where: { id: entryId, userId } })
      : kind === 'activity'
        ? await tx.activityEntry.findFirst({ where: { id: entryId, userId } })
        : await tx.bodyMeasurement.findFirst({ where: { id: entryId, userId } })
    if (!current) return
    assertRevision(expectedRevision, current.revision)
    if (kind === 'nutrition') await tx.nutritionEntry.delete({ where: { id: entryId } })
    else if (kind === 'activity') await tx.activityEntry.delete({ where: { id: entryId } })
    else await tx.bodyMeasurement.delete({ where: { id: entryId } })
  })
}

function toNutritionDto(entry: NutritionEntry): NutritionEntryDto {
  const nutrition = entry.metricsTruthKind
    ? {
        ...(entry.caloriesKcal === null ? {} : { caloriesKcal: Number(entry.caloriesKcal) }),
        ...(entry.proteinGrams === null ? {} : { proteinGrams: Number(entry.proteinGrams) }),
        ...(entry.fatGrams === null ? {} : { fatGrams: Number(entry.fatGrams) }),
        ...(entry.carbohydrateGrams === null
          ? {}
          : { carbohydrateGrams: Number(entry.carbohydrateGrams) }),
        truthKind: truthKindFromDb(entry.metricsTruthKind),
      }
    : null
  return {
    id: entry.id,
    kind: 'NUTRITION',
    revision: entry.revision,
    description: entry.description,
    category: entry.category,
    amountText: entry.amountText,
    occurredAt: entry.occurredAt.toISOString(),
    sourceKind: sourceKindFromDb(entry.sourceKind),
    nutrition,
    confirmedAt: entry.confirmedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

function toActivityDto(entry: ActivityEntry): ActivityEntryDto {
  return {
    id: entry.id,
    kind: 'ACTIVITY',
    revision: entry.revision,
    description: entry.description,
    occurredAt: entry.occurredAt.toISOString(),
    durationMinutes: entry.durationMinutes,
    sourceKind: sourceKindFromDb(entry.sourceKind),
    expenditure: entry.expenditureTruthKind && entry.expenditureKcal !== null
      ? {
          caloriesKcal: Number(entry.expenditureKcal),
          truthKind: truthKindFromDb(entry.expenditureTruthKind),
        }
      : null,
    confirmedAt: entry.confirmedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

function toMeasurementDto(entry: BodyMeasurement): MeasurementEntryDto {
  return {
    id: entry.id,
    kind: 'MEASUREMENT',
    revision: entry.revision,
    measurementKind: entry.kind.toUpperCase() as MeasurementEntryDto['measurementKind'],
    label: entry.label,
    value: Number(entry.value),
    unit: entry.unit.toUpperCase() as MeasurementEntryDto['unit'],
    occurredAt: entry.observedAt.toISOString(),
    sourceKind: sourceKindFromDb(entry.sourceKind),
    truthKind: truthKindFromDb(entry.truthKind),
    confirmedAt: (entry.confirmedAt ?? entry.recordedAt).toISOString(),
    createdAt: entry.recordedAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

function toDayConfirmationDto(entry: DiaryDayConfirmation): DiaryDayConfirmationDto {
  return {
    id: entry.id,
    localDate: entry.localDate.toISOString().slice(0, 10),
    timeZone: entry.timeZone,
    revision: entry.revision,
    nutritionComplete: true,
    activityComplete: true,
    confirmedAt: entry.confirmedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

function localDateToDb(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function truthKindToDb(value: DiaryMetricTruthKind | undefined) {
  return value?.toLowerCase() as 'fact' | 'estimate' | undefined
}

function truthKindFromDb(value: 'fact' | 'estimate' | 'inference' | 'hypothesis') {
  return value.toUpperCase() as DiaryMetricTruthKind
}

function measurementKindToDb(value: MeasurementEntryDto['measurementKind']) {
  return value.toLowerCase() as Lowercase<typeof value>
}

function measurementUnitToDb(value: MeasurementEntryDto['unit']) {
  return value.toLowerCase() as Lowercase<typeof value>
}

function sourceKindFromDb(value: string) {
  return value.toUpperCase() as DiarySourceKind
}

function assertRevision(expectedRevision: number, actualRevision: number) {
  if (expectedRevision !== actualRevision) {
    throw new DiaryRevisionConflict(expectedRevision, actualRevision)
  }
}

function assertIdempotent(actualHash: string, expectedHash: string, clientMutationId: string) {
  if (actualHash !== expectedHash) throw new DiaryIdempotencyConflict(clientMutationId)
}

function acquireDiaryUserLock(
  tx: Parameters<Parameters<DbClient['$transaction']>[0]>[0],
  userId: string,
) {
  return tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`diary:${userId}`}, 0))`,
  )
}
