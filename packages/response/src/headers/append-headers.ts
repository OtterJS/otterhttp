import type { AppendHeaders, HasOutgoingHeaders } from '../types'

export function appendResponseHeaders(res: HasOutgoingHeaders, headers: AppendHeaders): void {
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue
    res.appendHeader(key, value)
  }
}
