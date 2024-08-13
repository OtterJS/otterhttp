import type { HasOutgoingHeaders, Headers } from '../types'
import { setResponseHeader } from './set-header'

export function setResponseHeaders(res: HasOutgoingHeaders, headers: Headers): void {
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue
    setResponseHeader(res, key, value)
  }
}
