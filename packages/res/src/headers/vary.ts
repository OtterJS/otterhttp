import { vary } from '@otterhttp/vary'
import type { HasOutgoingHeaders } from '../types'

export function setResponseVaryHeader(res: HasOutgoingHeaders, headers: string | string[]): void {
  vary(res, headers)
}
