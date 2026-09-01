import {
  deleteWorkoutSessionResponseSchema,
  exerciseCatalogResponseSchema,
  workoutSessionResponseSchema,
  workoutSessionsResponseSchema,
  type CreateWorkoutSessionRequest,
  type DeleteWorkoutSessionRequest,
  type ListWorkoutSessionsQuery,
  type UpdateWorkoutSessionRequest,
} from '@ai-fitness-coach/contracts';

import type { ApiTransport } from '@/platform/api';

export class TrainingApi {
  constructor(private readonly transport: ApiTransport) {}

  listCatalog() {
    return this.transport.request('/api/training/exercises', exerciseCatalogResponseSchema, {
      auth: true,
      method: 'GET',
    });
  }

  list(query: ListWorkoutSessionsQuery) {
    const search = new URLSearchParams({ from: query.from, to: query.to });
    return this.transport.request(
      `/api/training/sessions?${search.toString()}`,
      workoutSessionsResponseSchema,
      { auth: true, method: 'GET' },
    );
  }

  create(body: CreateWorkoutSessionRequest) {
    return this.transport.request('/api/training/sessions', workoutSessionResponseSchema, {
      auth: true,
      body,
      method: 'POST',
    });
  }

  update(sessionId: string, body: UpdateWorkoutSessionRequest) {
    return this.transport.request(
      `/api/training/sessions/${encodeURIComponent(sessionId)}`,
      workoutSessionResponseSchema,
      { auth: true, body, method: 'PATCH' },
    );
  }

  delete(sessionId: string, body: DeleteWorkoutSessionRequest) {
    return this.transport.request(
      `/api/training/sessions/${encodeURIComponent(sessionId)}`,
      deleteWorkoutSessionResponseSchema,
      { auth: true, body, method: 'DELETE' },
    );
  }
}

export type TrainingApiPort = Pick<TrainingApi, 'listCatalog' | 'list' | 'create' | 'update' | 'delete'>;
