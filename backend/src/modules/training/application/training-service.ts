import type {
  CreateWorkoutSessionRequest,
  DeleteWorkoutSessionRequest,
  ListWorkoutSessionsQuery,
  UpdateWorkoutSessionRequest,
  WorkoutSessionResponse,
  WorkoutSessionsResponse,
  ExerciseCatalogResponse,
} from '@ai-fitness-coach/contracts'

import type { TrainingClock, TrainingRepository, TrainingRequestHasher } from './ports'

export class TrainingService {
  constructor(private readonly options: {
    clock: TrainingClock
    hasher: TrainingRequestHasher
    repository: TrainingRepository
  }) {}

  async listCatalog(): Promise<ExerciseCatalogResponse> {
    return { exercises: await this.options.repository.listCatalog() }
  }

  async list(userId: string, query: ListWorkoutSessionsQuery): Promise<WorkoutSessionsResponse> {
    return { sessions: await this.options.repository.list(userId, query) }
  }

  async create(
    userId: string,
    request: CreateWorkoutSessionRequest,
  ): Promise<WorkoutSessionResponse> {
    return {
      session: await this.options.repository.create({
        userId,
        request,
        requestHash: this.options.hasher.hash(request),
        confirmedAt: this.options.clock.now(),
      }),
    }
  }

  async update(
    userId: string,
    sessionId: string,
    request: UpdateWorkoutSessionRequest,
  ): Promise<WorkoutSessionResponse> {
    return {
      session: await this.options.repository.update({
        userId,
        sessionId,
        request,
        confirmedAt: this.options.clock.now(),
      }),
    }
  }

  async delete(
    userId: string,
    sessionId: string,
    request: DeleteWorkoutSessionRequest,
  ) {
    await this.options.repository.delete(userId, sessionId, request.expectedRevision)
    return { deleted: true as const }
  }
}
