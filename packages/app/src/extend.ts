import { compile } from '@otterhttp/proxy-address'
import type { Request } from '@otterhttp/req'
import {
  append,
  attachment,
  clearCookie,
  download,
  formatResponse,
  getResponseHeader,
  json,
  redirect,
  send,
  sendFile,
  sendStatus,
  setContentType,
  setCookie,
  setHeader,
  setLinksHeader,
  setLocationHeader,
  setVaryHeader,
  status
} from '@otterhttp/res'
import type { NextFunction } from '@otterhttp/router'
import type { App } from './app.js'
import type { Response } from './response.js'
import { renderTemplate } from './response.js'
import type { TemplateEngineOptions } from './types.js'

/**
 * Extends Request and Response objects with custom properties and methods
 */
export const extendMiddleware =
  <
    EngineOptions extends TemplateEngineOptions = TemplateEngineOptions,
    Req extends Request = never,
    Res extends Response<EngineOptions> = never
  >(
    app: App<Req, Res>
  ) =>
  (req: Req, res: Res, next: NextFunction): void => {
    const { settings } = app

    res.get = getResponseHeader(res)

    let trust = settings?.['trust proxy'] ?? 0
    if (typeof trust !== 'function') {
      trust = compile(trust)
      settings['trust proxy'] = trust
    }
    const { subdomainOffset } = settings

    req.populate({ trust, subdomainOffset })

    res.header = res.set = setHeader<Response>(res)
    res.send = send<Request, Response>(req, res)
    res.json = json<Response>(res)
    res.status = status<Response>(res)
    res.sendStatus = sendStatus<Request, Response>(req, res)
    res.sendFile = sendFile<Request, Response>(req, res)
    res.type = setContentType<Response>(res)
    res.location = setLocationHeader<Request, Response>(req, res)
    res.links = setLinksHeader<Response>(res)
    res.vary = setVaryHeader<Response>(res)
    res.cookie = setCookie<Request, Response>(req, res)
    res.clearCookie = clearCookie<Request, Response>(req, res)
    res.render = renderTemplate<TemplateEngineOptions, Req, Res>(req, res, app)
    res.format = formatResponse(req, res, next)
    res.redirect = redirect(req, res, next)
    res.attachment = attachment<Response>(res)
    res.download = download<Request, Response>(req, res)
    res.append = append<Response>(res)
    res.locals = res.locals || Object.create(null)

    next()
  }
