/* c8 ignore start*/
import type { Trust } from '@otterhttp/proxy-address'
import type { Request } from '@otterhttp/request'
import type { Response } from '@otterhttp/response'
import type { Handler } from '@otterhttp/router'

import type { ErrorHandler } from './onError'
import type { IViewPrototype } from './view'

/**
 * tinyhttp App has a few settings for toggling features
 */
export type AppSettings = Partial<{
  subdomainOffset: number
  xPoweredBy: string | boolean
  enableReqRoute: boolean
  views: string | string[]
  view: IViewPrototype
  'view cache': boolean
  'view engine': string
  'trust proxy': Trust
}>

export type TemplateEngineOptions = Record<string, unknown>

/**
 * Function that processes the template
 */
export type TemplateEngine<O extends TemplateEngineOptions = TemplateEngineOptions> = (
  path: string,
  locals: Record<string, unknown>,
  opts: AppRenderOptions<O>
) => unknown | Promise<unknown>

export type AppRenderOptions<O extends TemplateEngineOptions = TemplateEngineOptions> = O &
  Partial<{
    cache: boolean
    ext: string
    viewsFolder: string
    _locals: Record<string, unknown>
  }>

export type AppConstructor<Req extends Request = Request, Res extends Response<Req> = Response<Req>> = Partial<{
  noMatchHandler: Handler<Req, Res>
  onError: ErrorHandler<Req, Res>
  settings: AppSettings
  applyExtensions: Handler<Req, Res>
}>
/* c8 ignore stop */
