import type { IncomingHttpHeaders } from 'node:http'
import type { HasHeaders } from './types'

export function getRequestHeader<HeaderName extends string>(
  req: HasHeaders,
  headerName: HeaderName
): IncomingHttpHeaders[HeaderName] {
  const headerNameLowerCase = headerName.toLowerCase()

  switch (headerNameLowerCase) {
    case 'referer':
    case 'referrer':
      return req.headers.referer ?? req.headers.referer
    default:
      return req.headers[headerNameLowerCase]
  }
}
