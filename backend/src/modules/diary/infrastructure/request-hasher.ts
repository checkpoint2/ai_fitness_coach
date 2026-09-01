import { createHash } from 'node:crypto'

import type { DiaryRequestHasher } from '../application/ports'

export const diaryRequestHasher: DiaryRequestHasher = {
  hash(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex')
  },
}
