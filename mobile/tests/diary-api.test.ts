import { afterEach, describe, expect, test } from 'bun:test';
import type { DiaryEntry } from '@ai-fitness-coach/contracts';

import { DiaryApi } from '../src/features/diary/api';
import { ApiTransport } from '../src/platform/api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('DiaryApi', () => {
  test('uses only current-user diary routes and exact HTTP methods', async () => {
    const calls: Array<{ body: unknown; method: string; path: string; search: string }> = [];
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      calls.push({
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? 'GET',
        path: url.pathname,
        search: url.search,
      });
      const body = init?.method === 'DELETE'
        ? { deleted: true }
        : url.pathname === '/api/diary'
          ? { entries: [] }
          : url.pathname === '/api/diary/day-confirmations' && init?.method === 'GET'
            ? { confirmations: [] }
            : url.pathname === '/api/diary/day-confirmations'
              ? { confirmation: dayConfirmation() }
          : { entry: nutritionEntry() };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const transport = new ApiTransport({
      expire: () => undefined,
      getAccessToken: () => 'access-token',
      getGeneration: () => 1,
      isGenerationCurrent: (generation) => generation === 1,
      refresh: async () => ({ accessToken: 'access-token' }),
      setAccessToken: () => true,
    });
    const api = new DiaryApi(transport);
    const create = {
      clientMutationId: '018fd4f2-1f3a-7c88-bc49-333333333333',
      description: 'Яблоко',
      occurredAt: '2026-08-30T09:30:00.000Z',
      category: null,
      amountText: null,
      nutrition: null,
    } as const;

    await api.list({
      from: '2026-08-30T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
    });
    await api.createNutrition(create);
    await api.updateNutrition(nutritionEntry().id, {
      expectedRevision: 1,
      description: 'Два яблока',
      occurredAt: create.occurredAt,
      category: null,
      amountText: null,
      nutrition: null,
    });
    await api.deleteNutrition(nutritionEntry().id, { expectedRevision: 2 });
    await api.createMeasurement({
      clientMutationId: '018fd4f2-1f3a-7c88-bc49-555555555555',
      measurementKind: 'WEIGHT',
      label: null,
      value: 82.4,
      unit: 'KG',
      occurredAt: create.occurredAt,
      truthKind: 'FACT',
    });
    await api.updateMeasurement(nutritionEntry().id, {
      expectedRevision: 1,
      measurementKind: 'WEIGHT',
      label: null,
      value: 82.1,
      unit: 'KG',
      occurredAt: create.occurredAt,
      truthKind: 'FACT',
    });
    await api.deleteMeasurement(nutritionEntry().id, { expectedRevision: 2 });
    await api.listDayConfirmations({ fromDate: '2026-08-01', toDate: '2026-08-31' });
    await api.confirmDay({
      clientMutationId: '018fd4f2-1f3a-7c88-bc49-666666666666',
      localDate: '2026-08-30',
      timeZone: 'Europe/Moscow',
      nutritionComplete: true,
      activityComplete: true,
    });
    await api.deleteDayConfirmation('2026-08-30', { expectedRevision: 1 });

    expect(calls.map(({ method, path }) => [path, method])).toEqual([
      ['/api/diary', 'GET'],
      ['/api/diary/nutrition-entries', 'POST'],
      [`/api/diary/nutrition-entries/${nutritionEntry().id}`, 'PATCH'],
      [`/api/diary/nutrition-entries/${nutritionEntry().id}`, 'DELETE'],
      ['/api/diary/measurement-entries', 'POST'],
      [`/api/diary/measurement-entries/${nutritionEntry().id}`, 'PATCH'],
      [`/api/diary/measurement-entries/${nutritionEntry().id}`, 'DELETE'],
      ['/api/diary/day-confirmations', 'GET'],
      ['/api/diary/day-confirmations', 'POST'],
      ['/api/diary/day-confirmations/2026-08-30', 'DELETE'],
    ]);
    expect(calls[0]?.search).toBe(
      '?from=2026-08-30T00%3A00%3A00.000Z&to=2026-08-31T00%3A00%3A00.000Z',
    );
    expect(JSON.stringify(calls)).not.toContain('userId');
  });
});

function nutritionEntry(): DiaryEntry {
  return {
    id: '018fd4f2-1f3a-7c88-bc49-444444444444',
    kind: 'NUTRITION',
    revision: 1,
    description: 'Яблоко',
    occurredAt: '2026-08-30T09:30:00.000Z',
    category: null,
    amountText: null,
    sourceKind: 'STRUCTURED',
    nutrition: null,
    confirmedAt: '2026-08-30T09:30:01.000Z',
    createdAt: '2026-08-30T09:30:01.000Z',
    updatedAt: '2026-08-30T09:30:01.000Z',
  };
}

function dayConfirmation() {
  return {
    id: '018fd4f2-1f3a-7c88-bc49-777777777777',
    localDate: '2026-08-30',
    timeZone: 'Europe/Moscow',
    revision: 1,
    nutritionComplete: true,
    activityComplete: true,
    confirmedAt: '2026-08-30T20:00:00.000Z',
    createdAt: '2026-08-30T20:00:00.000Z',
    updatedAt: '2026-08-30T20:00:00.000Z',
  } as const;
}
