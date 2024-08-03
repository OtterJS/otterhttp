/* HELPER TYPES */

export type NextFunction = (err?: any) => void

export type SyncHandler<Request = any, Response = any> = (req: Request, res: Response, next: NextFunction) => void

export type AsyncHandler<Request = any, Response = any> = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

export type Handler<Request = any, Response = any> = AsyncHandler<Request, Response> | SyncHandler<Request, Response>

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

type RIM<Req, Res, App> = (...args: RouterMethodParams<Req, Res>) => App

export interface Middleware<Req = any, Res = any> {
  method?: Method
  handler: Handler<Req, Res>
  path?: string
  type: MiddlewareType
  regex?: RegexParams
  fullPath?: string
}

export type MethodHandler<Req = any, Res = any> = {
  path?: string | string[] | Handler<Req, Res>
  handler?: Handler<Req, Res>
  type: MiddlewareType
  regex?: RegexParams
  fullPath?: string
}

export type RouterHandler<Req = any, Res = any> = Handler<Req, Res> | Handler<Req, Res>[] | string[]

export type RouterPathOrHandler<Req = any, Res = any> = string | RouterHandler<Req, Res>

export type RouterMethod<Req = any, Res = any> = (
  path: string | string[] | Handler<Req, Res>,
  handler?: RouterHandler<Req, Res>,
  ...handlers: RouterHandler<Req, Res>[]
) => any

type RouterMethodParams<Req = any, Res = any> = Parameters<RouterMethod<Req, Res>>

export type UseMethod<Req = any, Res = any, App extends Router = any> = (
  path: RouterPathOrHandler<Req, Res> | App,
  handler?: RouterHandler<Req, Res> | App,
  ...handlers: (RouterHandler<Req, Res> | App)[]
) => any

export type UseMethodParams<Req = any, Res = any, App extends Router = any> = Parameters<UseMethod<Req, Res, App>>

/** HELPER METHODS */

const createMiddlewareFromRoute = <Req = any, Res = any>({
  path,
  handler,
  fullPath,
  method
}: MethodHandler<Req, Res> & {
  method?: Method
}) => ({
  method,
  handler: handler || (path as Handler),
  path: typeof path === 'string' ? path : '/',
  fullPath: typeof path === 'string' ? fullPath : path
})

/**
 * Push wares to a middleware array
 * @param mw Middleware arrays
 */
export const pushMiddleware =
  <Req = any, Res = any>(mw: Middleware[]) =>
  ({
    path,
    handler,
    method,
    handlers,
    type,
    fullPaths
  }: MethodHandler<Req, Res> & {
    method?: Method
    handlers?: RouterHandler<Req, Res>[]
    fullPaths?: string[]
  }): void => {
    const m = createMiddlewareFromRoute<Req, Res>({ path, handler, method, type, fullPath: fullPaths?.[0] })

    let waresFromHandlers: { handler: Handler<Req, Res> }[] = []
    let idx = 1

    if (handlers) {
      waresFromHandlers = handlers.flat().map((handler) =>
        createMiddlewareFromRoute<Req, Res>({
          path,
          handler: handler as Handler,
          method,
          type,
          fullPath: fullPaths == null ? null : fullPaths[idx++]
        })
      )
    }

    for (const mdw of [m, ...waresFromHandlers]) mw.push({ ...mdw, type })
  }

/**
 * tinyhttp Router. Manages middleware and has HTTP methods aliases, e.g. `app.get`, `app.put`
 */
export class Router<App extends Router = any, Req = any, Res = any> {
  middleware: Middleware[] = []
  mountpath = '/'
  parent: App
  apps: Record<string, App> = {}

  declare acl: RIM<Req, Res, this>
  declare bind: RIM<Req, Res, this>
  declare checkout: RIM<Req, Res, this>
  declare connect: RIM<Req, Res, this>
  declare copy: RIM<Req, Res, this>
  declare delete: RIM<Req, Res, this>
  declare get: RIM<Req, Res, this>
  declare head: RIM<Req, Res, this>
  declare link: RIM<Req, Res, this>
  declare lock: RIM<Req, Res, this>
  declare merge: RIM<Req, Res, this>
  declare mkactivity: RIM<Req, Res, this>
  declare mkcalendar: RIM<Req, Res, this>
  declare mkcol: RIM<Req, Res, this>
  declare move: RIM<Req, Res, this>
  declare notify: RIM<Req, Res, this>
  declare options: RIM<Req, Res, this>
  declare patch: RIM<Req, Res, this>
  declare post: RIM<Req, Res, this>
  declare pri: RIM<Req, Res, this>
  declare propfind: RIM<Req, Res, this>
  declare proppatch: RIM<Req, Res, this>
  declare purge: RIM<Req, Res, this>
  declare put: RIM<Req, Res, this>
  declare rebind: RIM<Req, Res, this>
  declare report: RIM<Req, Res, this>
  declare search: RIM<Req, Res, this>
  declare source: RIM<Req, Res, this>
  declare subscribe: RIM<Req, Res, this>
  declare trace: RIM<Req, Res, this>
  declare unbind: RIM<Req, Res, this>
  declare unlink: RIM<Req, Res, this>
  declare unlock: RIM<Req, Res, this>
  declare unsubscribe: RIM<Req, Res, this>

  constructor() {
    for (const m of METHODS) {
      this[m.toLowerCase()] = this.add(m as Method)
    }
  }

  add(method: Method) {
    return (...args: RouterMethodParams<Req, Res>): this => {
      const handlers = args.slice(1).flat() as Handler<Req, Res>[]
      if (Array.isArray(args[0])) {
        for (const arg of Object.values(args[0])) {
          if (typeof arg === 'string') {
            pushMiddleware<Req, Res>(this.middleware)({
              path: arg,
              handler: handlers[0],
              handlers: handlers.slice(1),
              method,
              type: 'route'
            })
          }
        }
      } else {
        pushMiddleware<Req, Res>(this.middleware)({
          path: args[0],
          handler: handlers[0],
          handlers: handlers.slice(1),
          method,
          type: 'route'
        })
      }

      return this
    }
  }

  msearch(...args: RouterMethodParams<Req, Res>): this {
    const handlers = args.slice(1).flat() as Handler<Req, Res>[]

    pushMiddleware<Req, Res>(this.middleware)({
      path: args[0],
      handler: handlers[0],
      handlers: handlers.slice(1),
      method: 'M-SEARCH',
      type: 'route'
    })

    return this
  }

  all(...args: RouterMethodParams<Req, Res>): this {
    const handlers = args.slice(1).flat() as Handler<Req, Res>[]

    pushMiddleware(this.middleware)({
      path: args[0],
      handler: handlers[0],
      handlers: handlers.slice(1),
      type: 'route'
    })

    return this
  }

  /**
   * Push middleware to the stack
   */
  use(...args: UseMethodParams<Req, Res, App>): this {
    const base = args[0]

    const handlers = args.slice(1).flat()

    if (typeof base === 'string') {
      pushMiddleware(this.middleware)({
        path: base,
        handler: handlers[0] as Handler,
        handlers: handlers.slice(1) as Handler[],
        type: 'mw'
      })
    } else {
      pushMiddleware(this.middleware)({
        path: '/',
        handler: Array.isArray(base) ? (base[0] as Handler) : (base as Handler),
        handlers: Array.isArray(base)
          ? [...(base.slice(1) as Handler[]), ...(handlers as Handler[])]
          : (handlers as Handler[]),
        type: 'mw'
      })
    }

    return this
  }
}
