import { describe, expect, test } from 'bun:test'

import type { DbClient } from '../../../db'
import { seedApprovedPilotExerciseCatalog } from './development-catalog'

describe('approved pilot exercise catalog seed', () => {
  test('publishes only the owner-approved bodyweight squat version idempotently', async () => {
    const calls: unknown[] = []
    const db = {
      exerciseDefinition: {
        upsert: async (input: unknown) => {
          calls.push(input)
          return input
        },
      },
    } as unknown as DbClient

    await seedApprovedPilotExerciseCatalog(db)
    await seedApprovedPilotExerciseCatalog(db)

    expect(calls).toHaveLength(2)
    expect(calls[0]).toEqual(expect.objectContaining({
      where: {
        slug_contentVersion: {
          slug: 'bodyweight-squat',
          contentVersion: 1,
        },
      },
      create: expect.objectContaining({
        activeKey: 'bodyweight-squat',
        status: 'active',
        demonstrationKind: 'short_video',
        demonstrationAssetKey: 'exercise/bodyweight-squat/v1',
        reviewReference: 'owner-review-bodyweight-squat-2026-08-31',
      }),
    }))
    expect(calls[1]).toEqual(calls[0])
  })
})
