export class OnboardingRevisionConflict extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super(
      `Onboarding revision conflict: expected ${expectedRevision}, actual ${actualRevision}`,
    )
    this.name = 'OnboardingRevisionConflict'
  }
}

export class OnboardingIdempotencyConflict extends Error {
  constructor(readonly clientMutationId: string) {
    super(`Mutation ${clientMutationId} was already used with different content`)
    this.name = 'OnboardingIdempotencyConflict'
  }
}

export class OnboardingResourceMismatch extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OnboardingResourceMismatch'
  }
}
