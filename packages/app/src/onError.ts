import { STATUS_CODES } from 'node:http'
import { HttpError } from '@otterhttp/errors'
import type { Request } from '@otterhttp/request'
import type { Response } from '@otterhttp/response'
import type { NextFunction } from '@otterhttp/router'

import type { App } from './app'
import { isIndexer } from './type-guards'

export type ErrorHandler<Req extends Request = Request, Res extends Response<Req> = Response<Req>> = (
  this: App<Req, Res>,
  err: any,
  req: Req,
  res: Res,
  next: NextFunction
) => void

export const onErrorHandler = function <Req extends Request = Request, Res extends Response<Req> = Response<Req>>(
  this: App<Req, Res>,
  err: unknown,
  _req: Req,
  res: Res,
  next: NextFunction
) {
  if (res.headersSent || res.socket == null) {
    console.error(err)
    return
  }

  if (this.onError === onErrorHandler && this.parent) return this.parent.onError(err, _req, res, next)

  if (err instanceof HttpError) {
    res.writeHead(err.statusCode, err.statusMessage)

    if (err.exposeMessage) {
      res.end(`${err.statusMessage}: ${err.message}`)
    } else {
      res.end(err.statusMessage)
    }

    if (!err.expected) {
      console.error(err)
    }

    return
  }

  if (err == null) {
    res.writeHead(500).end()
    return
  }

  if (typeof err === 'object') {
    let code: string | number
    if ('statusCode' in err && isIndexer(err.statusCode) && err.statusCode in STATUS_CODES) code = err.statusCode
    else if ('code' in err && isIndexer(err.code) && err.code in STATUS_CODES) code = err.code
    else if ('status' in err && isIndexer(err.status) && err.status in STATUS_CODES) code = err.status
    else {
      res.writeHead(500).end(STATUS_CODES[500])
      console.error(err)
      return
    }

    res.writeHead(Number(code)).end(STATUS_CODES[code])
    console.error(err)

    return
  }

  if (typeof err === 'string' || Buffer.isBuffer(err)) {
    res.writeHead(500).end(err)
    return
  }

  res.writeHead(500).end()
}
