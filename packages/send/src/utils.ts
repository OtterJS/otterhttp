import { Stats } from 'node:fs'
import { eTag } from '@otterhttp/etag'

import type { JSONLiteral } from './types'

export const createETag = (body: Buffer | string | Stats, encoding: BufferEncoding): string => {
  if (body instanceof Stats) {
    return eTag(body, { weak: true })
  }
  return eTag(!Buffer.isBuffer(body) ? Buffer.from(body, encoding) : body, { weak: true })
}

export function isJSONLiteral(value: unknown): value is JSONLiteral {
  if (typeof value === 'object') return true // covers arrays, null, objects
  if (isString(value)) return true
  if (typeof value === 'number') return true
  if (typeof value === 'boolean') return true
  return false
}

export function isString(something: unknown): something is string {
  return typeof something === 'string' || something instanceof String
}
