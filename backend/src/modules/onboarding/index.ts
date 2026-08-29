import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import { OnboardingService } from './application/onboarding-service'
import { OnboardingContextBuilder } from './application/onboarding-context-builder'
import { createPrismaOnboardingRepository } from './infrastructure/onboarding-repository'
import { onboardingRequestHasher } from './infrastructure/request-hasher'
import { createOnboardingRoutes } from './transport/routes'

type CreateOnboardingModuleOptions = {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}

export function createOnboardingModule(options: CreateOnboardingModuleOptions) {
  const repository = createPrismaOnboardingRepository(options.db)
  const service = new OnboardingService({
    clock: { now: () => new Date() },
    contextBuilder: new OnboardingContextBuilder(repository),
    repository,
    requestHasher: onboardingRequestHasher,
  })
  return {
    routes: createOnboardingRoutes({ requireAuth: options.requireAuth, service }),
    service,
  }
}

export { createPrismaOnboardingRepository }
export { OnboardingService } from './application/onboarding-service'
export { OnboardingContextBuilder } from './application/onboarding-context-builder'
export type { OnboardingRepository } from './application/ports'
export {
  OnboardingIdempotencyConflict,
  OnboardingRevisionConflict,
  OnboardingResourceMismatch,
} from './domain/persistence-errors'
export { OnboardingFlowFailure } from './domain/flow-errors'
export {
  canTransitionOnboarding,
  evaluateOnboardingReadiness,
} from './domain/onboarding-state'
