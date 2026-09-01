import {
  deleteDiaryEntryResponseSchema,
  diaryDayConfirmationResponseSchema,
  diaryDayConfirmationsResponseSchema,
  diaryEntriesResponseSchema,
  diaryEntryResponseSchema,
  type CreateActivityEntryRequest,
  type ConfirmDiaryDayRequest,
  type CreateNutritionEntryRequest,
  type CreateMeasurementEntryRequest,
  type DeleteDiaryEntryRequest,
  type ListDiaryEntriesQuery,
  type ListDiaryDayConfirmationsQuery,
  type UpdateActivityEntryRequest,
  type UpdateNutritionEntryRequest,
  type UpdateMeasurementEntryRequest,
} from '@ai-fitness-coach/contracts';

import type { ApiTransport } from '@/platform/api';

export class DiaryApi {
  constructor(private readonly transport: ApiTransport) {}

  async list(query: ListDiaryEntriesQuery) {
    const search = new URLSearchParams({ from: query.from, to: query.to });
    return this.transport.request(`/api/diary?${search.toString()}`, diaryEntriesResponseSchema, {
      auth: true,
      method: 'GET',
    });
  }

  async listDayConfirmations(query: ListDiaryDayConfirmationsQuery) {
    const search = new URLSearchParams({ fromDate: query.fromDate, toDate: query.toDate });
    return this.transport.request(
      `/api/diary/day-confirmations?${search.toString()}`,
      diaryDayConfirmationsResponseSchema,
      { auth: true, method: 'GET' },
    );
  }

  confirmDay(body: ConfirmDiaryDayRequest) {
    return this.transport.request(
      '/api/diary/day-confirmations',
      diaryDayConfirmationResponseSchema,
      { auth: true, body, method: 'POST' },
    );
  }

  createNutrition(body: CreateNutritionEntryRequest) {
    return this.entry('/api/diary/nutrition-entries', 'POST', body);
  }

  createActivity(body: CreateActivityEntryRequest) {
    return this.entry('/api/diary/activity-entries', 'POST', body);
  }

  createMeasurement(body: CreateMeasurementEntryRequest) {
    return this.entry('/api/diary/measurement-entries', 'POST', body);
  }

  updateNutrition(entryId: string, body: UpdateNutritionEntryRequest) {
    return this.entry(`/api/diary/nutrition-entries/${encodeURIComponent(entryId)}`, 'PATCH', body);
  }

  updateActivity(entryId: string, body: UpdateActivityEntryRequest) {
    return this.entry(`/api/diary/activity-entries/${encodeURIComponent(entryId)}`, 'PATCH', body);
  }

  updateMeasurement(entryId: string, body: UpdateMeasurementEntryRequest) {
    return this.entry(`/api/diary/measurement-entries/${encodeURIComponent(entryId)}`, 'PATCH', body);
  }

  async deleteNutrition(entryId: string, body: DeleteDiaryEntryRequest) {
    return this.transport.request(
      `/api/diary/nutrition-entries/${encodeURIComponent(entryId)}`,
      deleteDiaryEntryResponseSchema,
      { auth: true, body, method: 'DELETE' },
    );
  }

  async deleteActivity(entryId: string, body: DeleteDiaryEntryRequest) {
    return this.transport.request(
      `/api/diary/activity-entries/${encodeURIComponent(entryId)}`,
      deleteDiaryEntryResponseSchema,
      { auth: true, body, method: 'DELETE' },
    );
  }

  async deleteMeasurement(entryId: string, body: DeleteDiaryEntryRequest) {
    return this.transport.request(
      `/api/diary/measurement-entries/${encodeURIComponent(entryId)}`,
      deleteDiaryEntryResponseSchema,
      { auth: true, body, method: 'DELETE' },
    );
  }

  async deleteDayConfirmation(localDate: string, body: DeleteDiaryEntryRequest) {
    return this.transport.request(
      `/api/diary/day-confirmations/${encodeURIComponent(localDate)}`,
      deleteDiaryEntryResponseSchema,
      { auth: true, body, method: 'DELETE' },
    );
  }

  private async entry(path: string, method: 'POST' | 'PATCH', body: unknown) {
    return this.transport.request(path, diaryEntryResponseSchema, { auth: true, body, method });
  }
}

export type DiaryApiPort = Pick<
  DiaryApi,
  | 'list'
  | 'listDayConfirmations'
  | 'confirmDay'
  | 'createNutrition'
  | 'createActivity'
  | 'createMeasurement'
  | 'updateNutrition'
  | 'updateActivity'
  | 'updateMeasurement'
  | 'deleteNutrition'
  | 'deleteActivity'
  | 'deleteMeasurement'
  | 'deleteDayConfirmation'
>;
