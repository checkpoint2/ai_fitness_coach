import { afterEach, describe, expect, test } from 'bun:test';

import { TrainingApi } from '../src/features/training/api';
import { ApiTransport } from '../src/platform/api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('TrainingApi', () => {
  test('uses current-user workout routes without sending a user selector', async () => {
    const calls: Array<{ body: unknown; method: string; path: string; search: string }> = [];
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      calls.push({
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? 'GET',
        path: url.pathname,
        search: url.search,
      });
      const body = url.pathname === '/api/training/exercises'
        ? { exercises: [] }
        : init?.method === 'DELETE'
        ? { deleted: true }
        : init?.method === 'GET'
          ? { sessions: [] }
          : { session: workoutSession() };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const api = new TrainingApi(new ApiTransport({
      expire: () => undefined,
      getAccessToken: () => 'access-token',
      getGeneration: () => 1,
      isGenerationCurrent: (generation) => generation === 1,
      refresh: async () => ({ accessToken: 'access-token' }),
      setAccessToken: () => true,
    }));
    const create = createRequest();

    await api.listCatalog();
    await api.list({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-09-01T00:00:00.000Z',
    });
    await api.create(create);
    const { clientMutationId: _clientMutationId, ...editable } = create;
    await api.update(workoutSession().id, { ...editable, expectedRevision: 1 });
    await api.delete(workoutSession().id, { expectedRevision: 2 });

    expect(calls.map(({ method, path }) => [path, method])).toEqual([
      ['/api/training/exercises', 'GET'],
      ['/api/training/sessions', 'GET'],
      ['/api/training/sessions', 'POST'],
      [`/api/training/sessions/${workoutSession().id}`, 'PATCH'],
      [`/api/training/sessions/${workoutSession().id}`, 'DELETE'],
    ]);
    expect(JSON.stringify(calls)).not.toContain('userId');
  });
});

function createRequest() {
  return {
    clientMutationId: '018fd4f2-1f3a-7c88-bc49-111111111111',
    title: 'Силовая тренировка',
    occurredAt: '2026-08-30T16:00:00.000Z',
    durationMinutes: 50,
    effort: 'RIGHT' as const,
    notes: null,
    exercises: [{
      name: 'Присед с гантелью',
      equipmentText: 'Гантель',
      notes: null,
      sets: [{ reps: 10, loadKg: 16, durationSeconds: null, completed: true as const }],
    }],
  };
}

function workoutSession() {
  const timestamp = '2026-08-30T17:00:00.000Z';
  return {
    id: '018fd4f2-1f3a-7c88-bc49-222222222222',
    revision: 1,
    title: 'Силовая тренировка',
    occurredAt: '2026-08-30T16:00:00.000Z',
    durationMinutes: 50,
    effort: 'RIGHT',
    notes: null,
    sourceKind: 'STRUCTURED',
    confirmedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    exercises: [{
      id: '018fd4f2-1f3a-7c88-bc49-333333333333',
      position: 1,
      name: 'Присед с гантелью',
      equipmentText: 'Гантель',
      notes: null,
      sets: [{
        id: '018fd4f2-1f3a-7c88-bc49-444444444444',
        position: 1,
        reps: 10,
        loadKg: 16,
        durationSeconds: null,
        completed: true,
      }],
    }],
  } as const;
}
