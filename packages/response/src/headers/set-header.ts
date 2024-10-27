import type { HasOutgoingHeaders, Input, LegacyHeaders } from "../types"
import { ensureCharsetOnPlaintextTypes } from "../util"

type ResponseHeaderSetter<HeaderName extends string> = (
  res: HasOutgoingHeaders,
  value: Input<LegacyHeaders[HeaderName]>,
) => Input<LegacyHeaders[HeaderName]>

class ResponseHeaderSpecialCasesMap {
  private map: Map<string, unknown>

  constructor() {
    this.map = new Map()
  }

  private valueIsResponseHeaderSetter<Key extends string>(
    value: unknown | undefined,
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

setResponseHeaderSpecialCases.set("content-type", (_, value): string => {
  // provide a default charset when the API consumer has omitted one
  value = ensureCharsetOnPlaintextTypes(value, "utf-8")
  return value
})
