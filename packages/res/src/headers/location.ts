import { encodeUrl } from '@otterhttp/encode-url'

import type { HasOutgoingHeaders } from '../types'
import { setResponseHeader } from './set-header'

export function setResponseLocationHeader(res: HasOutgoingHeaders, url: string | URL): void {
  setResponseHeader(res, 'location', url instanceof URL ? url.href : encodeUrl(url))
}
