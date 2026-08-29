import { AppError } from '../../../http/errors'
import { OnboardingFlowFailure } from '../domain/flow-errors'
import {
  OnboardingIdempotencyConflict,
  OnboardingRevisionConflict,
  OnboardingResourceMismatch,
} from '../domain/persistence-errors'

export function toOnboardingAppError(error: unknown) {
  if (error instanceof OnboardingRevisionConflict) {
    return new AppError(409, 'CONFLICT', error.message, {
      expectedRevision: error.expectedRevision,
      actualRevision: error.actualRevision,
    })
  }
  if (error instanceof OnboardingIdempotencyConflict) {
    return new AppError(409, 'CONFLICT', error.message)
  }
  if (error instanceof OnboardingResourceMismatch) {
    return new AppError(422, 'VALIDATION_ERROR', error.message)
  }
  if (error instanceof OnboardingFlowFailure) {
    return new AppError(422, 'VALIDATION_ERROR', error.message, error.details)
  }
  return error
}

export async function executeOnboarding<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toOnboardingAppError(error)
  }
}
