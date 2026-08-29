import type {
  OnboardingReadinessResult,
  OnboardingStatus,
} from '@ai-fitness-coach/contracts'

const transitions: Readonly<Record<OnboardingStatus, readonly OnboardingStatus[]>> = {
  NOT_STARTED: ['COLLECTING'],
  COLLECTING: ['REVIEW_REQUIRED', 'PAUSED'],
  REVIEW_REQUIRED: ['COLLECTING', 'PROFILE_CONFIRMED', 'PAUSED'],
  PROFILE_CONFIRMED: ['PLAN_DRAFT_READY', 'PAUSED'],
  PLAN_DRAFT_READY: ['PLAN_CONFIRMED', 'PAUSED'],
  PLAN_CONFIRMED: ['COMPLETED', 'PAUSED'],
  COMPLETED: [],
  PAUSED: [],
}

const resumableStatuses = new Set<OnboardingStatus>([
  'COLLECTING',
  'REVIEW_REQUIRED',
  'PROFILE_CONFIRMED',
  'PLAN_DRAFT_READY',
  'PLAN_CONFIRMED',
])

export function canTransitionOnboarding(
  from: OnboardingStatus,
  to: OnboardingStatus,
  options: { resumeStatus?: OnboardingStatus } = {},
) {
  if (from === 'PAUSED') {
    return options.resumeStatus === to && resumableStatuses.has(to)
  }
  return transitions[from].includes(to)
}

export type OnboardingReadinessInput = {
  adultConfirmed: boolean
  hasHeight: boolean
  hasCurrentWeight: boolean
  hasBodyGoal: boolean
  hasTrainingGoal: boolean
  hasTrainingContext: boolean
  hasActivityContext: boolean
  hasNutritionContext: boolean
  hasSafetyCheckpointAnswers: boolean
  hasBirthYear: boolean
  hasCalculationSex: boolean
  trainingSafetyBlocked: boolean
  nutritionSafetyBlocked: boolean
}

export function evaluateOnboardingReadiness(
  input: OnboardingReadinessInput,
): OnboardingReadinessResult {
  const reasonCodes: OnboardingReadinessResult['reasonCodes'] = []
  if (!input.adultConfirmed) reasonCodes.push('ADULT_CONFIRMATION_REQUIRED')

  const profileDataComplete =
    input.hasHeight &&
    input.hasCurrentWeight &&
    input.hasBodyGoal &&
    input.hasTrainingGoal &&
    input.hasTrainingContext &&
    input.hasActivityContext &&
    input.hasNutritionContext &&
    input.hasSafetyCheckpointAnswers
  if (!profileDataComplete) reasonCodes.push('PROFILE_DATA_INCOMPLETE')

  const profile = input.adultConfirmed && profileDataComplete ? 'READY' : 'BLOCKED'
  if (profile === 'BLOCKED') {
    return {
      overall: 'BLOCKED',
      profile,
      trainingPlan: 'BLOCKED',
      nutritionPlan: 'BLOCKED',
      reasonCodes,
    }
  }

  const trainingPlan = input.trainingSafetyBlocked ? 'BLOCKED' : 'READY'
  const nutritionPlan = input.nutritionSafetyBlocked ? 'BLOCKED' : 'READY'
  if (input.trainingSafetyBlocked) reasonCodes.push('TRAINING_SAFETY_REVIEW_REQUIRED')
  if (input.nutritionSafetyBlocked) reasonCodes.push('NUTRITION_SAFETY_REVIEW_REQUIRED')

  if (!input.hasBirthYear || !input.hasCalculationSex) {
    reasonCodes.push('CALCULATION_INPUT_INCOMPLETE')
  }

  const bothPlansBlocked = trainingPlan === 'BLOCKED' && nutritionPlan === 'BLOCKED'
  const limited =
    trainingPlan === 'BLOCKED' ||
    nutritionPlan === 'BLOCKED' ||
    !input.hasBirthYear ||
    !input.hasCalculationSex

  return {
    overall: bothPlansBlocked ? 'BLOCKED' : limited ? 'LIMITED' : 'READY',
    profile,
    trainingPlan,
    nutritionPlan,
    reasonCodes,
  }
}
