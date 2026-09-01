import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import { TrainingService } from './application/training-service'
import { createPrismaTrainingRepository } from './infrastructure/training-repository'
import { trainingRequestHasher } from './infrastructure/request-hasher'
import { createTrainingRoutes } from './transport/routes'

export function createTrainingModule(options: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new TrainingService({
    clock: { now: () => new Date() },
    hasher: trainingRequestHasher,
    repository: createPrismaTrainingRepository(options.db),
  })
  return { routes: createTrainingRoutes({ requireAuth: options.requireAuth, service }), service }
}

export { TrainingService } from './application/training-service'
export type { TrainingRepository } from './application/ports'
