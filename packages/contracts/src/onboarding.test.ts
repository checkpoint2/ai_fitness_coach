import { describe, expect, test } from 'bun:test'

import {
  confirmOnboardingProfileRequestSchema,
  onboardingSnapshotSchema,
  persistentTruthKindSchema,
  saveOnboardingDraftRequestSchema,
} from './onboarding'
import type { OnboardingSnapshot, SaveOnboardingDraftRequest } from './onboarding'

const mutationId = '018fd4f2-1f3a-7c88-bc49-333333333333'

describe('onboarding contracts', () => {
  test('accepts explicit disclosure refusals without inventing calculation values', () => {
    const input: SaveOnboardingDraftRequest = {
      expectedRevision: 3,
      clientMutationId: mutationId,
      patch: {
        birthYear: {
          state: 'DRAFT',
          value: { kind: 'DECLINED' },
          sourceKind: 'STRUCTURED',
          isApproximate: false,
        },
        calculationSex: {
          state: 'DRAFT',
          value: { kind: 'DECLINED' },
          sourceKind: 'STRUCTURED',
          isApproximate: false,
        },
      },
    }

    expect(saveOnboardingDraftRequestSchema.parse(input)).toEqual(input)
  })

  test('keeps unknown fields valueless and rejects arbitrary keys or user selectors', () => {
    const base: SaveOnboardingDraftRequest = {
      expectedRevision: 0,
      clientMutationId: mutationId,
      patch: {
        desiredWeightKg: {
          state: 'UNKNOWN',
          sourceKind: 'NONE',
          isApproximate: false,
        },
      },
    }

    expect(saveOnboardingDraftRequestSchema.parse(base)).toEqual(base)
    expect(() =>
      saveOnboardingDraftRequestSchema.parse({
        ...base,
        userId: '018fd4f2-1f3a-7c88-bc49-444444444444',
      }),
    ).toThrow()
    expect(() =>
      saveOnboardingDraftRequestSchema.parse({
        ...base,
        patch: { ...base.patch, arbitraryMemoryKey: { state: 'UNKNOWN' } },
      }),
    ).toThrow()
    expect(() =>
      saveOnboardingDraftRequestSchema.parse({
        ...base,
        patch: {
          desiredWeightKg: {
            state: 'UNKNOWN',
            value: 82,
            sourceKind: 'NONE',
            isApproximate: false,
          },
        },
      }),
    ).toThrow()
  })

  test('allows AI draft extraction for ordinary fields but not sensitive inferred values', () => {
    const ordinary: SaveOnboardingDraftRequest = {
      expectedRevision: 1,
      clientMutationId: mutationId,
      patch: {
        bodyGoal: {
          state: 'DRAFT',
          value: 'FAT_LOSS',
          sourceKind: 'AI_EXTRACTED',
          isApproximate: false,
        },
      },
    }

    expect(saveOnboardingDraftRequestSchema.parse(ordinary)).toEqual(ordinary)
    expect(() =>
      saveOnboardingDraftRequestSchema.parse({
        ...ordinary,
        patch: {
          birthYear: {
            state: 'DRAFT',
            value: { kind: 'VALUE', year: 1990 },
            sourceKind: 'AI_EXTRACTED',
            isApproximate: false,
          },
        },
      }),
    ).toThrow()
  })

  test('defaults source narrative retention to deletion and requires an exact draft revision', () => {
    expect(
      confirmOnboardingProfileRequestSchema.parse({
        expectedRevision: 4,
        clientMutationId: mutationId,
        confirmedFieldKeys: ['adultConfirmed', 'heightCm'],
      }),
    ).toEqual({
      expectedRevision: 4,
      clientMutationId: mutationId,
      confirmedFieldKeys: ['adultConfirmed', 'heightCm'],
      sourceNarrativeRetention: 'DELETE',
    })
    expect(() =>
      confirmOnboardingProfileRequestSchema.parse({
        expectedRevision: -1,
        clientMutationId: mutationId,
        confirmedFieldKeys: [],
      }),
    ).toThrow()
  })

  test('does not allow UNKNOWN to be persisted as an epistemic value', () => {
    expect(persistentTruthKindSchema.parse('FACT')).toBe('FACT')
    expect(persistentTruthKindSchema.parse('ESTIMATE')).toBe('ESTIMATE')
    expect(() => persistentTruthKindSchema.parse('UNKNOWN')).toThrow()
  })

  test('keeps the current-user snapshot free of a user selector', () => {
    const snapshot: OnboardingSnapshot = {
      status: 'COLLECTING',
      revision: 2,
      initialEntryMode: 'TEXT',
      patch: {},
      readiness: {
        overall: 'LIMITED',
        profile: 'READY',
        trainingPlan: 'READY',
        nutritionPlan: 'READY',
        reasonCodes: ['CALCULATION_INPUT_INCOMPLETE'],
      },
      safetyBlocks: [],
      nextAction: 'REVIEW_DRAFT',
      plan: null,
    }

    expect(onboardingSnapshotSchema.parse(snapshot)).toEqual(snapshot)
    expect(() => onboardingSnapshotSchema.parse({ ...snapshot, userId: 'other-user' })).toThrow()
  })
})
