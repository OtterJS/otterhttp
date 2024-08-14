import { typeIs } from '@otterhttp/type-is'
import type { HasHeaders } from '../types'

export function requestTypeIs(req: HasHeaders, types: readonly string[]) {
  return Boolean(typeIs(req.headers['content-type'], types))
}
