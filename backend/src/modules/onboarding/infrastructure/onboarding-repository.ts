import type { OnboardingFieldKey } from '@ai-fitness-coach/contracts'

import {
  Prisma,
  type FitnessPlan,
  type OnboardingRun,
  type UserFact,
} from '../../../generated/prisma/client'
import type { DbClient } from '../../../db'
import type {
  ConfirmedFactInput,
  OnboardingRepository,
  OnboardingPlanRecord,
  OnboardingRunRecord,
  UserFactRecord,
} from '../application/ports'
import {
  OnboardingIdempotencyConflict,
  OnboardingResourceMismatch,
  OnboardingRevisionConflict,
} from '../domain/persistence-errors'

export function createPrismaOnboardingRepository(db: DbClient): OnboardingRepository {
  return {
    findMutationReceipt(userId, clientMutationId) {
      return db.onboardingMutationReceipt.findUnique({
        where: { userId_clientMutationId: { userId, clientMutationId } },
        select: { commandType: true, requestHash: true },
      })
    },

    async findRun(userId) {
      const run = await db.onboardingRun.findUnique({ where: { userId } })
      return run ? toRunRecord(run) : null
    },

    async saveDraft(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)

        const receipt = await tx.onboardingMutationReceipt.findUnique({
          where: {
            userId_clientMutationId: {
              userId: input.userId,
              clientMutationId: input.clientMutationId,
            },
          },
        })
        if (receipt) {
          if (receipt.commandType !== 'save_draft' || receipt.requestHash !== input.requestHash) {
            throw new OnboardingIdempotencyConflict(input.clientMutationId)
          }
          const run = await tx.onboardingRun.findUniqueOrThrow({
            where: { userId: input.userId },
          })
          return { replayed: true, run: toRunRecord(run) }
        }

        const current = await tx.onboardingRun.upsert({
          where: { userId: input.userId },
          create: { userId: input.userId, draftPayload: {} },
          update: {},
        })
        if (current.revision !== input.expectedRevision) {
          throw new OnboardingRevisionConflict(input.expectedRevision, current.revision)
        }

        const run = await tx.onboardingRun.update({
          where: { id: current.id },
          data: {
            status: input.targetStatus,
            initialEntryMode: input.initialEntryMode ?? current.initialEntryMode,
            draftPayload: asInputJson(input.draftPayload),
            sourceNarrative:
              input.sourceNarrative === undefined
                ? current.sourceNarrative
                : input.sourceNarrative,
            sourceKind: input.sourceKind,
            revision: { increment: 1 },
          },
        })
        await tx.onboardingMutationReceipt.create({
          data: {
            userId: input.userId,
            clientMutationId: input.clientMutationId,
            commandType: 'save_draft',
            requestHash: input.requestHash,
            resultRevision: run.revision,
            resultResourceId: run.id,
          },
        })

        return { replayed: false, run: toRunRecord(run) }
      })
    },

    async transition(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)
        const replay = await replayedRun(tx, input)
        if (replay) return replay

        const current = await tx.onboardingRun.findUniqueOrThrow({
          where: { userId: input.userId },
        })
        assertRevision(current.revision, input.expectedRevision)
        const run = await tx.onboardingRun.update({
          where: { id: current.id },
          data: {
            status: input.targetStatus,
            resumeStatus: input.resumeStatus,
            completedAt: input.commandType === 'complete' ? input.transitionedAt : undefined,
            revision: { increment: 1 },
          },
        })
        await createReceipt(tx, {
          ...input,
          resultRevision: run.revision,
          resultResourceId: run.id,
        })
        return { replayed: false, run: toRunRecord(run) }
      })
    },

    async confirmProfile(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)
        const command = { ...input, commandType: 'confirm_profile' as const }
        const replay = await replayedRun(tx, command)
        if (replay) return replay

        const current = await tx.onboardingRun.findUniqueOrThrow({
          where: { userId: input.userId },
        })
        assertRevision(current.revision, input.expectedRevision)

        for (const fact of input.facts) {
          await replaceFact(tx, { ...fact, userId: input.userId })
        }

        const activeGoal = await tx.fitnessGoal.findUnique({
          where: { userId_activeKey: { userId: input.userId, activeKey: 'current' } },
        })
        if (activeGoal) {
          await tx.fitnessGoal.update({
            where: { id: activeGoal.id },
            data: {
              state: 'superseded',
              activeKey: null,
              supersededAt: input.confirmedAt,
            },
          })
        }
        await tx.fitnessGoal.create({
          data: {
            userId: input.userId,
            version: (activeGoal?.version ?? 0) + 1,
            state: 'confirmed',
            activeKey: 'current',
            bodyGoal: input.goal.bodyGoal.toLowerCase() as Lowercase<typeof input.goal.bodyGoal>,
            trainingGoal:
              input.goal.trainingGoal.toLowerCase() as Lowercase<typeof input.goal.trainingGoal>,
            primaryPriority: input.goal.primaryPriority,
            desiredWeightKg: input.goal.desiredWeightKg,
            resultStatement: input.goal.resultStatement,
            confirmedAt: input.confirmedAt,
          },
        })
        await tx.bodyMeasurement.create({
          data: {
            userId: input.userId,
            kind: input.measurement.kind,
            value: input.measurement.value,
            unit: input.measurement.unit,
            truthKind:
              input.measurement.truthKind.toLowerCase() as Lowercase<
                typeof input.measurement.truthKind
              >,
            sourceKind:
              input.measurement.sourceKind.toLowerCase() as Lowercase<
                typeof input.measurement.sourceKind
              >,
            isApproximate: input.measurement.isApproximate,
            observedAt: input.measurement.observedAt,
          },
        })

        for (const scope of ['training', 'nutrition'] as const) {
          const activeFlag = await tx.safetyFlag.findUnique({
            where: { userId_activeKey: { userId: input.userId, activeKey: scope } },
          })
          if (activeFlag) {
            await tx.safetyFlag.update({
              where: { id: activeFlag.id },
              data: {
                state: 'resolved',
                activeKey: null,
                resolvedAt: input.confirmedAt,
              },
            })
          }
          const next = input.safetyFlags.find((flag) => flag.scope === scope)
          if (next) {
            await tx.safetyFlag.create({
              data: {
                userId: input.userId,
                scope,
                answer: next.answer,
                state: 'unresolved',
                activeKey: scope,
                sourceKind:
                  next.sourceKind.toLowerCase() as Lowercase<typeof next.sourceKind>,
                observedAt: next.observedAt,
              },
            })
          }
        }

        if (
          input.sourceNarrativeRetention === 'SAVE_AS_COACH_NOTE' &&
          current.sourceNarrative
        ) {
          await tx.coachNote.create({
            data: { userId: input.userId, text: current.sourceNarrative },
          })
        }
        const run = await tx.onboardingRun.update({
          where: { id: current.id },
          data: {
            status: 'PROFILE_CONFIRMED',
            draftPayload: {},
            sourceNarrative: null,
            retentionChoice: input.sourceNarrativeRetention,
            profileConfirmedAt: input.confirmedAt,
            revision: { increment: 1 },
          },
        })
        await createReceipt(tx, {
          ...command,
          resultRevision: run.revision,
          resultResourceId: run.id,
        })
        return { replayed: false, run: toRunRecord(run) }
      })
    },

    async createPlanDraft(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)
        const command = { ...input, commandType: 'create_plan_draft' as const }
        const replay = await replayedRun(tx, command)
        if (replay) {
          const plan = await tx.fitnessPlan.findFirst({
            where: { userId: input.userId },
            orderBy: { version: 'desc' },
          })
          if (!plan) throw new OnboardingResourceMismatch('Plan draft is missing')
          return { ...replay, plan: toPlanRecord(plan) }
        }
        const current = await tx.onboardingRun.findUniqueOrThrow({
          where: { userId: input.userId },
        })
        assertRevision(current.revision, input.expectedRevision)
        const latest = await tx.fitnessPlan.findFirst({
          where: { userId: input.userId },
          orderBy: { version: 'desc' },
          select: { version: true },
        })
        const plan = await tx.fitnessPlan.create({
          data: {
            userId: input.userId,
            version: (latest?.version ?? 0) + 1,
            state: 'draft',
            payload: asInputJson(input.payload),
            limitations: asInputJson(input.limitations),
          },
        })
        const run = await tx.onboardingRun.update({
          where: { id: current.id },
          data: { status: 'PLAN_DRAFT_READY', revision: { increment: 1 } },
        })
        await createReceipt(tx, {
          ...command,
          resultRevision: run.revision,
          resultResourceId: plan.id,
        })
        return { replayed: false, run: toRunRecord(run), plan: toPlanRecord(plan) }
      })
    },

    async confirmPlan(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)
        const command = { ...input, commandType: 'confirm_plan' as const }
        const replay = await replayedRun(tx, command)
        if (replay) {
          const plan = await tx.fitnessPlan.findFirst({
            where: { id: input.planId, userId: input.userId, version: input.planVersion },
          })
          if (!plan) throw new OnboardingResourceMismatch('Confirmed plan is missing')
          return { ...replay, plan: toPlanRecord(plan) }
        }
        const current = await tx.onboardingRun.findUniqueOrThrow({
          where: { userId: input.userId },
        })
        assertRevision(current.revision, input.expectedRevision)
        const draft = await tx.fitnessPlan.findFirst({
          where: {
            id: input.planId,
            userId: input.userId,
            version: input.planVersion,
            state: 'draft',
          },
        })
        if (!draft) {
          throw new OnboardingResourceMismatch(
            'The selected plan version is not the current confirmable draft',
          )
        }
        await tx.fitnessPlan.updateMany({
          where: { userId: input.userId, state: 'active' },
          data: {
            state: 'superseded',
            activeKey: null,
            supersededAt: input.confirmedAt,
          },
        })
        const plan = await tx.fitnessPlan.update({
          where: { id: draft.id },
          data: {
            state: 'active',
            activeKey: 'current',
            confirmedAt: input.confirmedAt,
            activatedAt: input.confirmedAt,
          },
        })
        const run = await tx.onboardingRun.update({
          where: { id: current.id },
          data: {
            status: 'PLAN_CONFIRMED',
            planConfirmedAt: input.confirmedAt,
            revision: { increment: 1 },
          },
        })
        await createReceipt(tx, {
          ...command,
          resultRevision: run.revision,
          resultResourceId: plan.id,
        })
        return { replayed: false, run: toRunRecord(run), plan: toPlanRecord(plan) }
      })
    },

    async findLatestPlan(userId) {
      const plan = await db.fitnessPlan.findFirst({
        where: { userId },
        orderBy: { version: 'desc' },
      })
      return plan ? toPlanRecord(plan) : null
    },

    replaceConfirmedFact(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)

        const current = await tx.userFact.findUnique({
          where: {
            userId_activeKey: { userId: input.userId, activeKey: input.factKey },
          },
        })
        const supersededAt = input.confirmedAt
        if (current) {
          await tx.userFact.update({
            where: { id: current.id },
            data: { state: 'superseded', activeKey: null, supersededAt },
          })
        }

        const fact = await tx.userFact.create({
          data: {
            userId: input.userId,
            factKey: input.factKey,
            activeKey: input.factKey,
            value: asInputJson(input.value),
            truthKind: input.truthKind.toLowerCase() as Lowercase<ConfirmedFactInput['truthKind']>,
            sourceKind: input.sourceKind.toLowerCase() as Lowercase<ConfirmedFactInput['sourceKind']>,
            sourceRef: input.sourceRef,
            isApproximate: input.isApproximate,
            observedAt: input.observedAt,
            confirmedAt: input.confirmedAt,
            validFrom: input.confirmedAt,
            supersedesId: current?.id,
          },
        })
        return toFactRecord(fact)
      })
    },

    async listCurrentFacts(userId) {
      const facts = await db.userFact.findMany({
        where: { userId, activeKey: { not: null }, state: 'confirmed' },
        orderBy: [{ factKey: 'asc' }, { recordedAt: 'asc' }],
      })
      return facts.map(toFactRecord)
    },

    deleteFactHistory(userId, factKey) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, userId)
        const result = await tx.userFact.deleteMany({ where: { userId, factKey } })
        return result.count
      })
    },

    replaceConfirmedGoal(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)
        const current = await tx.fitnessGoal.findUnique({
          where: { userId_activeKey: { userId: input.userId, activeKey: 'current' } },
        })
        if (current) {
          await tx.fitnessGoal.update({
            where: { id: current.id },
            data: { state: 'superseded', activeKey: null, supersededAt: input.confirmedAt },
          })
        }
        const goal = await tx.fitnessGoal.create({
          data: {
            userId: input.userId,
            version: (current?.version ?? 0) + 1,
            state: 'confirmed',
            activeKey: 'current',
            bodyGoal: input.bodyGoal.toLowerCase() as Lowercase<typeof input.bodyGoal>,
            trainingGoal: input.trainingGoal.toLowerCase() as Lowercase<typeof input.trainingGoal>,
            primaryPriority: input.primaryPriority,
            desiredWeightKg: input.desiredWeightKg,
            resultStatement: input.resultStatement,
            confirmedAt: input.confirmedAt,
          },
        })
        return { id: goal.id, version: goal.version }
      })
    },

    async addMeasurement(input) {
      const measurement = await db.bodyMeasurement.create({
        data: {
          userId: input.userId,
          kind: input.kind,
          value: input.value,
          unit: input.unit,
          truthKind: input.truthKind.toLowerCase() as Lowercase<typeof input.truthKind>,
          sourceKind: input.sourceKind.toLowerCase() as Lowercase<typeof input.sourceKind>,
          isApproximate: input.isApproximate,
          observedAt: input.observedAt,
        },
      })
      return { id: measurement.id }
    },

    replaceSafetyFlag(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)
        const current = await tx.safetyFlag.findUnique({
          where: { userId_activeKey: { userId: input.userId, activeKey: input.scope } },
        })
        if (current) {
          await tx.safetyFlag.update({
            where: { id: current.id },
            data: { state: 'resolved', activeKey: null, resolvedAt: new Date() },
          })
        }
        const flag = await tx.safetyFlag.create({
          data: {
            userId: input.userId,
            scope: input.scope,
            answer: input.answer,
            state: 'unresolved',
            activeKey: input.scope,
            sourceKind: input.sourceKind.toLowerCase() as Lowercase<typeof input.sourceKind>,
            observedAt: input.observedAt,
          },
        })
        return { id: flag.id }
      })
    },

    createPlanVersion(input) {
      return db.$transaction(async (tx) => {
        await acquireOnboardingUserLock(tx, input.userId)
        const latest = await tx.fitnessPlan.findFirst({
          where: { userId: input.userId },
          orderBy: { version: 'desc' },
          select: { version: true },
        })
        const plan = await tx.fitnessPlan.create({
          data: {
            userId: input.userId,
            version: (latest?.version ?? 0) + 1,
            state: 'draft',
            payloadSchemaVersion: input.payloadSchemaVersion,
            payload: asInputJson(input.payload),
            evidenceVersion: input.evidenceVersion,
            limitations: asInputJson(input.limitations),
          },
        })
        return { id: plan.id, version: plan.version }
      })
    },

    async saveCoachNote(userId, text) {
      const note = await db.coachNote.create({ data: { userId, text } })
      return { id: note.id }
    },

    async readMemory(userId) {
      const [facts, goal, measurements, safetyFlags, plan, coachNotes] = await db.$transaction([
        db.userFact.findMany({
          where: { userId, activeKey: { not: null }, state: 'confirmed' },
          orderBy: [{ factKey: 'asc' }, { recordedAt: 'asc' }],
        }),
        db.fitnessGoal.findUnique({
          where: { userId_activeKey: { userId, activeKey: 'current' } },
          select: { id: true, version: true },
        }),
        db.bodyMeasurement.findMany({
          where: { userId },
          orderBy: { observedAt: 'desc' },
          select: { id: true, kind: true, observedAt: true },
        }),
        db.safetyFlag.findMany({
          where: { userId, activeKey: { not: null }, state: 'unresolved' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, scope: true, answer: true },
        }),
        db.fitnessPlan.findFirst({
          where: { userId, activeKey: 'current' },
          orderBy: { version: 'desc' },
          select: { id: true, version: true, state: true },
        }),
        db.coachNote.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: { id: true, text: true, createdAt: true },
        }),
      ])
      return {
        facts: facts.map(toFactRecord),
        goal,
        measurements,
        safetyFlags,
        plan,
        coachNotes,
      }
    },
  }
}

function acquireOnboardingUserLock(
  db: Pick<DbClient, '$executeRaw'>,
  userId: string,
) {
  return db.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`onboarding:${userId}`}, 0))`,
  )
}

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

type TransactionClient = Prisma.TransactionClient

async function replayedRun(
  tx: TransactionClient,
  input: {
    userId: string
    clientMutationId: string
    commandType: string
    requestHash: string
  },
) {
  const receipt = await tx.onboardingMutationReceipt.findUnique({
    where: {
      userId_clientMutationId: {
        userId: input.userId,
        clientMutationId: input.clientMutationId,
      },
    },
  })
  if (!receipt) return null
  if (receipt.commandType !== input.commandType || receipt.requestHash !== input.requestHash) {
    throw new OnboardingIdempotencyConflict(input.clientMutationId)
  }
  const run = await tx.onboardingRun.findUniqueOrThrow({ where: { userId: input.userId } })
  return { replayed: true, run: toRunRecord(run) }
}

function createReceipt(
  tx: TransactionClient,
  input: {
    userId: string
    clientMutationId: string
    commandType: string
    requestHash: string
    resultRevision: number
    resultResourceId: string
  },
) {
  return tx.onboardingMutationReceipt.create({
    data: {
      userId: input.userId,
      clientMutationId: input.clientMutationId,
      commandType: input.commandType,
      requestHash: input.requestHash,
      resultRevision: input.resultRevision,
      resultResourceId: input.resultResourceId,
    },
  })
}

function assertRevision(actual: number, expected: number) {
  if (actual !== expected) throw new OnboardingRevisionConflict(expected, actual)
}

async function replaceFact(tx: TransactionClient, input: ConfirmedFactInput) {
  const current = await tx.userFact.findUnique({
    where: { userId_activeKey: { userId: input.userId, activeKey: input.factKey } },
  })
  if (current) {
    await tx.userFact.update({
      where: { id: current.id },
      data: {
        state: 'superseded',
        activeKey: null,
        supersededAt: input.confirmedAt,
      },
    })
  }
  return tx.userFact.create({
    data: {
      userId: input.userId,
      factKey: input.factKey,
      activeKey: input.factKey,
      value: asInputJson(input.value),
      truthKind: input.truthKind.toLowerCase() as Lowercase<ConfirmedFactInput['truthKind']>,
      sourceKind: input.sourceKind.toLowerCase() as Lowercase<ConfirmedFactInput['sourceKind']>,
      sourceRef: input.sourceRef,
      isApproximate: input.isApproximate,
      observedAt: input.observedAt,
      confirmedAt: input.confirmedAt,
      validFrom: input.confirmedAt,
      supersedesId: current?.id,
    },
  })
}

function toRunRecord(run: OnboardingRun): OnboardingRunRecord {
  return {
    id: run.id,
    userId: run.userId,
    status: run.status,
    initialEntryMode: run.initialEntryMode,
    resumeStatus: run.resumeStatus,
    draftPayload: run.draftPayload,
    sourceNarrative: run.sourceNarrative,
    sourceKind: run.sourceKind,
    revision: run.revision,
    updatedAt: run.updatedAt,
  }
}

function toFactRecord(fact: UserFact): UserFactRecord {
  return {
    id: fact.id,
    userId: fact.userId,
    factKey: fact.factKey as OnboardingFieldKey,
    value: fact.value,
    truthKind: fact.truthKind.toUpperCase() as UserFactRecord['truthKind'],
    state: fact.state,
    sourceKind: fact.sourceKind.toUpperCase() as UserFactRecord['sourceKind'],
    sourceRef: fact.sourceRef ?? undefined,
    isApproximate: fact.isApproximate,
    observedAt: fact.observedAt ?? undefined,
    confirmedAt: fact.confirmedAt,
    supersedesId: fact.supersedesId,
    recordedAt: fact.recordedAt,
    supersededAt: fact.supersededAt,
  }
}

function toPlanRecord(plan: FitnessPlan): OnboardingPlanRecord {
  if (plan.state !== 'draft' && plan.state !== 'active') {
    throw new OnboardingResourceMismatch(`Plan ${plan.id} is not visible in onboarding`)
  }
  return {
    id: plan.id,
    userId: plan.userId,
    version: plan.version,
    state: plan.state,
    payload: plan.payload,
    limitations: plan.limitations,
    evidenceVersion: plan.evidenceVersion,
  }
}
