import type { OnboardingFieldKey } from '@ai-fitness-coach/contracts'

import type { OnboardingRepository } from './ports'

const planDraftFactKeys = new Set<OnboardingFieldKey>([
  'adultConfirmed',
  'birthYear',
  'calculationSex',
  'heightCm',
  'currentWeightKg',
  'bodyGoal',
  'trainingGoal',
  'primaryPriority',
  'trainingExperience',
  'trainingLocations',
  'equipment',
  'trainingDaysPerWeek',
  'workoutDurationMinutes',
  'ordinaryDayDescription',
  'allergiesAndExclusions',
  'nutritionTrackingMode',
  'currentPainOrInjury',
  'doctorRestriction',
  'ordinaryFitnessSuitabilityDoubt',
  'supervisedNutritionOrActivityOnly',
])

export class OnboardingContextBuilder {
  constructor(private readonly repository: Pick<OnboardingRepository, 'readMemory'>) {}

  async forPlanDraft(userId: string) {
    const memory = await this.repository.readMemory(userId)
    return {
      facts: memory.facts
        .filter((fact) => planDraftFactKeys.has(fact.factKey))
        .map((fact) => ({
          key: fact.factKey,
          value: fact.value,
          truthKind: fact.truthKind,
          sourceKind: fact.sourceKind,
          isApproximate: fact.isApproximate,
          confirmedAt: fact.confirmedAt,
        })),
      goal: memory.goal,
      measurements: memory.measurements.slice(0, 2),
      safetyFlags: memory.safetyFlags,
    }
  }
}
