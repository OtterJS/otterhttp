import type { HasOutgoingHeaders, Headers } from '../types'

export function getResponseHeader<HeaderName extends string>(
  res: HasOutgoingHeaders,
  headerName: HeaderName
): Headers[HeaderName] {
  return res.getHeader(headerName)
}
