import { compile } from '@otterhttp/proxy-address'
import type { Request } from '@otterhttp/req'
import type { Response } from '@otterhttp/res'
import type { NextFunction } from '@otterhttp/router'

import type { App } from './app'

/**
 * Extends Request and Response objects with custom properties and methods
 */
export function getExtendMiddleware<Req extends Request = Request, Res extends Response<Req> = Response<Req>>(
  app: App<Req, Res>
) {
  return (req: Req, _res: Res, next: NextFunction): void => {
    const { settings } = app

    let trust = settings?.['trust proxy'] ?? 0
    if (typeof trust !== 'function') {
      trust = compile(trust)
      settings['trust proxy'] = trust
    }
    const { subdomainOffset } = settings

    req.populate({ trust, subdomainOffset })

    next()
  }
}
