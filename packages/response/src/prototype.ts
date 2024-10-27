import { type OutgoingHttpHeader, type OutgoingHttpHeaders, ServerResponse } from "node:http"
import { HttpError } from "@otterhttp/errors"
import type { Request } from "@otterhttp/request"
import { type JSONLiteral, type SendFileOptions, json, send, sendFile, sendStatus } from "@otterhttp/send"

import { type SetCookieOptions, clearCookie, setCookie } from "./cookie"
import { type DownloadOptions, attachment, download } from "./download"
import { type FormatProps, formatResponse } from "./format"
import {
  appendResponseHeaders,
  appendResponseVaryHeader,
  setResponseContentTypeHeader,
  setResponseHeaderSpecialCases,
  setResponseLinkHeader,
  setResponseLocationHeader,
} from "./headers"
import { validatePreconditions } from "./preconditions"
import { redirect } from "./redirect"
import type { AppendHeaders, Input, LegacyHeaders, ResponseAppSettings } from "./types"

export class Response<Req extends Request<unknown> = Request<unknown>> extends ServerResponse<Req> {
  // assigned by App
  declare appSettings: ResponseAppSettings | undefined

  // own members (assigned by constructor)
  locals: Record<string, unknown>
  private _lateHeaderActions?: Map<symbol, (res: unknown) => void>

  constructor(request: Req) {
    super(request)

    this.locals = {}
  }

  // header-related overrides/extensions
  getHeader<HeaderName extends string>(headerName: HeaderName): LegacyHeaders[Lowercase<HeaderName>] {
    return super.getHeader(headerName)
  }

  setHeader<HeaderName extends string>(
    headerName: HeaderName,
    value: Input<LegacyHeaders[Lowercase<HeaderName>]>,
  ): this {
    const lowerCaseHeaderName = headerName.toLowerCase() as Lowercase<HeaderName>
    const specialCase = setResponseHeaderSpecialCases.get<Lowercase<HeaderName>>(lowerCaseHeaderName)
    if (specialCase != null) value = specialCase(this, value)
    super.setHeader(headerName, value)
    return this
  }

  appendHeader<HeaderName extends string>(
    headerName: HeaderName,
    value: Input<AppendHeaders[Lowercase<HeaderName>]>,
  ): this {
    super.appendHeader(headerName, value)
    return this
  }

  appendHeaders(headers: AppendHeaders): this {
    appendResponseHeaders(this, headers)
    return this
  }

  writeHead(statusCode: number, statusMessage?: string, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]): this
  writeHead(statusCode: number, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]): this
  override writeHead(
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
  ): this {
    if (this._lateHeaderActions != null) {
      for (const action of this._lateHeaderActions.values()) {
        action(this)
      }
    }
    // @ts-expect-error typescript doesn't handle overloads very well
    return super.writeHead(statusCode, statusMessage, headers)
  }

  registerLateHeaderAction(symbol: symbol, action: (res: this) => void) {
    this._lateHeaderActions ??= new Map()
    this._lateHeaderActions.set(symbol, action as (res: unknown) => void)
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

  cookie(name: string, value: string, options?: SetCookieOptions): this {
    if (options == null) options = this.appSettings?.setCookieOptions
    else {
      options = [this.appSettings?.setCookieOptions, options].reduce<SetCookieOptions>(
        (optionsAccumulator, optionsSource) => {
          if (optionsSource == null) return optionsAccumulator
          for (const [key, value] of Object.entries(optionsSource)) {
            if (value === undefined) continue
            optionsAccumulator[key] = value
          }
          return optionsAccumulator
        },
        {},
      )
    }
    setCookie(this, name, value, options)
    return this
  }

  clearCookie(name: string, options?: SetCookieOptions): this {
    clearCookie(this, name, options)
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
      if (error instanceof HttpError && error.code != null && error.code.startsWith("ERR_PRECONDITION_FAILED"))
        return true
      throw error
    }
    return false
  }

  isStale(): boolean {
    return !this.isFresh()
  }
}
