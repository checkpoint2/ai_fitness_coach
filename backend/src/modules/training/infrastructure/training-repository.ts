import type {
  CreateWorkoutSessionRequest,
  ExerciseCatalogItem,
  WorkoutSession as WorkoutSessionDto,
  WorkoutSourceKind,
} from '@ai-fitness-coach/contracts'
import { exerciseCatalogItemSchema } from '@ai-fitness-coach/contracts'

import { Prisma } from '../../../generated/prisma/client'
import type { DbClient } from '../../../db'
import type { TrainingRepository } from '../application/ports'
import {
  WorkoutIdempotencyConflict,
  WorkoutRevisionConflict,
  WorkoutSessionNotFound,
} from '../domain/errors'

const sessionInclude = {
  exercises: {
    orderBy: { position: 'asc' as const },
    include: { sets: { orderBy: { position: 'asc' as const } } },
  },
} as const

type SessionRecord = Prisma.WorkoutSessionGetPayload<{ include: typeof sessionInclude }>

export function createPrismaTrainingRepository(db: DbClient): TrainingRepository {
  return {
    async listCatalog() {
      const definitions = await db.exerciseDefinition.findMany({
        where: { status: 'active', activeKey: { not: null } },
        orderBy: [{ name: 'asc' }, { contentVersion: 'desc' }],
      })
      return definitions.flatMap((definition) => {
        if (definition.activeKey !== definition.slug) return []
        const candidate = toCatalogDto(definition)
        const parsed = exerciseCatalogItemSchema.safeParse(candidate)
        return parsed.success ? [parsed.data] : []
      })
    },

    async list(userId, query) {
      const sessions = await db.workoutSession.findMany({
        where: {
          userId,
          occurredAt: { gte: new Date(query.from), lt: new Date(query.to) },
        },
        orderBy: { occurredAt: 'desc' },
        include: sessionInclude,
      })
      return sessions.map(toDto)
    },

    create(input) {
      return db.$transaction(async (tx) => {
        await acquireTrainingUserLock(tx, input.userId)
        const existing = await tx.workoutSession.findUnique({
          where: {
            userId_clientMutationId: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
            },
          },
          include: sessionInclude,
        })
        if (existing) {
          if (existing.mutationHash !== input.requestHash) {
            throw new WorkoutIdempotencyConflict(input.request.clientMutationId)
          }
          return toDto(existing)
        }
        return toDto(
          await tx.workoutSession.create({
            data: {
              userId: input.userId,
              clientMutationId: input.request.clientMutationId,
              mutationHash: input.requestHash,
              ...sessionData(input.request, input.confirmedAt),
              exercises: { create: exerciseData(input.request.exercises) },
            },
            include: sessionInclude,
          }),
        )
      })
    },

    update(input) {
      return db.$transaction(async (tx) => {
        await acquireTrainingUserLock(tx, input.userId)
        const current = await tx.workoutSession.findFirst({
          where: { id: input.sessionId, userId: input.userId },
        })
        if (!current) throw new WorkoutSessionNotFound()
        if (current.revision !== input.request.expectedRevision) {
          throw new WorkoutRevisionConflict(input.request.expectedRevision, current.revision)
        }
        return toDto(
          await tx.workoutSession.update({
            where: { id: current.id },
            data: {
              revision: { increment: 1 },
              ...sessionData(input.request, input.confirmedAt),
              exercises: {
                deleteMany: {},
                create: exerciseData(input.request.exercises),
              },
            },
            include: sessionInclude,
          }),
        )
      })
    },

    async delete(userId, sessionId, expectedRevision) {
      await db.$transaction(async (tx) => {
        await acquireTrainingUserLock(tx, userId)
        const current = await tx.workoutSession.findFirst({
          where: { id: sessionId, userId },
        })
        if (!current) return
        if (current.revision !== expectedRevision) {
          throw new WorkoutRevisionConflict(expectedRevision, current.revision)
        }
        await tx.workoutSession.delete({ where: { id: current.id } })
      })
    },
  }
}

function toCatalogDto(
  definition: Prisma.ExerciseDefinitionGetPayload<Record<string, never>>,
): ExerciseCatalogItem | unknown {
  return {
    id: definition.id,
    slug: definition.slug,
    contentVersion: definition.contentVersion,
    name: definition.name,
    environments: definition.environments,
    equipment: definition.equipment,
    instructions: definition.instructions,
    techniqueCues: definition.techniqueCues,
    commonMistakes: definition.commonMistakes,
    demonstration: definition.demonstrationKind && definition.demonstrationAssetKey && definition.demonstrationAltText
      ? {
          kind: definition.demonstrationKind === 'loop_animation' ? 'LOOP_ANIMATION' : 'SHORT_VIDEO',
          assetKey: definition.demonstrationAssetKey,
          altText: definition.demonstrationAltText,
        }
      : null,
    reviewReference: definition.reviewReference,
    reviewedAt: definition.reviewedAt?.toISOString() ?? null,
  }
}

function sessionData(
  request: Omit<CreateWorkoutSessionRequest, 'clientMutationId'>,
  confirmedAt: Date,
) {
  return {
    title: request.title,
    occurredAt: new Date(request.occurredAt),
    durationMinutes: request.durationMinutes,
    effort: request.effort === null
      ? null
      : request.effort.toLowerCase() as 'easy' | 'right' | 'hard' | 'pain',
    notes: request.notes,
    sourceKind: 'structured' as const,
    confirmedAt,
  }
}

function exerciseData(exercises: CreateWorkoutSessionRequest['exercises']) {
  return exercises.map((exercise, exerciseIndex) => ({
    position: exerciseIndex + 1,
    name: exercise.name,
    equipmentText: exercise.equipmentText,
    notes: exercise.notes,
    sets: {
      create: exercise.sets.map((set, setIndex) => ({
        position: setIndex + 1,
        reps: set.reps,
        loadKg: set.loadKg,
        durationSeconds: set.durationSeconds,
        completed: set.completed,
      })),
    },
  }))
}

function toDto(session: SessionRecord): WorkoutSessionDto {
  return {
    id: session.id,
    revision: session.revision,
    title: session.title,
    occurredAt: session.occurredAt.toISOString(),
    durationMinutes: session.durationMinutes,
    effort: session.effort?.toUpperCase() as WorkoutSessionDto['effort'],
    notes: session.notes,
    sourceKind: session.sourceKind.toUpperCase() as WorkoutSourceKind,
    confirmedAt: session.confirmedAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      position: exercise.position,
      name: exercise.name,
      equipmentText: exercise.equipmentText,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        position: set.position,
        reps: set.reps,
        loadKg: set.loadKg === null ? null : Number(set.loadKg),
        durationSeconds: set.durationSeconds,
        completed: true,
      })),
    })),
  }
}

function acquireTrainingUserLock(
  tx: Parameters<Parameters<DbClient['$transaction']>[0]>[0],
  userId: string,
) {
  return tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`training:${userId}`}, 0))`,
  )
}
