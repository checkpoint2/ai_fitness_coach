export class WorkoutSessionNotFound extends Error {
  constructor() {
    super('Workout session not found')
  }
}

export class WorkoutRevisionConflict extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super(`Workout revision conflict: expected ${expectedRevision}, found ${actualRevision}`)
  }
}

export class WorkoutIdempotencyConflict extends Error {
  constructor(readonly clientMutationId: string) {
    super(`Workout mutation ${clientMutationId} was already used for different content`)
  }
}
