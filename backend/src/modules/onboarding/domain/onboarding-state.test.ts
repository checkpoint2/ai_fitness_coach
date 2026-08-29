import { describe, expect, test } from 'bun:test'

import { canTransitionOnboarding, evaluateOnboardingReadiness } from './onboarding-state'

describe('onboarding state transitions', () => {
  test('allows the approved forward path and an exact pause/resume return', () => {
    expect(canTransitionOnboarding('NOT_STARTED', 'COLLECTING')).toBe(true)
    expect(canTransitionOnboarding('COLLECTING', 'REVIEW_REQUIRED')).toBe(true)
    expect(canTransitionOnboarding('REVIEW_REQUIRED', 'PROFILE_CONFIRMED')).toBe(true)
    expect(canTransitionOnboarding('PROFILE_CONFIRMED', 'PLAN_DRAFT_READY')).toBe(true)
    expect(canTransitionOnboarding('PLAN_DRAFT_READY', 'PLAN_CONFIRMED')).toBe(true)
    expect(canTransitionOnboarding('PLAN_CONFIRMED', 'COMPLETED')).toBe(true)
    expect(canTransitionOnboarding('REVIEW_REQUIRED', 'PAUSED')).toBe(true)
    expect(
      canTransitionOnboarding('PAUSED', 'REVIEW_REQUIRED', { resumeStatus: 'REVIEW_REQUIRED' }),
    ).toBe(true)
  })

  test('rejects skipped, backward, and post-completion transitions', () => {
    expect(canTransitionOnboarding('NOT_STARTED', 'PROFILE_CONFIRMED')).toBe(false)
    expect(canTransitionOnboarding('PROFILE_CONFIRMED', 'COLLECTING')).toBe(false)
    expect(canTransitionOnboarding('PAUSED', 'COLLECTING', { resumeStatus: 'REVIEW_REQUIRED' })).toBe(
      false,
    )
    expect(canTransitionOnboarding('COMPLETED', 'COLLECTING')).toBe(false)
  })
})

describe('onboarding readiness', () => {
  const readyInput = {
    adultConfirmed: true,
    hasHeight: true,
    hasCurrentWeight: true,
    hasBodyGoal: true,
    hasTrainingGoal: true,
    hasTrainingContext: true,
    hasActivityContext: true,
    hasNutritionContext: true,
    hasSafetyCheckpointAnswers: true,
    hasBirthYear: true,
    hasCalculationSex: true,
    trainingSafetyBlocked: false,
    nutritionSafetyBlocked: false,
  }

  test('treats missing birth year or calculation sex as limited rather than blocked', () => {
    expect(
      evaluateOnboardingReadiness({
        ...readyInput,
        hasBirthYear: false,
        hasCalculationSex: false,
      }),
    ).toEqual({
      overall: 'LIMITED',
      profile: 'READY',
      trainingPlan: 'READY',
      nutritionPlan: 'READY',
      reasonCodes: ['CALCULATION_INPUT_INCOMPLETE'],
    })
  })

  test('blocks profile confirmation when essential confirmed data is missing', () => {
    expect(
      evaluateOnboardingReadiness({ ...readyInput, adultConfirmed: false, hasHeight: false }),
    ).toEqual({
      overall: 'BLOCKED',
      profile: 'BLOCKED',
      trainingPlan: 'BLOCKED',
      nutritionPlan: 'BLOCKED',
      reasonCodes: ['ADULT_CONFIRMATION_REQUIRED', 'PROFILE_DATA_INCOMPLETE'],
    })
  })

  test('blocks profile confirmation until every safety checkpoint has an explicit answer', () => {
    expect(
      evaluateOnboardingReadiness({
        ...readyInput,
        hasSafetyCheckpointAnswers: false,
      }),
    ).toEqual({
      overall: 'BLOCKED',
      profile: 'BLOCKED',
      trainingPlan: 'BLOCKED',
      nutritionPlan: 'BLOCKED',
      reasonCodes: ['PROFILE_DATA_INCOMPLETE'],
    })
  })

  test('keeps safety blocking scoped to the affected automatic plan', () => {
    expect(
      evaluateOnboardingReadiness({ ...readyInput, trainingSafetyBlocked: true }),
    ).toEqual({
      overall: 'LIMITED',
      profile: 'READY',
      trainingPlan: 'BLOCKED',
      nutritionPlan: 'READY',
      reasonCodes: ['TRAINING_SAFETY_REVIEW_REQUIRED'],
    })
  })
})
