import type {
  CreateWorkoutSessionRequest,
  ExerciseCatalogItem,
  ListWorkoutSessionsQuery,
  UpdateWorkoutSessionRequest,
  WorkoutSession,
} from '@ai-fitness-coach/contracts'

export type TrainingClock = { now(): Date }
export type TrainingRequestHasher = { hash(value: unknown): string }

export type TrainingRepository = {
  listCatalog(): Promise<ExerciseCatalogItem[]>
  list(userId: string, query: ListWorkoutSessionsQuery): Promise<WorkoutSession[]>
  create(input: {
    userId: string
    request: CreateWorkoutSessionRequest
    requestHash: string
    confirmedAt: Date
  }): Promise<WorkoutSession>
  update(input: {
    userId: string
    sessionId: string
    request: UpdateWorkoutSessionRequest
    confirmedAt: Date
  }): Promise<WorkoutSession>
  delete(userId: string, sessionId: string, expectedRevision: number): Promise<void>
}
