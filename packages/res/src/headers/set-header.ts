import type { HasOutgoingHeaders, Headers, Input } from '../types'

type ResponseHeaderSetter<HeaderName extends string> = (
  res: HasOutgoingHeaders,
  value: Input<Headers[HeaderName]>
) => void

class ResponseHeaderSpecialCasesMap extends Map<string, ResponseHeaderSetter<string>> {
  get<Key extends string>(key: Key): ResponseHeaderSetter<Key> | undefined {
    return super.get(key)
  }

  set<Key extends string>(key: Key, value: ResponseHeaderSetter<Key>) {
    return super.set(key, value as ResponseHeaderSetter<string>)
  }
}

const setResponseHeaderSpecialCases = new ResponseHeaderSpecialCasesMap()

const contentTypeCharsetRegExp = /;\s*charset\s*=/
setResponseHeaderSpecialCases.set('content-type', (res, value) => {
  // provide a default charset when the API consumer has omitted one
  if (!contentTypeCharsetRegExp.test(value)) {
    value += '; charset=utf-8'
  }
  res.setHeader('content-type', value)
})

export function setResponseHeader<HeaderName extends string>(
  res: HasOutgoingHeaders,
  headerName: HeaderName,
  value: Input<Headers[HeaderName]>
): void {
  const lowerHeaderName = headerName.toLowerCase()
  const specialCase = setResponseHeaderSpecialCases.get(lowerHeaderName)
  if (specialCase != null) return specialCase(res, value)
  res.setHeader(lowerHeaderName, value)
}
