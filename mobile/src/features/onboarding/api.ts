import {
  confirmOnboardingPlanRequestSchema,
  confirmOnboardingProfileRequestSchema,
  onboardingMutationRequestSchema,
  onboardingSnapshotSchema,
  saveOnboardingDraftRequestSchema,
  type ConfirmOnboardingPlanRequest,
  type ConfirmOnboardingProfileRequest,
  type OnboardingMutationRequest,
  type OnboardingSnapshot,
  type SaveOnboardingDraftRequest,
} from '@ai-fitness-coach/contracts';

import type { ApiTransport } from '@/platform/api';

export class OnboardingApi {
  constructor(private readonly transport: ApiTransport) {}

  getSnapshot(): Promise<OnboardingSnapshot> {
    return this.transport.request('/api/onboarding', onboardingSnapshotSchema, { auth: true });
  }

  saveDraft(input: SaveOnboardingDraftRequest): Promise<OnboardingSnapshot> {
    return this.transport.request('/api/onboarding/draft', onboardingSnapshotSchema, {
      auth: true,
      body: saveOnboardingDraftRequestSchema.parse(input),
      method: 'PUT',
    });
  }

  pause(input: OnboardingMutationRequest): Promise<OnboardingSnapshot> {
    return this.command('/api/onboarding/pause', input);
  }

  resume(input: OnboardingMutationRequest): Promise<OnboardingSnapshot> {
    return this.command('/api/onboarding/resume', input);
  }

  confirmProfile(input: ConfirmOnboardingProfileRequest): Promise<OnboardingSnapshot> {
    return this.transport.request(
      '/api/onboarding/profile-confirmation',
      onboardingSnapshotSchema,
      {
        auth: true,
        body: confirmOnboardingProfileRequestSchema.parse(input),
        method: 'POST',
      },
    );
  }

  createPlanDraft(input: OnboardingMutationRequest): Promise<OnboardingSnapshot> {
    return this.command('/api/onboarding/plan-draft', input);
  }

  confirmPlan(input: ConfirmOnboardingPlanRequest): Promise<OnboardingSnapshot> {
    return this.transport.request(
      '/api/onboarding/plan-confirmation',
      onboardingSnapshotSchema,
      {
        auth: true,
        body: confirmOnboardingPlanRequestSchema.parse(input),
        method: 'POST',
      },
    );
  }

  complete(input: OnboardingMutationRequest): Promise<OnboardingSnapshot> {
    return this.command('/api/onboarding/complete', input);
  }

  private command(path: string, input: OnboardingMutationRequest) {
    return this.transport.request(path, onboardingSnapshotSchema, {
      auth: true,
      body: onboardingMutationRequestSchema.parse(input),
      method: 'POST',
    });
  }
}

export type OnboardingApiPort = OnboardingApi;
