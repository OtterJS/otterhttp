/* HELPER TYPES */

import { isString, isStringArray } from './type-guards'

export type NextFunction = () => void

export type SyncHandler<Request = unknown, Response = unknown> = (
  req: Request,
  res: Response,
  next: NextFunction
) => void

export type AsyncHandler<Request = unknown, Response = unknown> = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

export type Handler<Request = unknown, Response = unknown> =
  | AsyncHandler<Request, Response>
  | SyncHandler<Request, Response>

const METHODS = [
  'ACL',
  'BIND',
  'CHECKOUT',
  'CONNECT',
  'COPY',
  'DELETE',
  'GET',
  'HEAD',
  'LINK',
  'LOCK',
  'M-SEARCH',
  'MERGE',
  'MKACTIVITY',
  'MKCALENDAR',
  'MKCOL',
  'MOVE',
  'NOTIFY',
  'OPTIONS',
  'PATCH',
  'POST',
  'PRI',
  'PROPFIND',
  'PROPPATCH',
  'PURGE',
  'PUT',
  'REBIND',
  'REPORT',
  'SEARCH',
  'SOURCE',
  'SUBSCRIBE',
  'TRACE',
  'UNBIND',
  'UNLINK',
  'UNLOCK',
  'UNSUBSCRIBE'
] as const

export type Method = (typeof METHODS)[number]

export type MiddlewareType = 'mw' | 'route'

type RegexParams = {
  keys: string[] | false
  pattern: RegExp
}

export interface Middleware<Req = unknown, Res = unknown, App extends Router<App, Req, Res> = never> {
  method?: Method
  handler: Handler<Req, Res> | App
  path?: string
  type: MiddlewareType
  regex?: RegexParams | undefined
  fullPath?: string
}

export type MethodHandler<Req = unknown, Res = unknown, App extends Router<App, Req, Res> = never> = {
  path?: string | Handler<Req, Res> | App
  handler?: Handler<Req, Res> | App
  type: MiddlewareType
  regex?: RegexParams
  fullPath?: string
}

export type RouterHandler<Req = unknown, Res = unknown> = Handler<Req, Res> | Handler<Req, Res>[]

export type RouterMethod<
  Req = unknown,
  Res = unknown,
  App extends Router<App, Req, Res> = never,
  ReturnedApp = never
> = {
  (path: string | string[], handler: RouterHandler<Req, Res>, ...handlers: RouterHandler<Req, Res>[]): ReturnedApp
  (handler: RouterHandler<Req, Res>, ...handlers: RouterHandler<Req, Res>[]): ReturnedApp
}

type RouterMethodParams<Req, Res> = [string | string[] | RouterHandler<Req, Res>, ...Array<RouterHandler<Req, Res>>]

export type UseMethod<Req, Res, App extends Router<App, Req, Res>> = {
  (path: string | string[], handler: RouterHandler<Req, Res> | App, ...handlers: (RouterHandler<Req, Res> | App)[]): App
  (handler: RouterHandler<Req, Res> | App, ...handlers: (RouterHandler<Req, Res> | App)[]): App
}

export type UseMethodParams<Req, Res, App extends Router<App, Req, Res>> = [
  string | string[] | RouterHandler<Req, Res> | App,
  ...Array<RouterHandler<Req, Res> | App>
]

/** HELPER METHODS */

const createMiddlewareFromRoute = <Req, Res, App extends Router<App, Req, Res>>({
  path,
  handler,
  fullPath,
  method
}: MethodHandler<Req, Res, App> & {
  method?: Method
}): Pick<Middleware<Req, Res, App>, 'method' | 'handler' | 'path' | 'fullPath'> => {
  if (isString(path)) {
    if (handler == null) throw new Error()
    return {
      method,
      handler,
      path,
      fullPath
    }
  }
  if (isStringArray(path)) {
    if (handler == null) throw new Error()
    return {
      method,
      handler,
      path: '/',
      fullPath: path.join('/')
    }
  }

  if (path != null && handler == null) {
    return {
      method,
      handler: path,
      path: '/',
      fullPath
    }
  }

  if (path == null && handler != null) {
    return {
      method,
      handler,
      path: '/',
      fullPath
    }
  }

  throw new Error()
}

/**
 * Push wares to a middleware array
 * @param mw Middleware arrays
 */
export const pushMiddleware =
  <Req, Res, App extends Router<App, Req, Res> = never>(mw: Middleware<Req, Res, Router<App, Req, Res>>[]) =>
  ({
    path,
    handler,
    method,
    handlers,
    type,
    fullPaths
  }: MethodHandler<Req, Res, Router<App, Req, Res>> & {
    method?: Method
    handlers?: Array<RouterHandler<Req, Res> | App>
    fullPaths?: string[]
  }): void => {
    const m = createMiddlewareFromRoute<Req, Res, Router<App, Req, Res>>({
      path,
      handler,
      method,
      type,
      fullPath: fullPaths?.[0]
    })

    let waresFromHandlers: { handler: Handler<Req, Res> | Router<App, Req, Res> }[] = []
    let idx = 1

    if (handlers) {
      waresFromHandlers = handlers.flat().map((handler) =>
        createMiddlewareFromRoute<Req, Res, Router<App, Req, Res>>({
          path,
          handler: handler,
          method,
          type,
          fullPath: fullPaths == null ? undefined : fullPaths[idx++]
        })
      )
    }

    for (const mdw of [m, ...waresFromHandlers]) mw.push({ ...mdw, type })
  }

/**
 * tinyhttp Router. Manages middleware and has HTTP methods aliases, e.g. `app.get`, `app.put`
 */
export class Router<App extends Router<App, Req, Res> = never, Req = unknown, Res = unknown> {
  middleware: Middleware<Req, Res>[] = []
  mountpath = '/'
  parent?: App
  apps: Record<string, App> = {}

  declare acl: RouterMethod<Req, Res, App, this>
  declare bind: RouterMethod<Req, Res, App, this>
  declare checkout: RouterMethod<Req, Res, App, this>
  declare connect: RouterMethod<Req, Res, App, this>
  declare copy: RouterMethod<Req, Res, App, this>
  declare delete: RouterMethod<Req, Res, App, this>
  declare get: RouterMethod<Req, Res, App, this>
  declare head: RouterMethod<Req, Res, App, this>
  declare link: RouterMethod<Req, Res, App, this>
  declare lock: RouterMethod<Req, Res, App, this>
  declare merge: RouterMethod<Req, Res, App, this>
  declare mkactivity: RouterMethod<Req, Res, App, this>
  declare mkcalendar: RouterMethod<Req, Res, App, this>
  declare mkcol: RouterMethod<Req, Res, App, this>
  declare move: RouterMethod<Req, Res, App, this>
  declare notify: RouterMethod<Req, Res, App, this>
  declare options: RouterMethod<Req, Res, App, this>
  declare patch: RouterMethod<Req, Res, App, this>
  declare post: RouterMethod<Req, Res, App, this>
  declare pri: RouterMethod<Req, Res, App, this>
  declare propfind: RouterMethod<Req, Res, App, this>
  declare proppatch: RouterMethod<Req, Res, App, this>
  declare purge: RouterMethod<Req, Res, App, this>
  declare put: RouterMethod<Req, Res, App, this>
  declare rebind: RouterMethod<Req, Res, App, this>
  declare report: RouterMethod<Req, Res, App, this>
  declare search: RouterMethod<Req, Res, App, this>
  declare source: RouterMethod<Req, Res, App, this>
  declare subscribe: RouterMethod<Req, Res, App, this>
  declare trace: RouterMethod<Req, Res, App, this>
  declare unbind: RouterMethod<Req, Res, App, this>
  declare unlink: RouterMethod<Req, Res, App, this>
  declare unlock: RouterMethod<Req, Res, App, this>
  declare unsubscribe: RouterMethod<Req, Res, App, this>

  static {
    for (const m of METHODS) {
      Router.prototype[m.toLowerCase()] = Router.add(m)
    }
  }

  static add<App extends Router<App, Req, Res>, Req, Res>(
    method: Method
  ): RouterMethod<Req, Res, Router<App, Req, Res>, Router<App, Req, Res>> {
    return function (this: Router<App, Req, Res>, ...args: RouterMethodParams<Req, Res>): Router<App, Req, Res> {
      const [path, ...restArgs] = args
      const handlers: Handler<Req, Res>[] = restArgs.flat()

      if (isString(path)) {
        const handler = handlers.splice(0, 1)[0]
        pushMiddleware<Req, Res>(this.middleware)({
          path: path,
          handler: handler,
          handlers: handlers,
          method,
          type: 'route'
        })
        return this
      }

      if (isStringArray(path)) {
        const handler = handlers.splice(0, 1)[0]
        for (const eachPath of path) {
          pushMiddleware<Req, Res>(this.middleware)({
            path: eachPath,
            handler: handler,
            handlers: handlers,
            method,
            type: 'route'
          })
        }
        return this
      }

      if (Array.isArray(path)) {
        handlers.unshift(...path)
      } else {
        handlers.unshift(path)
      }

      const handler = handlers.splice(0, 1)[0]
      pushMiddleware<Req, Res>(this.middleware)({
        handler: handler,
        handlers: handlers,
        method,
        type: 'route'
      })
      return this
    }
  }

  msearch(...args: RouterMethodParams<Req, Res>): this {
    const [path, ...restArgs] = args
    const handlers: Handler<Req, Res>[] = restArgs.flat()

    if (isString(path)) {
      const handler = handlers.splice(0, 1)?.[0]
      pushMiddleware<Req, Res>(this.middleware)({
        path: path,
        handler: handler,
        handlers: handlers,
        method: 'M-SEARCH',
        type: 'route'
      })
      return this
    }

    if (isStringArray(path)) {
      const handler = handlers.splice(0, 1)[0]
      for (const eachPath of path) {
        pushMiddleware<Req, Res>(this.middleware)({
          path: eachPath,
          handler: handler,
          handlers: handlers,
          method: 'M-SEARCH',
          type: 'route'
        })
      }
      return this
    }

    if (Array.isArray(path)) {
      handlers.unshift(...path)
    } else {
      handlers.unshift(path)
    }

    const handler = handlers.splice(0, 1)[0]
    pushMiddleware<Req, Res>(this.middleware)({
      handler: handler,
      handlers: handlers,
      method: 'M-SEARCH',
      type: 'route'
    })
    return this
  }

  all(...args: RouterMethodParams<Req, Res>): this {
    const [path, ...restArgs] = args
    const handlers: Handler<Req, Res>[] = restArgs.flat()

    if (isString(path)) {
      const handler = handlers.splice(0, 1)[0]
      pushMiddleware(this.middleware)({
        path: path,
        handler: handler,
        handlers: handlers,
        type: 'route'
      })
      return this
    }

    if (isStringArray(path)) {
      const handler = handlers.splice(0, 1)[0]
      for (const eachPath of path) {
        pushMiddleware(this.middleware)({
          path: eachPath,
          handler: handler,
          handlers: handlers,
          type: 'route'
        })
      }
      return this
    }

    if (Array.isArray(path)) {
      handlers.unshift(...path)
    } else {
      handlers.unshift(path)
    }

    const handler = handlers.splice(0, 1)[0]
    pushMiddleware(this.middleware)({
      handler: handler,
      handlers: handlers,
      type: 'route'
    })
    return this
  }

  /**
   * Push middleware to the stack
   */
  use(...args: UseMethodParams<Req, Res, App>): this {
    const [path, ...restArgs] = args
    const handlers: Array<Router<App, Req, Res> | Handler<Req, Res>> = restArgs.flat()

    if (isString(path)) {
      const handler = handlers.splice(0, 1)[0]
      pushMiddleware<Req, Res, Router<App, Req, Res>>(this.middleware)({
        path,
        handler: handler,
        handlers: handlers,
        type: 'mw'
      })
      return this
    }

    if (isStringArray(path)) {
      const handler = handlers.splice(0, 1)[0]
      for (const eachPath of path) {
        pushMiddleware<Req, Res, Router<App, Req, Res>>(this.middleware)({
          path: eachPath,
          handler: handler,
          handlers: handlers,
          type: 'mw'
        })
      }
      return this
    }

    if (Array.isArray(path)) {
      handlers.unshift(...path)
    } else {
      handlers.unshift(path)
    }

    const handler = handlers.splice(0, 1)?.[0]
    pushMiddleware<Req, Res, Router<App, Req, Res>>(this.middleware)({
      handler: handler,
      handlers: handlers,
      type: 'mw'
    })

    return this
  }
}
