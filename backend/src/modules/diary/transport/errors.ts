import { AppError } from '../../../http/errors'
import {
  DiaryEntryNotFound,
  DiaryIdempotencyConflict,
  DiaryRevisionConflict,
} from '../domain/errors'

export function toDiaryAppError(error: unknown) {
  if (error instanceof DiaryEntryNotFound) {
    return new AppError(404, 'NOT_FOUND', error.message)
  }
  if (error instanceof DiaryRevisionConflict) {
    return new AppError(409, 'CONFLICT', error.message, {
      expectedRevision: error.expectedRevision,
      actualRevision: error.actualRevision,
    })
  }
  if (error instanceof DiaryIdempotencyConflict) {
    return new AppError(409, 'CONFLICT', error.message)
  }
  return error
}

export async function executeDiary<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toDiaryAppError(error)
  }
}
