import type { OutgoingHttpHeaders, ServerResponse } from 'node:http'
import type { SerializeOptions } from '@otterhttp/cookie'
import type { Request } from '@otterhttp/req'
import type { Download, FormatProps, ReadStreamOptions } from '@otterhttp/res'
import type { App } from './app.js'
import type { AppRenderOptions, TemplateEngineOptions } from './types.js'

export const renderTemplate =
  <O extends TemplateEngineOptions = TemplateEngineOptions, Req extends Request = never, Res extends Response = never>(
    _req: Req,
    res: Res,
    app: App<Req, Res>
  ) =>
  (file: string, data?: Record<string, unknown>, options?: AppRenderOptions<O>): Response => {
    app.render(file, data ? { ...res.locals, ...data } : res.locals, options, (err: unknown, html: unknown) => {
      if (err) throw err
      res.send(html)
    })
    return res
  }

export interface Response<B = unknown> extends ServerResponse {
  header<HeaderName extends string>(field: HeaderName, val: OutgoingHttpHeaders[HeaderName]): Response<B>
  header(fields: OutgoingHttpHeaders): Response<B>
  set<HeaderName extends string>(field: HeaderName, val: OutgoingHttpHeaders[HeaderName]): Response<B>
  set(fields: OutgoingHttpHeaders): Response<B>
  get<HeaderName extends string>(field: HeaderName): OutgoingHttpHeaders[HeaderName]
  send(body: B): Response<B>
  sendFile(path: string, options?: ReadStreamOptions): Promise<Response<B>>
  json(body: B): Response<B>
  status(status: number): Response<B>
  sendStatus(statusCode: number): Response<B>
  cookie(
    name: string,
    value: string | Record<string, unknown>,
    options?: SerializeOptions & Partial<{ signed: boolean }>
  ): Response<B>
  clearCookie(name: string, options?: SerializeOptions): Response<B>
  location(url: string): Response<B>
  links(links: { [key: string]: string }): Response<B>
  render<O extends TemplateEngineOptions = TemplateEngineOptions>(
    file: string,
    data?: Record<string, any>,
    options?: AppRenderOptions<O>
  ): Response<B>
  vary(field: string): Response<B>
  format(obj: FormatProps): Response<B>
  redirect(url: string, status?: number): Response<B>
  type(type: string): Response<B>
  download: Download<Response<B>>
  attachment(filename?: string): Response<B>
  locals: Record<string, any>
  /**
   * Send JSON response with JSONP callback support.
   *
   * To enable this method, install the `@otterhttp/jsonp` package and attach the method to `res.jsonp` property.
   *
   * @param obj Response object
   */
  jsonp(obj: any): Response<B>

  append(field: string, value: any): Response<B>
}
