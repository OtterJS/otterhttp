import { Request } from '@otterhttp/request'
import { Response } from '@otterhttp/response'

export { App } from './app.js'
export { getExtendMiddleware } from './extend.js'
export { onErrorHandler, type ErrorHandler } from './onError.js'
export { View } from './view.js'

export type { AppSettings, TemplateEngineOptions, TemplateEngine, AppConstructor } from './types.js'

import type {
  Middleware,
  NextFunction,
  AsyncHandler as RAsyncHandler,
  Handler as RHandler,
  SyncHandler as RSyncHandler
} from '@otterhttp/router'

export { Request, Response }
export type Handler = RHandler<Request, Response>
export type AsyncHandler = RAsyncHandler<Request, Response>
export type SyncHandler = RSyncHandler<Request, Response>
export type { NextFunction, Middleware }
