import { describe, expect, test } from 'bun:test'

import type { PersistentMemorySnapshot } from './ports'
import { OnboardingContextBuilder } from './onboarding-context-builder'

describe('onboarding context builder', () => {
  test('selects only plan-purpose facts and strips user selectors and coach notes', async () => {
    const memory: PersistentMemorySnapshot = {
      facts: [
        fact('bodyGoal', 'RECOMPOSITION'),
        fact('trainingDaysPerWeek', 3),
        fact('mealPattern', 'Хаотично'),
      ],
      goal: { id: 'goal-id', version: 2 },
      measurements: [{ id: 'measurement-id', kind: 'weight', observedAt: new Date() }],
      safetyFlags: [{ id: 'flag-id', scope: 'training', answer: 'unsure' }],
      plan: null,
      coachNotes: [{ id: 'note-id', text: 'Личная заметка', createdAt: new Date() }],
    }
    const repository = { readMemory: async () => memory }
    const context = await new OnboardingContextBuilder(repository).forPlanDraft('user-id')

    expect(context.facts.map((item) => item.key)).toEqual([
      'bodyGoal',
      'trainingDaysPerWeek',
    ])
    expect(context).not.toHaveProperty('userId')
    expect(context).not.toHaveProperty('coachNotes')
    expect(JSON.stringify(context)).not.toContain('Личная заметка')
  })
})

function fact(factKey: 'bodyGoal' | 'trainingDaysPerWeek' | 'mealPattern', value: unknown) {
  return {
    id: `${factKey}-id`,
    userId: 'user-id',
    factKey,
    value,
    truthKind: 'FACT' as const,
    state: 'confirmed' as const,
    sourceKind: 'STRUCTURED' as const,
    isApproximate: false,
    confirmedAt: new Date(),
    supersedesId: null,
    recordedAt: new Date(),
    supersededAt: null,
  }
}
