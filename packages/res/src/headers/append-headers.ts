import type { AppendHeaders, HasOutgoingHeaders } from '../types'
import { appendResponseHeader } from './append-header'

export function appendResponseHeaders(res: HasOutgoingHeaders, headers: AppendHeaders): void {
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue
    appendResponseHeader(res, key, value)
  }
}
