import { z } from 'zod'

export const onboardingStatusSchema = z.enum([
  'NOT_STARTED',
  'COLLECTING',
  'REVIEW_REQUIRED',
  'PROFILE_CONFIRMED',
  'PLAN_DRAFT_READY',
  'PLAN_CONFIRMED',
  'COMPLETED',
  'PAUSED',
])

export const onboardingEntryModeSchema = z.enum(['STRUCTURED', 'TEXT', 'VOICE_TRANSCRIPT'])
export const onboardingFieldStateSchema = z.enum(['UNKNOWN', 'DRAFT', 'CONFIRMED', 'SUPERSEDED'])
export const onboardingReadinessSchema = z.enum(['READY', 'LIMITED', 'BLOCKED'])
export const onboardingSourceKindSchema = z.enum([
  'NONE',
  'STRUCTURED',
  'USER_TEXT',
  'VOICE_TRANSCRIPT',
  'AI_EXTRACTED',
  'IMPORT',
])
export const persistentTruthKindSchema = z.enum([
  'FACT',
  'ESTIMATE',
  'INFERENCE',
  'HYPOTHESIS',
])

export const bodyGoalSchema = z.enum([
  'FAT_LOSS',
  'MUSCLE_GAIN',
  'RECOMPOSITION',
  'MAINTENANCE',
])
export const trainingGoalSchema = z.enum([
  'GENERAL_FITNESS',
  'STRENGTH',
  'ENDURANCE',
  'MOBILITY_RECOVERY',
])
export const trainingLocationSchema = z.enum(['HOME', 'GYM', 'OUTDOORS'])
export const nutritionTrackingModeSchema = z.enum(['FREE_TEXT', 'PRECISE', 'HYBRID'])
export const safetyAnswerSchema = z.enum(['NO', 'YES', 'UNSURE', 'DECLINED'])
export const calculationSexSchema = z.enum(['MALE', 'FEMALE'])

export const birthYearAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('VALUE'), year: z.number().int().min(1900).max(2100) }).strict(),
  z.object({ kind: z.literal('DECLINED') }).strict(),
])
export const calculationSexAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('VALUE'), value: calculationSexSchema }).strict(),
  z.object({ kind: z.literal('DECLINED') }).strict(),
])
export const requiredTextAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('NONE') }).strict(),
  z.object({ kind: z.literal('UNSURE') }).strict(),
  z.object({ kind: z.literal('VALUE'), text: z.string().trim().min(1).max(2_000) }).strict(),
])

const draftSourceKindSchema = onboardingSourceKindSchema.exclude(['NONE', 'IMPORT'])
const sensitiveDraftSourceKindSchema = z.enum(['STRUCTURED', 'USER_TEXT', 'VOICE_TRANSCRIPT'])

const unknownFieldSchema = z
  .object({
    state: z.literal('UNKNOWN'),
    sourceKind: z.literal('NONE'),
    isApproximate: z.literal(false),
  })
  .strict()

function createDraftFieldSchema<T extends z.ZodType, S extends z.ZodType>(
  valueSchema: T,
  sourceSchema: S,
) {
  return z.union([
    unknownFieldSchema,
    z
      .object({
        state: z.literal('DRAFT'),
        value: valueSchema,
        sourceKind: sourceSchema,
        isApproximate: z.boolean(),
        sourceHint: z.string().trim().min(1).max(240).optional(),
      })
      .strict(),
  ])
}

function draftFieldSchema<T extends z.ZodType>(valueSchema: T) {
  return createDraftFieldSchema(valueSchema, draftSourceKindSchema)
}

function sensitiveDraftFieldSchema<T extends z.ZodType>(valueSchema: T) {
  return createDraftFieldSchema(valueSchema, sensitiveDraftSourceKindSchema)
}

const boundedTextSchema = z.string().trim().min(1).max(3_000)
const shortTextSchema = z.string().trim().min(1).max(500)
const equipmentSchema = z.array(z.string().trim().min(1).max(100)).max(50)
const excludedFoodsSchema = z.array(z.string().trim().min(1).max(100)).max(100)

export const onboardingDraftPatchSchema = z
  .object({
    adultConfirmed: sensitiveDraftFieldSchema(z.literal(true)).optional(),
    birthYear: sensitiveDraftFieldSchema(birthYearAnswerSchema).optional(),
    calculationSex: sensitiveDraftFieldSchema(calculationSexAnswerSchema).optional(),
    heightCm: draftFieldSchema(z.number().min(50).max(300)).optional(),
    currentWeightKg: draftFieldSchema(z.number().min(20).max(500)).optional(),
    timezone: draftFieldSchema(z.string().trim().min(1).max(100)).optional(),
    bodyGoal: draftFieldSchema(bodyGoalSchema).optional(),
    trainingGoal: draftFieldSchema(trainingGoalSchema).optional(),
    primaryPriority: draftFieldSchema(shortTextSchema).optional(),
    desiredWeightKg: draftFieldSchema(z.number().min(20).max(500)).optional(),
    resultStatement: draftFieldSchema(boundedTextSchema).optional(),
    trainingExperience: draftFieldSchema(shortTextSchema).optional(),
    trainingLocations: draftFieldSchema(z.array(trainingLocationSchema).min(1).max(3)).optional(),
    equipment: draftFieldSchema(equipmentSchema).optional(),
    trainingDaysPerWeek: draftFieldSchema(z.number().int().min(1).max(7)).optional(),
    workoutDurationMinutes: draftFieldSchema(z.number().int().min(5).max(300)).optional(),
    trainingPreferences: draftFieldSchema(boundedTextSchema).optional(),
    ordinaryDayDescription: draftFieldSchema(boundedTextSchema).optional(),
    regularActivityDescription: draftFieldSchema(boundedTextSchema).optional(),
    sleepRecoveryDescription: draftFieldSchema(boundedTextSchema).optional(),
    allergiesAndExclusions: draftFieldSchema(requiredTextAnswerSchema).optional(),
    dietType: draftFieldSchema(shortTextSchema).optional(),
    excludedFoods: draftFieldSchema(excludedFoodsSchema).optional(),
    nutritionTrackingMode: draftFieldSchema(nutritionTrackingModeSchema).optional(),
    mealPattern: draftFieldSchema(boundedTextSchema).optional(),
    currentPainOrInjury: draftFieldSchema(safetyAnswerSchema).optional(),
    doctorRestriction: draftFieldSchema(safetyAnswerSchema).optional(),
    ordinaryFitnessSuitabilityDoubt: draftFieldSchema(safetyAnswerSchema).optional(),
    supervisedNutritionOrActivityOnly: draftFieldSchema(safetyAnswerSchema).optional(),
  })
  .strict()

export const onboardingFieldKeySchema = z.enum(
  Object.keys(onboardingDraftPatchSchema.shape) as [
    keyof typeof onboardingDraftPatchSchema.shape,
    ...(keyof typeof onboardingDraftPatchSchema.shape)[],
  ],
)

const clientMutationIdSchema = z.uuid()
const expectedRevisionSchema = z.number().int().nonnegative()

export const saveOnboardingDraftRequestSchema = z
  .object({
    expectedRevision: expectedRevisionSchema,
    clientMutationId: clientMutationIdSchema,
    initialEntryMode: onboardingEntryModeSchema.optional(),
    patch: onboardingDraftPatchSchema,
    sourceNarrative: z.string().max(12_000).nullable().optional(),
  })
  .strict()

export const onboardingMutationRequestSchema = z
  .object({
    expectedRevision: expectedRevisionSchema,
    clientMutationId: clientMutationIdSchema,
  })
  .strict()

export const sourceNarrativeRetentionSchema = z.enum(['DELETE', 'SAVE_AS_COACH_NOTE'])
export const confirmOnboardingProfileRequestSchema = onboardingMutationRequestSchema
  .extend({
    confirmedFieldKeys: z
      .array(onboardingFieldKeySchema)
      .min(1)
      .max(Object.keys(onboardingDraftPatchSchema.shape).length)
      .refine((keys) => new Set(keys).size === keys.length, 'Field keys must be unique'),
    sourceNarrativeRetention: sourceNarrativeRetentionSchema.default('DELETE'),
  })
  .strict()

export const onboardingReadinessReasonSchema = z.enum([
  'ADULT_CONFIRMATION_REQUIRED',
  'PROFILE_DATA_INCOMPLETE',
  'CALCULATION_INPUT_INCOMPLETE',
  'TRAINING_SAFETY_REVIEW_REQUIRED',
  'NUTRITION_SAFETY_REVIEW_REQUIRED',
])
export const onboardingSafetyBlockSchema = z.enum(['TRAINING', 'NUTRITION'])
export const onboardingNextActionSchema = z.enum([
  'START',
  'CONTINUE_DRAFT',
  'REVIEW_DRAFT',
  'CONFIRM_PROFILE',
  'REVIEW_PLAN',
  'OPEN_TODAY',
  'NONE',
])

export const onboardingPlanEnvelopeSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    state: z.enum(['DRAFT', 'ACTIVE']),
    payload: z.unknown(),
    limitations: z.array(z.string()),
    evidenceVersion: z.string().nullable(),
  })
  .strict()

export const confirmOnboardingPlanRequestSchema = onboardingMutationRequestSchema
  .extend({
    planId: z.uuid(),
    planVersion: z.number().int().positive(),
  })
  .strict()

export const onboardingReadinessResultSchema = z
  .object({
    overall: onboardingReadinessSchema,
    profile: onboardingReadinessSchema,
    trainingPlan: onboardingReadinessSchema,
    nutritionPlan: onboardingReadinessSchema,
    reasonCodes: z.array(onboardingReadinessReasonSchema),
  })
  .strict()

export const onboardingSnapshotSchema = z
  .object({
    status: onboardingStatusSchema,
    revision: expectedRevisionSchema,
    initialEntryMode: onboardingEntryModeSchema.nullable(),
    patch: onboardingDraftPatchSchema,
    readiness: onboardingReadinessResultSchema,
    safetyBlocks: z.array(onboardingSafetyBlockSchema).max(2),
    nextAction: onboardingNextActionSchema,
    plan: onboardingPlanEnvelopeSchema.nullable(),
  })
  .strict()

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>
export type OnboardingFieldKey = z.infer<typeof onboardingFieldKeySchema>
export type OnboardingDraftPatch = z.infer<typeof onboardingDraftPatchSchema>
export type OnboardingMutationRequest = z.infer<typeof onboardingMutationRequestSchema>
export type OnboardingReadiness = z.infer<typeof onboardingReadinessSchema>
export type OnboardingReadinessReason = z.infer<typeof onboardingReadinessReasonSchema>
export type OnboardingReadinessResult = z.infer<typeof onboardingReadinessResultSchema>
export type SaveOnboardingDraftRequest = z.infer<typeof saveOnboardingDraftRequestSchema>
export type ConfirmOnboardingProfileRequest = z.infer<
  typeof confirmOnboardingProfileRequestSchema
>
export type OnboardingSnapshot = z.infer<typeof onboardingSnapshotSchema>
export type ConfirmOnboardingPlanRequest = z.infer<
  typeof confirmOnboardingPlanRequestSchema
>
