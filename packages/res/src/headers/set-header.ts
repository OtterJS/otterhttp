import type { HasOutgoingHeaders, Headers, Input } from '../types'
import { setCharset } from '../util'

type ResponseHeaderSetter<HeaderName extends string> = (
  res: HasOutgoingHeaders,
  value: Input<Headers[HeaderName]>
) => Input<Headers[HeaderName]>

class ResponseHeaderSpecialCasesMap {
  private map: Map<string, unknown>

  constructor() {
    this.map = new Map()
  }

  private valueIsResponseHeaderSetter<Key extends string>(
    value: unknown | undefined
  ): value is ResponseHeaderSetter<Key> {
    return value != null
  }

  get<Key extends Lowercase<string>>(key: Key): ResponseHeaderSetter<Key> | undefined {
    const value = this.map.get(key)
    if (!this.valueIsResponseHeaderSetter<Key>(value)) return undefined
    return value
  }

  set<Key extends Lowercase<string>>(key: Key, value: ResponseHeaderSetter<Key>) {
    this.map.set(key, value)
  }
}

export const setResponseHeaderSpecialCases = new ResponseHeaderSpecialCasesMap()

const contentTypeCharsetRegExp = /;\s*charset\s*=/
setResponseHeaderSpecialCases.set('content-type', (_, value): string => {
  // provide a default charset when the API consumer has omitted one
  if (!contentTypeCharsetRegExp.test(value)) {
    value = setCharset(value, 'utf-8')
  }
  return value
})