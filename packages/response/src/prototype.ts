import { ServerResponse } from 'node:http'
import { HttpError } from '@otterhttp/errors'
import type { Request } from '@otterhttp/request'
import { type JSONLiteral, type SendFileOptions, json, send, sendFile, sendStatus } from '@otterhttp/send'

import { type SetCookieOptions, clearCookie, setCookie } from './cookie'
import { type DownloadOptions, attachment, download } from './download'
import { type FormatProps, formatResponse } from './format'
import {
  appendResponseHeaders,
  appendResponseVaryHeader,
  setResponseContentTypeHeader,
  setResponseHeaderSpecialCases,
  setResponseHeaders,
  setResponseLinkHeader,
  setResponseLocationHeader
} from './headers'
import { validatePreconditions } from './preconditions'
import { redirect } from './redirect'
import type { AppendHeaders, Headers, Input, ResponseAppSettings } from './types'

export class Response<Req extends Request<unknown> = Request<unknown>> extends ServerResponse<Req> {
  // assigned by App
  declare appSettings: ResponseAppSettings

  // own members (assigned by constructor)
  locals: Record<string, unknown>

  constructor(request: Req) {
    super(request)

    this.locals = {}
  }

  // header-related overrides/extensions
  getHeader<HeaderName extends string>(headerName: HeaderName): Headers[Lowercase<HeaderName>] {
    return super.getHeader(headerName)
  }

  setHeader<HeaderName extends string>(headerName: HeaderName, value: Input<Headers[Lowercase<HeaderName>]>): this {
    const lowerCaseHeaderName = headerName.toLowerCase() as Lowercase<HeaderName>
    const specialCase = setResponseHeaderSpecialCases.get<Lowercase<HeaderName>>(lowerCaseHeaderName)
    if (specialCase != null) value = specialCase(this, value)
    super.setHeader(headerName, value)
    return this
  }

  setHeaders(headers: Headers): this {
    setResponseHeaders(this, headers)
    return this
  }

  appendHeader<HeaderName extends string>(
    headerName: HeaderName,
    value: Input<AppendHeaders[Lowercase<HeaderName>]>
  ): this {
    super.appendHeader(headerName, value)
    return this
  }

  appendHeaders(headers: AppendHeaders): this {
    appendResponseHeaders(this, headers)
    return this
  }

  location(url: string | URL): this {
    setResponseLocationHeader(this, url)
    return this
  }

  links(links: Record<string, string | URL>): this {
    setResponseLinkHeader(this, links)
    return this
  }

  vary(header: string | string[]): this {
    appendResponseVaryHeader(this, header)
    return this
  }

  contentType(type: string): this {
    setResponseContentTypeHeader(this, type)
    return this
  }

  // cookies & in-place state modification

  status(statusCode: number): this {
    this.statusCode = statusCode
    return this
  }

  attachment(filename?: string): this {
    attachment(this, filename)
    return this
  }

  async cookie(name: string, value: string, options?: SetCookieOptions): Promise<this> {
    await setCookie(this, name, value, options)
    return this
  }

  async clearCookie(name: string, options?: SetCookieOptions): Promise<this> {
    await clearCookie(this, name, options)
    return this
  }

  // terminators (anything that calls `.end()`)
  sendStatus(statusCode: number): this {
    sendStatus(this, statusCode)
    return this
  }

  async redirect(url: string, statusCode?: number): Promise<this> {
    await redirect(this, url, statusCode)
    return this
  }

  send(body: string | Buffer | null): this {
    send(this, body)
    return this
  }

  async sendFile(path: string, options?: SendFileOptions): Promise<this> {
    await sendFile(this, path, options)
    return this
  }

  json(body: JSONLiteral): this {
    json(this, body)
    return this
  }

  async download(path: string, filename?: string, options?: DownloadOptions): Promise<this> {
    await download(this, path, filename, options)
    return this
  }

  // content-negotiation utility
  async format(obj: FormatProps): Promise<this> {
    await formatResponse(this, obj)
    return this
  }

  // preconditions/caching
  validatePreconditions(): this {
    validatePreconditions(this)
    return this
  }

  isFresh(): boolean {
    try {
      this.validatePreconditions()
    } catch (error) {
      if (error instanceof HttpError && error.code != null && error.code.startsWith('ERR_PRECONDITION_FAILED'))
        return true
      throw error
    }
    return false
  }

  isStale(): boolean {
    return !this.isFresh()
  }
}
