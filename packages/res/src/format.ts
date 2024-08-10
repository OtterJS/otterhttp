import type { IncomingMessage as Req, ServerResponse as Res } from 'node:http'
import { getAccepts } from '@otterhttp/req'
import { setVaryHeader } from './headers.js'
import { normalizeType, normalizeTypes } from './util.js'

export type FormatProps = {
  default?: () => void
} & Record<string, any>

export type FormatError = Error & {
  status: number
  statusCode: number
  types: Array<string | null>
}

type next = (err?: FormatError) => void

export const formatResponse =
  <Request extends Req = Req, Response extends Res = Res, Next extends next = next>(
    req: Request,
    res: Response,
    next: Next
  ) =>
  (obj: FormatProps): Response => {
    const fn = obj.default

    if (fn) obj.default = undefined

    const keys = Object.keys(obj)

    const key = keys.length > 0 ? (getAccepts(req)(...keys) as string) : false

    setVaryHeader(res)('Accept')

    if (key) {
      const type = normalizeType(key)
      if (type.value != null) res.setHeader('Content-Type', type.value)
      obj[key](req, res, next)
    } else if (fn) {
      fn()
    } else {
      const err = new Error('Not Acceptable') as FormatError
      err.status = err.statusCode = 406
      err.types = normalizeTypes(keys).map((o) => o.value)

      next(err)
    }

    return res
  }
