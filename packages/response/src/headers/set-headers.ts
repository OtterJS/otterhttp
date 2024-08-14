import type { HasOutgoingHeaders, Headers } from '../types'

export function setResponseHeaders(res: HasOutgoingHeaders, headers: Headers): void {
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue
    res.setHeader(key, value)
  }
}
