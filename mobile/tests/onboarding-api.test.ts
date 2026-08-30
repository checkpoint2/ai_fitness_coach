import { afterEach, describe, expect, test } from 'bun:test';
import type { OnboardingSnapshot } from '@ai-fitness-coach/contracts';

import { OnboardingApi } from '../src/features/onboarding/api';
import { ApiTransport } from '../src/platform/api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const snapshot: OnboardingSnapshot = {
  status: 'NOT_STARTED',
  revision: 0,
  initialEntryMode: null,
  patch: {},
  readiness: {
    overall: 'BLOCKED',
    profile: 'BLOCKED',
    trainingPlan: 'BLOCKED',
    nutritionPlan: 'BLOCKED',
    reasonCodes: ['ADULT_CONFIRMATION_REQUIRED', 'PROFILE_DATA_INCOMPLETE'],
  },
  safetyBlocks: [],
  nextAction: 'START',
  plan: null,
};

type Call = { authorization: string | null; body: unknown; method: string; path: string };

function createApi() {
  const calls: Call[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      authorization: new Headers(init?.headers).get('Authorization'),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      method: init?.method ?? 'GET',
      path: new URL(String(input)).pathname,
    });
    return new Response(JSON.stringify(snapshot), {
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
  return { api: new OnboardingApi(transport), calls };
}

describe('OnboardingApi', () => {
  test('reads the current-user snapshot with authenticated transport', async () => {
    const { api, calls } = createApi();

    await api.getSnapshot();

    expect(calls).toEqual([
      { authorization: 'Bearer access-token', body: undefined, method: 'GET', path: '/api/onboarding' },
    ]);
  });

  test('uses the exact manual-flow methods and never sends a user selector', async () => {
    const { api, calls } = createApi();
    const mutation = {
      expectedRevision: 0,
      clientMutationId: '019d0000-0000-7000-8000-000000000001',
    };

    await api.saveDraft({
      ...mutation,
      initialEntryMode: 'STRUCTURED',
      patch: {},
    });
    await api.pause(mutation);
    await api.resume(mutation);
    await api.confirmProfile({
      ...mutation,
      confirmedFieldKeys: ['adultConfirmed'],
      sourceNarrativeRetention: 'DELETE',
    });
    await api.createPlanDraft(mutation);
    await api.confirmPlan({
      ...mutation,
      planId: '019d0000-0000-7000-8000-000000000002',
      planVersion: 1,
    });
    await api.complete(mutation);

    expect(calls.map(({ method, path }) => ({ method, path }))).toEqual([
      { method: 'PUT', path: '/api/onboarding/draft' },
      { method: 'POST', path: '/api/onboarding/pause' },
      { method: 'POST', path: '/api/onboarding/resume' },
      { method: 'POST', path: '/api/onboarding/profile-confirmation' },
      { method: 'POST', path: '/api/onboarding/plan-draft' },
      { method: 'POST', path: '/api/onboarding/plan-confirmation' },
      { method: 'POST', path: '/api/onboarding/complete' },
    ]);
    expect(calls.every(({ body }) => !JSON.stringify(body).includes('userId'))).toBe(true);
  });
});
