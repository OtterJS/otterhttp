import { STATUS_CODES } from 'node:http'
import type { Request } from '@otterhttp/req'
import type { Response } from '@otterhttp/res'
import type { NextFunction } from '@otterhttp/router'

import type { App } from './app'

export type ErrorHandler<Req extends Request = Request, Res extends Response<Req> = Response<Req>> = (
  this: App<Req, Res>,
  err: any,
  req: Req,
  res: Res,
  next: NextFunction
) => void

export const onErrorHandler = function <Req extends Request = Request, Res extends Response<Req> = Response<Req>>(
  this: App<Req, Res>,
  err: any,
  _req: Req,
  res: Res,
  next: NextFunction
) {
  if (this.onError === onErrorHandler && this.parent) return this.parent.onError(err, _req, res, next)

  if (err instanceof Error) console.error(err)

  const code = err.code in STATUS_CODES ? err.code : err.status

  if (typeof err === 'string' || Buffer.isBuffer(err)) res.writeHead(500).end(err)
  else if (code in STATUS_CODES) res.writeHead(code).end(STATUS_CODES[code])
  else res.writeHead(500).end(err.message)
}
