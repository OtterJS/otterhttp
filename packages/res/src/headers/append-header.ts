import type { AppendHeaders, HasOutgoingHeaders, Input } from '../types'

export function appendResponseHeader<HeaderName extends string>(
  res: HasOutgoingHeaders,
  headerName: HeaderName,
  value: Input<AppendHeaders[HeaderName]>
): void {
  const lowerHeaderName = headerName.toLowerCase()
  res.appendHeader(lowerHeaderName, value)
}
