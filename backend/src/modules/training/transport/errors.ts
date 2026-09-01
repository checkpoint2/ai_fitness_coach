import { AppError } from '../../../http/errors'
import {
  WorkoutIdempotencyConflict,
  WorkoutRevisionConflict,
  WorkoutSessionNotFound,
} from '../domain/errors'

export async function executeTraining<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof WorkoutSessionNotFound) {
      throw new AppError(404, 'NOT_FOUND', error.message)
    }
    if (error instanceof WorkoutRevisionConflict) {
      throw new AppError(409, 'CONFLICT', error.message, {
        expectedRevision: error.expectedRevision,
        actualRevision: error.actualRevision,
      })
    }
    if (error instanceof WorkoutIdempotencyConflict) {
      throw new AppError(409, 'CONFLICT', error.message)
    }
    throw error
  }
}
