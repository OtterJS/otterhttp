import { type Server, createServer } from 'node:http'
import { ClientError } from '@otterhttp/errors'
import { Request } from '@otterhttp/request'
import { Response } from '@otterhttp/response'
import type { Handler, Middleware, NextFunction, UseMethodParams } from '@otterhttp/router'
import { Router, pushMiddleware } from '@otterhttp/router'
import { type URLParams, getPathname, getURLParams } from '@otterhttp/url'
import { parse as rg } from 'regexparam'

import { getExtendMiddleware } from './extend.js'
import type { TemplateEngineOptions } from './index.js'
import type { ErrorHandler } from './onError.js'
import { onErrorHandler } from './onError.js'
import { isString, isStringArray } from './type-guards'
import type { AppConstructor, AppRenderOptions, AppSettings, TemplateEngine } from './types.js'
import { type IViewPrototype, View } from './view.js'

/**
 * Add leading slash if not present (e.g. path -> /path, /path -> /path)
 * @param x
 */
const lead = (x: string) => (x.charCodeAt(0) === 47 ? x : `/${x}`)

const mount = <Req extends Request = Request, Res extends Response<Req> = Response<Req>>(
  fn: App<Req, Res> | Handler<Req, Res>
) => (fn instanceof App ? fn.attachPromise : fn)

const paramsProto = {
  getIterator: function* (this: typeof paramsProto) {
    yield* Object.entries(this)
    const proto = Object.getPrototypeOf(this)
    if (proto === paramsProto) return
    yield* proto
  },
  [Symbol.iterator]() {
    return this.getIterator()
  }
}

/**
 * `App` class - the starting point of tinyhttp app.
 *
 * With the `App` you can:
 * * use routing methods and `.use(...)`
 * * set no match (404) and error (500) handlers
 * * configure template engines
 * * store data in locals
 * * listen the http server on a specified port
 *
 * In case you use TypeScript, you can pass custom types to this class because it is also a generic class.
 *
 * Example:
 *
 * ```ts
 * interface CoolReq extends Request {
 *  genericsAreDope: boolean
 * }
 *
 * const app = App<any, CoolReq, Response>()
 * ```
 */
export class App<Req extends Request = Request, Res extends Response<Req> = Response<Req>> extends Router<
  App<Req, Res>,
  Req,
  Res
> {
  private _extendMiddleware: Middleware<Req, Res> | undefined
  private _noMatchMiddleware: Middleware<Req, Res> | undefined
  private readonly _settings: AppSettings

  middleware: Middleware<Req, Res>[] = []

  locals: Record<string, unknown> = {}
  onError: ErrorHandler<Req, Res>
  engines: Record<string, TemplateEngine<TemplateEngineOptions>> = {}
  attach: (req: Req, res: Res, next?: NextFunction) => void
  attachPromise: (req: Req, res: Res, next?: NextFunction) => Promise<void>
  cache: Record<string, unknown>

  constructor(options: AppConstructor<Req, Res> = {}) {
    super()
    this.onError = options?.onError || onErrorHandler
    this._settings = {
      view: View,
      xPoweredBy: true,
      views: `${process.cwd()}/views`,
      'view cache': process.env.NODE_ENV === 'production',
      'trust proxy': 0,
      ...options.settings
    }
    this.attach = (req, res, next?: NextFunction) => queueMicrotask(() => this.handler(req, res, next))
    this.attachPromise = async (req, res, next?: NextFunction) => await this.handler(req, res, next)
    this.cache = {}
  }

  get settings(): AppSettings {
    if (!this.parent) return this._settings
    if (this.parent.settings == null) return this._settings
    if (this._settings == null) return this.parent.settings
    return Object.assign({}, this.parent.settings, this._settings)
  }

  /**
   * Set app setting
   * @param setting setting name
   * @param value setting value
   */
  set<K extends keyof AppSettings>(setting: K, value: AppSettings[K]): this {
    this._settings[setting] = value

    return this
  }

  /**
   * Enable app setting
   * @param setting Setting name
   */
  enable<K extends keyof AppSettings>(setting: K): this {
    this._settings[setting] = true as AppSettings[K]

    return this
  }

  /**
   * Check if setting is enabled
   * @param setting Setting name
   * @returns
   */
  enabled<K extends keyof AppSettings>(setting: K): boolean {
    return Boolean(this._settings[setting])
  }

  /**
   * Disable app setting
   * @param setting Setting name
   */
  disable<K extends keyof AppSettings>(setting: K): this {
    this._settings[setting] = false as AppSettings[K]

    return this
  }

  /**
   * Return the app's absolute pathname
   * based on the parent(s) that have
   * mounted it.
   *
   * For example if the application was
   * mounted as `"/admin"`, which itself
   * was mounted as `"/blog"` then the
   * return value would be `"/blog/admin"`.
   *
   */
  path(): string {
    return this.parent ? this.parent.path() + this.mountpath : ''
  }

  /**
   * Register a template engine with extension
   */
  engine(ext: string, fn: TemplateEngine): this {
    this.engines[ext[0] === '.' ? ext : `.${ext}`] = fn

    return this
  }

  /**
   * Render a template
   * @param name What to render
   * @param data data that is passed to a template
   * @param options Template engine options
   */
  async render<RenderOptions extends TemplateEngineOptions = TemplateEngineOptions>(
    name: string,
    data: Record<string, unknown>,
    options?: AppRenderOptions<RenderOptions>
  ): Promise<unknown> {
    let view: InstanceType<IViewPrototype> | undefined

    const { _locals, ...opts }: AppRenderOptions = options ?? {}

    let locals = this.locals

    if (_locals) locals = { ...locals, ..._locals }

    locals = { ...locals, ...data }

    if (opts.cache == null) opts.cache = this.enabled('view cache')

    if (opts.cache) {
      view = this.cache[name] as View
    }

    if (!view) {
      const View = this._settings.view
      if (View == null) throw new TypeError(`No app-wide default view engine is configured, cannot render '${name}'`)

      view = new View(name, {
        defaultEngine: this._settings['view engine'],
        root: this._settings.views,
        engines: this.engines
      })

      if (opts.cache) {
        this.cache[name] = view
      }
    }

    return await view.render(opts, locals)
  }

  use(...args: UseMethodParams<Req, Res, App<Req, Res>>): this {
    const [base, ...restArgs] = args
    const fns: Array<App<Req, Res> | Handler<Req, Res>> = restArgs.flat()

    let pathArray: string[] = []
    if (isString(base)) {
      pathArray = [base]
    } else if (isStringArray(base)) {
      pathArray = base
    } else if (Array.isArray(base)) {
      fns.unshift(...base)
    } else {
      fns.unshift(base)
    }

    pathArray = pathArray.length ? pathArray.map((path) => lead(path)) : ['/']

    const mountpath = pathArray.join(', ')
    let regex: { keys: string[]; pattern: RegExp } | undefined = undefined

    for (const fn of fns) {
      if (fn instanceof App) {
        for (const path of pathArray) {
          regex = rg(path, true)
          fn.mountpath = mountpath
          this.apps[path] = fn
          fn.parent = this
        }
      }
    }
    for (const path of pathArray) {
      const handlerPaths: string[] = []
      const handlerFunctions: Array<App<Req, Res> | Handler<Req, Res>> = []
      const handlerPathBase = path === '/' ? '' : lead(path)
      for (const fn of fns) {
        if (fn instanceof App && fn.middleware?.length) {
          for (const mw of fn.middleware) {
            handlerPaths.push(`${handlerPathBase}${mw.path ? lead(mw.path) : ''}`)
            handlerFunctions.push(fn)
          }
        } else {
          handlerPaths.push('')
          handlerFunctions.push(fn)
        }
      }
      const handlerFunction = handlerFunctions.splice(0, 1)[0]
      pushMiddleware(this.middleware)({
        path,
        regex,
        type: 'mw',
        handler: mount(handlerFunction),
        handlers: handlerFunctions.map(mount),
        fullPaths: handlerPaths
      })
    }

    return this
  }

  route(path: string): App<Req, Res> {
    const app = new App<Req, Res>({ settings: this._settings })

    this.use(path, app)

    return app
  }

  #find(url: string): Middleware<Req, Res>[] {
    return this.middleware.filter((m) => {
      m.regex ??= m.path ? rg(m.path, m.type === 'mw') : undefined

      let fullPathRegex: { keys: string[]; pattern: RegExp } | undefined

      m.fullPath && typeof m.fullPath === 'string'
        ? (fullPathRegex = rg(m.fullPath, m.type === 'mw'))
        : (fullPathRegex = undefined)

      if (m.regex != null && !m.regex.pattern.test(url)) return false
      if (m.type === 'mw' && fullPathRegex != null && !fullPathRegex.pattern.test(url)) return false
      return true
    })
  }

  /**
   * Extends Req / Res objects, pushes 404 and 500 handlers, dispatches middleware
   * @param req Req object
   * @param res Res object
   * @param next 'Next' function
   */
  async handler(req: Req, res: Res, next?: NextFunction): Promise<void> {
    /* Set X-Powered-By header */
    const { xPoweredBy } = this._settings
    if (xPoweredBy) res.setHeader('X-Powered-By', typeof xPoweredBy === 'string' ? xPoweredBy : 'otterhttp')

    req.pathname ??= getPathname(req.url)
    req.subpathname ??= req.pathname
    req.params ??= Object.create(paramsProto)

    const matched = this.#find(req.subpathname)

    const mw: Middleware<Req, Res>[] = matched.filter((x) => {
      if (x.method == null) return true
      if (req.method === 'HEAD' && x.method === 'GET') return true
      return x.method === req.method
    })

    if (this.parent == null) {
      mw.unshift(
        (this._extendMiddleware ??= {
          handler: getExtendMiddleware<Req, Res>(this),
          type: 'mw',
          path: '/'
        })
      )

      mw.push(
        (this._noMatchMiddleware ??= {
          handler: this.onError.bind(
            this,
            new ClientError('Middleware fell through', {
              statusCode: 404,
              code: 'ERR_MIDDLEWARE_FELL_THROUGH',
              exposeMessage: false
            })
          ),
          type: 'mw',
          path: '/'
        })
      )
    }

    if (mw.length <= 0) {
      next?.()
      return
    }

    const handle = async (mw: Middleware<Req, Res>, req: Req, res: Res): Promise<boolean> => {
      const { path = '/', handler, regex } = mw

      let params: URLParams

      try {
        params = regex ? getURLParams(regex, req.subpathname) : {}
      } catch (e) {
        console.error(e)
        if (e instanceof URIError) {
          res.sendStatus(400)
          return true
        }
        throw e
      }

      const oldReqParams = req.params
      if (Object.keys(params).length > 0) {
        req.params = Object.assign(Object.create(oldReqParams), params)
      }

      // Warning: users should not use :wild as a pattern
      let matchedSubpath = path
      if (regex) {
        for (const key of regex.keys as string[]) {
          if (key === 'wild') {
            matchedSubpath = matchedSubpath.replace('*', params.wild)
          } else {
            matchedSubpath = matchedSubpath.replace(`:${key}`, params[key])
          }
        }
      }

      const oldSubpath = req.subpathname
      if (mw.type === 'mw' || mw.type === 'route') {
        req.subpathname = lead(req.subpathname.substring(matchedSubpath.length))
      }

      if (this._settings?.enableReqRoute) req.route = mw

      let done = true
      const next = () => (done = false)
      try {
        await handler(req, res, next)
      } catch (err) {
        this.onError(err, req, res, next)
      }

      req.params = oldReqParams
      req.subpathname = oldSubpath

      return done
    }

    let idx = 0
    while (true) {
      if (idx >= mw.length) {
        if (next != null) next()
        return
      }

      const done = await handle(mw[idx++], req, res)
      if (done) break
    }
  }

  /**
   * Creates HTTP server and dispatches middleware
   * @param port server listening port
   * @param cb callback to be invoked after server starts listening
   * @param host server listening host
   */
  // @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/pull/70289
  listen(port?: number, cb?: () => void, host?: string): Server<typeof Request, typeof Response<Request>> {
    // @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/pull/70289
    return createServer<typeof Request, typeof Response<Request>>({
      IncomingMessage: Request,
      ServerResponse: Response
    })
      .on('request', this.attach)
      .listen(port, host, cb)
  }
}
