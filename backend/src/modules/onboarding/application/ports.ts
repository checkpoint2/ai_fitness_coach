import type {
  OnboardingFieldKey,
  OnboardingStatus,
} from '@ai-fitness-coach/contracts'

export type OnboardingRunRecord = {
  id: string
  userId: string
  status: OnboardingStatus
  initialEntryMode: 'STRUCTURED' | 'TEXT' | 'VOICE_TRANSCRIPT' | null
  resumeStatus: OnboardingStatus | null
  draftPayload: unknown
  sourceNarrative: string | null
  sourceKind: 'NONE' | 'STRUCTURED' | 'USER_TEXT' | 'VOICE_TRANSCRIPT'
  revision: number
  updatedAt: Date
}

export type SaveOnboardingDraftInput = {
  userId: string
  expectedRevision: number
  clientMutationId: string
  requestHash: string
  initialEntryMode?: 'STRUCTURED' | 'TEXT' | 'VOICE_TRANSCRIPT'
  draftPayload: unknown
  sourceNarrative?: string | null
  sourceKind: 'NONE' | 'STRUCTURED' | 'USER_TEXT' | 'VOICE_TRANSCRIPT'
  targetStatus: 'COLLECTING' | 'REVIEW_REQUIRED'
}

export type ConfirmedFactInput = {
  userId: string
  factKey: OnboardingFieldKey
  value: unknown
  truthKind: 'FACT' | 'ESTIMATE' | 'INFERENCE' | 'HYPOTHESIS'
  sourceKind: 'STRUCTURED' | 'USER_TEXT' | 'VOICE_TRANSCRIPT' | 'AI_EXTRACTED' | 'IMPORT'
  sourceRef?: string
  isApproximate: boolean
  observedAt?: Date
  confirmedAt: Date
}

export type UserFactRecord = ConfirmedFactInput & {
  id: string
  state: 'confirmed' | 'superseded'
  supersedesId: string | null
  recordedAt: Date
  supersededAt: Date | null
}

export type FitnessGoalInput = {
  userId: string
  bodyGoal: 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMPOSITION' | 'MAINTENANCE'
  trainingGoal: 'GENERAL_FITNESS' | 'STRENGTH' | 'ENDURANCE' | 'MOBILITY_RECOVERY'
  primaryPriority?: string
  desiredWeightKg?: number
  resultStatement?: string
  confirmedAt: Date
}

export type BodyMeasurementInput = {
  userId: string
  kind: 'weight' | 'waist' | 'body_fat'
  value: number
  unit: 'kg' | 'cm' | 'percent'
  truthKind: ConfirmedFactInput['truthKind']
  sourceKind: ConfirmedFactInput['sourceKind']
  isApproximate: boolean
  observedAt: Date
}

export type SafetyFlagInput = {
  userId: string
  scope: 'training' | 'nutrition'
  answer: 'yes' | 'unsure' | 'declined'
  sourceKind: ConfirmedFactInput['sourceKind']
  observedAt?: Date
}

export type FitnessPlanInput = {
  userId: string
  payloadSchemaVersion: number
  payload: unknown
  evidenceVersion?: string
  limitations: unknown
}

export type PersistentMemorySnapshot = {
  facts: UserFactRecord[]
  goal: { id: string; version: number } | null
  measurements: { id: string; kind: string; observedAt: Date }[]
  safetyFlags: { id: string; scope: string; answer: string }[]
  plan: { id: string; version: number; state: string } | null
  coachNotes: { id: string; text: string; createdAt: Date }[]
}

export type OnboardingPlanRecord = {
  id: string
  userId: string
  version: number
  state: 'draft' | 'active'
  payload: unknown
  limitations: unknown
  evidenceVersion: string | null
}

export type CreatePlanDraftPersistenceInput = {
  userId: string
  expectedRevision: number
  clientMutationId: string
  requestHash: string
  payload: unknown
  limitations: unknown
}

export type ConfirmPlanPersistenceInput = {
  userId: string
  expectedRevision: number
  clientMutationId: string
  requestHash: string
  planId: string
  planVersion: number
  confirmedAt: Date
}

export type OnboardingTransitionInput = {
  userId: string
  expectedRevision: number
  clientMutationId: string
  requestHash: string
  commandType: 'pause' | 'resume' | 'complete'
  targetStatus: OnboardingStatus
  resumeStatus?: OnboardingStatus | null
  transitionedAt?: Date
}

export type ConfirmProfilePersistenceInput = {
  userId: string
  expectedRevision: number
  clientMutationId: string
  requestHash: string
  facts: Omit<ConfirmedFactInput, 'userId'>[]
  goal: Omit<FitnessGoalInput, 'userId'>
  measurement: Omit<BodyMeasurementInput, 'userId'>
  safetyFlags: Omit<SafetyFlagInput, 'userId'>[]
  sourceNarrativeRetention: 'DELETE' | 'SAVE_AS_COACH_NOTE'
  confirmedAt: Date
}

export interface OnboardingRepository {
  findMutationReceipt(
    userId: string,
    clientMutationId: string,
  ): Promise<{ commandType: string; requestHash: string } | null>
  findRun(userId: string): Promise<OnboardingRunRecord | null>
  saveDraft(
    input: SaveOnboardingDraftInput,
  ): Promise<{ replayed: boolean; run: OnboardingRunRecord }>
  transition(
    input: OnboardingTransitionInput,
  ): Promise<{ replayed: boolean; run: OnboardingRunRecord }>
  confirmProfile(
    input: ConfirmProfilePersistenceInput,
  ): Promise<{ replayed: boolean; run: OnboardingRunRecord }>
  createPlanDraft(
    input: CreatePlanDraftPersistenceInput,
  ): Promise<{ replayed: boolean; run: OnboardingRunRecord; plan: OnboardingPlanRecord }>
  confirmPlan(
    input: ConfirmPlanPersistenceInput,
  ): Promise<{ replayed: boolean; run: OnboardingRunRecord; plan: OnboardingPlanRecord }>
  findLatestPlan(userId: string): Promise<OnboardingPlanRecord | null>
  replaceConfirmedFact(input: ConfirmedFactInput): Promise<UserFactRecord>
  listCurrentFacts(userId: string): Promise<UserFactRecord[]>
  deleteFactHistory(userId: string, factKey: OnboardingFieldKey): Promise<number>
  replaceConfirmedGoal(input: FitnessGoalInput): Promise<{ id: string; version: number }>
  addMeasurement(input: BodyMeasurementInput): Promise<{ id: string }>
  replaceSafetyFlag(input: SafetyFlagInput): Promise<{ id: string }>
  createPlanVersion(input: FitnessPlanInput): Promise<{ id: string; version: number }>
  saveCoachNote(userId: string, text: string): Promise<{ id: string }>
  readMemory(userId: string): Promise<PersistentMemorySnapshot>
}
