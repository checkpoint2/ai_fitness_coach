export class DiaryEntryNotFound extends Error {
  constructor() {
    super('Diary entry not found')
  }
}

export class DiaryRevisionConflict extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super(`Diary entry revision conflict: expected ${expectedRevision}, found ${actualRevision}`)
  }
}

export class DiaryIdempotencyConflict extends Error {
  constructor(readonly clientMutationId: string) {
    super(`Diary mutation ${clientMutationId} was already used for different content`)
  }
}
