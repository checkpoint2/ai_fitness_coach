import {
  onboardingDraftPatchSchema,
  type ConfirmOnboardingPlanRequest,
  type ConfirmOnboardingProfileRequest,
  type OnboardingDraftPatch,
  type OnboardingFieldKey,
  type OnboardingMutationRequest,
  type OnboardingReadinessResult,
  type OnboardingSnapshot,
  type OnboardingStatus,
  type SaveOnboardingDraftRequest,
} from '@ai-fitness-coach/contracts'

import { OnboardingFlowFailure } from '../domain/flow-errors'
import { OnboardingIdempotencyConflict } from '../domain/persistence-errors'
import {
  canTransitionOnboarding,
  evaluateOnboardingReadiness,
} from '../domain/onboarding-state'
import type {
  ConfirmedFactInput,
  OnboardingRepository,
  OnboardingRunRecord,
  UserFactRecord,
} from './ports'
import type { OnboardingContextBuilder } from './onboarding-context-builder'

type OnboardingServiceOptions = {
  clock: { now(): Date }
  contextBuilder: OnboardingContextBuilder
  requestHasher: { hash(value: unknown): string }
  repository: OnboardingRepository
}

type FieldValue = {
  value: unknown
  sourceKind: ConfirmedFactInput['sourceKind']
  isApproximate: boolean
}

export class OnboardingService {
  constructor(private readonly options: OnboardingServiceOptions) {}

  async getSnapshot(userId: string): Promise<OnboardingSnapshot> {
    const run = await this.options.repository.findRun(userId)
    if (!run) return emptySnapshot()
    return this.snapshotFor(run)
  }

  async saveDraft(
    userId: string,
    request: SaveOnboardingDraftRequest,
  ): Promise<OnboardingSnapshot> {
    if (await this.isReplay(userId, request.clientMutationId, 'save_draft', request)) {
      return this.getSnapshot(userId)
    }
    const current = await this.options.repository.findRun(userId)
    if (current && !['NOT_STARTED', 'COLLECTING', 'REVIEW_REQUIRED'].includes(current.status)) {
      throw new OnboardingFlowFailure(
        'invalid_state',
        `Draft cannot be edited while onboarding is ${current.status}`,
      )
    }
    const currentPatch = current
      ? onboardingDraftPatchSchema.parse(current.draftPayload)
      : {}
    const patch = onboardingDraftPatchSchema.parse({ ...currentPatch, ...request.patch })
    const readiness = readinessFromValues(valuesFromPatch(patch))
    const targetStatus = readiness.profile === 'READY' ? 'REVIEW_REQUIRED' : 'COLLECTING'
    const sourceKind = draftSourceKind(request, current)
    const result = await this.options.repository.saveDraft({
      userId,
      expectedRevision: request.expectedRevision,
      clientMutationId: request.clientMutationId,
      requestHash: this.options.requestHasher.hash(request),
      initialEntryMode: request.initialEntryMode,
      draftPayload: patch,
      sourceNarrative: request.sourceNarrative,
      sourceKind,
      targetStatus,
    })
    return this.snapshotFor(result.run)
  }

  async pause(
    userId: string,
    request: OnboardingMutationRequest,
  ): Promise<OnboardingSnapshot> {
    if (await this.isReplay(userId, request.clientMutationId, 'pause', request)) {
      return this.getSnapshot(userId)
    }
    const run = await this.requireRun(userId)
    if (!canTransitionOnboarding(run.status, 'PAUSED')) {
      throw new OnboardingFlowFailure(
        'invalid_state',
        `Onboarding cannot pause from ${run.status}`,
      )
    }
    const result = await this.options.repository.transition({
      userId,
      ...request,
      requestHash: this.options.requestHasher.hash(request),
      commandType: 'pause',
      targetStatus: 'PAUSED',
      resumeStatus: run.status,
    })
    return this.snapshotFor(result.run)
  }

  async resume(
    userId: string,
    request: OnboardingMutationRequest,
  ): Promise<OnboardingSnapshot> {
    if (await this.isReplay(userId, request.clientMutationId, 'resume', request)) {
      return this.getSnapshot(userId)
    }
    const run = await this.requireRun(userId)
    if (
      run.status !== 'PAUSED' ||
      !run.resumeStatus ||
      !canTransitionOnboarding('PAUSED', run.resumeStatus, { resumeStatus: run.resumeStatus })
    ) {
      throw new OnboardingFlowFailure('invalid_state', 'Onboarding is not resumable')
    }
    const result = await this.options.repository.transition({
      userId,
      ...request,
      requestHash: this.options.requestHasher.hash(request),
      commandType: 'resume',
      targetStatus: run.resumeStatus,
      resumeStatus: null,
    })
    return this.snapshotFor(result.run)
  }

  async confirmProfile(
    userId: string,
    request: ConfirmOnboardingProfileRequest,
  ): Promise<OnboardingSnapshot> {
    if (await this.isReplay(userId, request.clientMutationId, 'confirm_profile', request)) {
      return this.getSnapshot(userId)
    }
    const run = await this.requireRun(userId)
    if (run.status !== 'REVIEW_REQUIRED') {
      throw new OnboardingFlowFailure(
        'invalid_state',
        `Profile cannot be confirmed while onboarding is ${run.status}`,
      )
    }
    const patch = onboardingDraftPatchSchema.parse(run.draftPayload)
    assertExactConfirmation(patch, request.confirmedFieldKeys)
    const values = valuesFromPatch(patch)
    const readiness = readinessFromValues(values)
    if (readiness.profile !== 'READY') {
      throw new OnboardingFlowFailure(
        'incomplete_profile',
        'Required onboarding data is incomplete',
        readiness.reasonCodes,
      )
    }
    if (
      request.sourceNarrativeRetention === 'SAVE_AS_COACH_NOTE' &&
      !run.sourceNarrative
    ) {
      throw new OnboardingFlowFailure(
        'source_narrative_missing',
        'There is no source narrative to save as a coach note',
      )
    }

    const now = this.options.clock.now()
    const bodyGoal = requiredValue<string>(values, 'bodyGoal')
    const trainingGoal = requiredValue<string>(values, 'trainingGoal')
    const currentWeight = requiredField(values, 'currentWeightKg')
    const result = await this.options.repository.confirmProfile({
      userId,
      expectedRevision: request.expectedRevision,
      clientMutationId: request.clientMutationId,
      requestHash: this.options.requestHasher.hash(request),
      facts: [...values.entries()].map(([factKey, field]) => ({
        factKey: factKey as OnboardingFieldKey,
        value: field.value,
        truthKind: field.isApproximate ? 'ESTIMATE' : 'FACT',
        sourceKind: field.sourceKind,
        isApproximate: field.isApproximate,
        confirmedAt: now,
      })),
      goal: {
        bodyGoal: bodyGoal as 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMPOSITION' | 'MAINTENANCE',
        trainingGoal: trainingGoal as
          | 'GENERAL_FITNESS'
          | 'STRENGTH'
          | 'ENDURANCE'
          | 'MOBILITY_RECOVERY',
        primaryPriority: optionalValue<string>(values, 'primaryPriority'),
        desiredWeightKg: optionalValue<number>(values, 'desiredWeightKg'),
        resultStatement: optionalValue<string>(values, 'resultStatement'),
        confirmedAt: now,
      },
      measurement: {
        kind: 'weight',
        value: currentWeight.value as number,
        unit: 'kg',
        truthKind: currentWeight.isApproximate ? 'ESTIMATE' : 'FACT',
        sourceKind: currentWeight.sourceKind,
        isApproximate: currentWeight.isApproximate,
        observedAt: now,
      },
      safetyFlags: safetyFlags(values, now),
      sourceNarrativeRetention: request.sourceNarrativeRetention,
      confirmedAt: now,
    })
    return this.snapshotFor(result.run)
  }

  async createPlanDraft(
    userId: string,
    request: OnboardingMutationRequest,
  ): Promise<OnboardingSnapshot> {
    if (
      await this.isReplay(userId, request.clientMutationId, 'create_plan_draft', request)
    ) {
      return this.getSnapshot(userId)
    }
    const run = await this.requireRun(userId)
    if (run.status !== 'PROFILE_CONFIRMED') {
      throw new OnboardingFlowFailure(
        'invalid_state',
        `Plan draft cannot be created while onboarding is ${run.status}`,
      )
    }
    const context = await this.options.contextBuilder.forPlanDraft(userId)
    const values = new Map(
      context.facts.map((fact) => [
        fact.key,
        {
          value: fact.value,
          sourceKind: fact.sourceKind,
          isApproximate: fact.isApproximate,
        },
      ]),
    )
    const readiness = readinessFromValues(values)
    if (readiness.overall === 'BLOCKED') {
      throw new OnboardingFlowFailure(
        'incomplete_profile',
        'No automatic plan section can be created for the current safety context',
        readiness.reasonCodes,
      )
    }
    const result = await this.options.repository.createPlanDraft({
      userId,
      ...request,
      requestHash: this.options.requestHasher.hash(request),
      payload: planEnvelopePayload(values),
      limitations: planLimitations(readiness),
    })
    return this.snapshotFor(result.run)
  }

  async confirmPlan(
    userId: string,
    request: ConfirmOnboardingPlanRequest,
  ): Promise<OnboardingSnapshot> {
    if (await this.isReplay(userId, request.clientMutationId, 'confirm_plan', request)) {
      return this.getSnapshot(userId)
    }
    const run = await this.requireRun(userId)
    if (run.status !== 'PLAN_DRAFT_READY') {
      throw new OnboardingFlowFailure(
        'invalid_state',
        `Plan cannot be confirmed while onboarding is ${run.status}`,
      )
    }
    const result = await this.options.repository.confirmPlan({
      userId,
      ...request,
      requestHash: this.options.requestHasher.hash(request),
      confirmedAt: this.options.clock.now(),
    })
    return this.snapshotFor(result.run)
  }

  async complete(
    userId: string,
    request: OnboardingMutationRequest,
  ): Promise<OnboardingSnapshot> {
    if (await this.isReplay(userId, request.clientMutationId, 'complete', request)) {
      return this.getSnapshot(userId)
    }
    const run = await this.requireRun(userId)
    if (!canTransitionOnboarding(run.status, 'COMPLETED')) {
      throw new OnboardingFlowFailure(
        'invalid_state',
        `Onboarding cannot complete from ${run.status}`,
      )
    }
    const result = await this.options.repository.transition({
      userId,
      ...request,
      requestHash: this.options.requestHasher.hash(request),
      commandType: 'complete',
      targetStatus: 'COMPLETED',
      transitionedAt: this.options.clock.now(),
    })
    return this.snapshotFor(result.run)
  }

  private async requireRun(userId: string) {
    const run = await this.options.repository.findRun(userId)
    if (!run) throw new OnboardingFlowFailure('invalid_state', 'Onboarding has not started')
    return run
  }

  private async isReplay(
    userId: string,
    clientMutationId: string,
    commandType: string,
    request: unknown,
  ) {
    const receipt = await this.options.repository.findMutationReceipt(
      userId,
      clientMutationId,
    )
    if (!receipt) return false
    if (
      receipt.commandType !== commandType ||
      receipt.requestHash !== this.options.requestHasher.hash(request)
    ) {
      throw new OnboardingIdempotencyConflict(clientMutationId)
    }
    return true
  }

  private async snapshotFor(run: OnboardingRunRecord): Promise<OnboardingSnapshot> {
    const patch = onboardingDraftPatchSchema.parse(run.draftPayload)
    const values =
      run.status === 'PROFILE_CONFIRMED' ||
      run.status === 'PLAN_DRAFT_READY' ||
      run.status === 'PLAN_CONFIRMED' ||
      run.status === 'COMPLETED'
        ? valuesFromFacts((await this.options.repository.readMemory(run.userId)).facts)
        : valuesFromPatch(patch)
    const readiness = readinessFromValues(values)
    const plan = await this.options.repository.findLatestPlan(run.userId)
    return {
      status: run.status,
      revision: run.revision,
      initialEntryMode: run.initialEntryMode,
      patch,
      readiness,
      safetyBlocks: safetyBlocks(readiness),
      nextAction: nextAction(run.status),
      plan: plan
        ? {
            id: plan.id,
            version: plan.version,
            state: plan.state === 'draft' ? 'DRAFT' : 'ACTIVE',
            payload: plan.payload,
            limitations: stringArray(plan.limitations),
            evidenceVersion: plan.evidenceVersion,
          }
        : null,
    }
  }
}

function emptySnapshot(): OnboardingSnapshot {
  const readiness = readinessFromValues(new Map())
  return {
    status: 'NOT_STARTED',
    revision: 0,
    initialEntryMode: null,
    patch: {},
    readiness,
    safetyBlocks: [],
    nextAction: 'START',
    plan: null,
  }
}

function valuesFromPatch(patch: OnboardingDraftPatch) {
  const values = new Map<string, FieldValue>()
  for (const [key, field] of Object.entries(patch)) {
    if (field?.state !== 'DRAFT') continue
    values.set(key, {
      value: field.value,
      sourceKind: field.sourceKind,
      isApproximate: field.isApproximate,
    })
  }
  return values
}

function valuesFromFacts(facts: UserFactRecord[]) {
  return new Map(
    facts.map((fact) => [
      fact.factKey,
      {
        value: fact.value,
        sourceKind: fact.sourceKind,
        isApproximate: fact.isApproximate,
      },
    ]),
  )
}

function readinessFromValues(values: Map<string, FieldValue>) {
  const safety = safetyAnswers(values)
  return evaluateOnboardingReadiness({
    adultConfirmed: values.get('adultConfirmed')?.value === true,
    hasHeight: values.has('heightCm'),
    hasCurrentWeight: values.has('currentWeightKg'),
    hasBodyGoal: values.has('bodyGoal'),
    hasTrainingGoal: values.has('trainingGoal'),
    hasTrainingContext:
      values.has('trainingExperience') &&
      values.has('trainingLocations') &&
      hasRequiredEquipmentContext(values) &&
      values.has('trainingDaysPerWeek') &&
      values.has('workoutDurationMinutes'),
    hasActivityContext: values.has('ordinaryDayDescription'),
    hasNutritionContext:
      values.has('allergiesAndExclusions') &&
      values.has('nutritionTrackingMode'),
    hasSafetyCheckpointAnswers: [
      'currentPainOrInjury',
      'doctorRestriction',
      'ordinaryFitnessSuitabilityDoubt',
      'supervisedNutritionOrActivityOnly',
    ].every((key) => values.has(key)),
    hasBirthYear: answerHasValue(values.get('birthYear')?.value),
    hasCalculationSex: answerHasValue(values.get('calculationSex')?.value),
    trainingSafetyBlocked: safety.training,
    nutritionSafetyBlocked: safety.nutrition,
  })
}

function hasRequiredEquipmentContext(values: Map<string, FieldValue>) {
  const locations = values.get('trainingLocations')?.value
  if (!Array.isArray(locations)) return false
  const requiresEquipmentAnswer = locations.includes('HOME') || locations.includes('GYM')
  return !requiresEquipmentAnswer || values.has('equipment')
}

function safetyAnswers(values: Map<string, FieldValue>) {
  const blocks = (key: string) => {
    const value = values.get(key)?.value
    return value !== undefined && value !== 'NO'
  }
  return {
    training:
      blocks('currentPainOrInjury') ||
      blocks('doctorRestriction') ||
      blocks('ordinaryFitnessSuitabilityDoubt') ||
      blocks('supervisedNutritionOrActivityOnly'),
    nutrition: blocks('supervisedNutritionOrActivityOnly'),
  }
}

function safetyFlags(values: Map<string, FieldValue>, observedAt: Date) {
  const answerRank = { YES: 3, UNSURE: 2, DECLINED: 1 } as const
  const build = (scope: 'training' | 'nutrition', keys: string[]) => {
    const candidates = keys
      .map((key) => values.get(key))
      .filter((field): field is FieldValue => Boolean(field && field.value !== 'NO'))
      .sort(
        (left, right) =>
          answerRank[right.value as keyof typeof answerRank] -
          answerRank[left.value as keyof typeof answerRank],
      )
    const field = candidates[0]
    if (!field) return null
    return {
      scope,
      answer: String(field.value).toLowerCase() as 'yes' | 'unsure' | 'declined',
      sourceKind: field.sourceKind,
      observedAt,
    }
  }
  return [
    build('training', [
      'currentPainOrInjury',
      'doctorRestriction',
      'ordinaryFitnessSuitabilityDoubt',
      'supervisedNutritionOrActivityOnly',
    ]),
    build('nutrition', ['supervisedNutritionOrActivityOnly']),
  ].filter((flag): flag is NonNullable<typeof flag> => flag !== null)
}

function assertExactConfirmation(
  patch: OnboardingDraftPatch,
  confirmedFieldKeys: OnboardingFieldKey[],
) {
  const draftKeys = Object.entries(patch)
    .filter(([, field]) => field?.state === 'DRAFT')
    .map(([key]) => key)
    .sort()
  const confirmed = [...confirmedFieldKeys].sort()
  if (JSON.stringify(draftKeys) !== JSON.stringify(confirmed)) {
    throw new OnboardingFlowFailure(
      'invalid_confirmation',
      'Every draft field must be reviewed before profile confirmation',
      { draftKeys, confirmedFieldKeys: confirmed },
    )
  }
}

function requiredField(values: Map<string, FieldValue>, key: string) {
  const field = values.get(key)
  if (!field) {
    throw new OnboardingFlowFailure('incomplete_profile', `Missing required field ${key}`)
  }
  return field
}

function requiredValue<T>(values: Map<string, FieldValue>, key: string) {
  return requiredField(values, key).value as T
}

function optionalValue<T>(values: Map<string, FieldValue>, key: string) {
  return values.get(key)?.value as T | undefined
}

function answerHasValue(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'kind' in value && value.kind === 'VALUE')
}

function safetyBlocks(readiness: OnboardingReadinessResult) {
  const blocks: ('TRAINING' | 'NUTRITION')[] = []
  if (readiness.trainingPlan === 'BLOCKED') blocks.push('TRAINING')
  if (readiness.nutritionPlan === 'BLOCKED') blocks.push('NUTRITION')
  return blocks
}

function nextAction(status: OnboardingStatus): OnboardingSnapshot['nextAction'] {
  const actions: Record<OnboardingStatus, OnboardingSnapshot['nextAction']> = {
    NOT_STARTED: 'START',
    COLLECTING: 'CONTINUE_DRAFT',
    REVIEW_REQUIRED: 'REVIEW_DRAFT',
    PROFILE_CONFIRMED: 'REVIEW_PLAN',
    PLAN_DRAFT_READY: 'REVIEW_PLAN',
    PLAN_CONFIRMED: 'OPEN_TODAY',
    COMPLETED: 'NONE',
    PAUSED: 'CONTINUE_DRAFT',
  }
  return actions[status]
}

function draftSourceKind(
  request: SaveOnboardingDraftRequest,
  current: OnboardingRunRecord | null,
) {
  if (request.sourceNarrative === null) return 'NONE' as const
  if (request.sourceNarrative === undefined) {
    return current?.sourceKind ?? ('STRUCTURED' as const)
  }
  const mode = request.initialEntryMode ?? current?.initialEntryMode
  if (mode === 'VOICE_TRANSCRIPT') return 'VOICE_TRANSCRIPT' as const
  if (mode === 'TEXT') return 'USER_TEXT' as const
  return 'STRUCTURED' as const
}

function planEnvelopePayload(values: Map<string, FieldValue>) {
  return {
    schemaVersion: 1,
    kind: 'PILOT_STARTING_STRATEGY',
    goal: {
      body: requiredValue(values, 'bodyGoal'),
      training: requiredValue(values, 'trainingGoal'),
      primaryPriority: optionalValue(values, 'primaryPriority') ?? null,
    },
    trainingContext: {
      locations: requiredValue(values, 'trainingLocations'),
      daysPerWeek: requiredValue(values, 'trainingDaysPerWeek'),
      durationMinutes: requiredValue(values, 'workoutDurationMinutes'),
      equipment: optionalValue(values, 'equipment') ?? [],
    },
    nutritionContext: {
      trackingMode: requiredValue(values, 'nutritionTrackingMode'),
    },
  }
}

function planLimitations(readiness: OnboardingReadinessResult) {
  const limitations = [
    'ENERGY_TARGET_PENDING_EVIDENCE_REVIEW',
    'TRAINING_CONTENT_PENDING_EVIDENCE_REVIEW',
  ]
  if (readiness.reasonCodes.includes('CALCULATION_INPUT_INCOMPLETE')) {
    limitations.push('CALCULATION_INPUT_INCOMPLETE')
  }
  if (readiness.trainingPlan === 'BLOCKED') limitations.push('TRAINING_SAFETY_REVIEW_REQUIRED')
  if (readiness.nutritionPlan === 'BLOCKED') limitations.push('NUTRITION_SAFETY_REVIEW_REQUIRED')
  return limitations
}

function stringArray(value: unknown) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error('Stored plan limitations are invalid')
  }
  return value
}
