import type { IncomingHttpHeaders } from 'node:http'
import type { HasHeaders } from './types'

type Headers = IncomingHttpHeaders & {
  referrer?: string | undefined
  'if-range'?: string | undefined
}

export function getRequestHeader<HeaderName extends string>(
  req: HasHeaders,
  headerName: HeaderName
): Headers[HeaderName] {
  const headerNameLowerCase = headerName.toLowerCase()

  switch (headerNameLowerCase) {
    case 'referer':
    case 'referrer': {
      return req.headers.referer || (req.headers.referrer as string | undefined)
    }
    case 'if-range': {
      const header = req.headers['if-range']
      if (Array.isArray(header)) return header.join(', ')
      return header
    }
    default: {
      return req.headers[headerNameLowerCase]
    }
  }
}
