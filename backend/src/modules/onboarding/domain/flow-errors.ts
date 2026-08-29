export type OnboardingFlowFailureKind =
  | 'invalid_state'
  | 'incomplete_profile'
  | 'invalid_confirmation'
  | 'source_narrative_missing'

export class OnboardingFlowFailure extends Error {
  constructor(
    readonly kind: OnboardingFlowFailureKind,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'OnboardingFlowFailure'
  }
}
