/* c8 ignore start*/
import type { Trust } from '@otterhttp/proxy-address'
import type { Request } from '@otterhttp/req'
import type { Handler } from '@otterhttp/router'

import type { ErrorHandler } from './onError.js'
import type { Response } from './response.js'
import type { View } from './view.js'

/**
 * tinyhttp App has a few settings for toggling features
 */
export type AppSettings = Partial<{
  subdomainOffset: number
  bindAppToReqRes: boolean
  xPoweredBy: string | boolean
  enableReqRoute: boolean
  views: string | string[]
  view: typeof View
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
  opts: AppRenderOptions<O>,
  cb: (err: Error | null, html: unknown) => void
) => void

export type AppRenderOptions<O extends TemplateEngineOptions = TemplateEngineOptions> = O &
  Partial<{
    cache: boolean
    ext: string
    viewsFolder: string
    _locals: Record<string, unknown>
  }>

export type AppConstructor<Req extends Request = Request, Res extends Response = Response> = Partial<{
  noMatchHandler: Handler<Req, Res>
  onError: ErrorHandler<Req, Res>
  settings: AppSettings
  applyExtensions: Handler<Req, Res>
}>
/* c8 ignore stop */
