import { appendResponseVaryHeader } from './headers'
import type { HasAccepts, HasOutgoingHeaders, HasReq } from './types'
import { normalizeType, normalizeTypes } from './util.js'

export type FormatProps = {
  default?: () => void | Promise<void>
} & Record<string, () => void | Promise<void>>

export type FormatError = Error & {
  status: number
  statusCode: number
  types: Array<string | null>
}

type FormatResponse = HasOutgoingHeaders & HasReq<HasAccepts>
export async function formatResponse(res: FormatResponse, props: FormatProps): Promise<void> {
  const { default: defaultHandler, ...typeHandlers } = props

  const keys = Object.keys(typeHandlers)
  const key: string | false = keys.length > 0 ? res.req.accepts(keys) : false
  appendResponseVaryHeader(res, 'Accept')

  if (key) {
    const type = normalizeType(key)
    if (type.value != null) res.setHeader('Content-Type', type.value)
    await props[key]()
    return
  }

  if (defaultHandler != null) {
    await defaultHandler()
    return
  }

  const err = new Error('Not Acceptable') as FormatError
  err.status = err.statusCode = 406
  err.types = normalizeTypes(keys).map((o) => o.value)

  throw err
}
