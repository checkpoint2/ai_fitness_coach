import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import { DiaryService } from './application/diary-service'
import { createPrismaDiaryRepository } from './infrastructure/diary-repository'
import { diaryRequestHasher } from './infrastructure/request-hasher'
import { createDiaryRoutes } from './transport/routes'

export function createDiaryModule(options: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new DiaryService({
    clock: { now: () => new Date() },
    hasher: diaryRequestHasher,
    repository: createPrismaDiaryRepository(options.db),
  })
  return {
    routes: createDiaryRoutes({ requireAuth: options.requireAuth, service }),
    service,
  }
}

export { DiaryService } from './application/diary-service'
export type { DiaryRepository } from './application/ports'
export { createPrismaDiaryRepository } from './infrastructure/diary-repository'
