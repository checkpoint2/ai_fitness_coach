import { createHash } from 'node:crypto'

import type { TrainingRequestHasher } from '../application/ports'

export const trainingRequestHasher: TrainingRequestHasher = {
  hash(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex')
  },
}
