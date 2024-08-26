import { IncomingMessage } from "node:http"
import type { ParsedUrlQuery } from "node:querystring"
import { Accepts } from "@otterhttp/accepts"
import { ContentType } from "@otterhttp/content-type"
import type { Trust } from "@otterhttp/proxy-address"
import type { Middleware } from "@otterhttp/router"
import { type URLParams, getQueryParams } from "@otterhttp/url"
import type { Result as RangeParseResult, Options as RangeParsingOptions, Ranges } from "header-range-parser"

import { getIP, getIPs } from "./addresses"
import { type Cookie, parseCookieHeader } from "./cookies"
import { getRequestHeader } from "./get-header"
import { getHost, getSubdomains } from "./host"
import { type Protocol, getProtocol } from "./protocol"
import { getRange } from "./range"
import type { Headers, RequestAppSettings } from "./types"
import { isXmlHttpRequest } from "./util/is-xml-http-request"
import { requestTypeIs } from "./util/request-type-is"

export class Request<Body = unknown> extends IncomingMessage {
  // assigned by node:http
  declare url: string
  declare method: string

  // assigned by App
  declare pathname: string
  declare subpathname: string
  declare route?: Middleware<never, never>
  declare params: URLParams & Iterable<readonly [string, string]>
  declare appSettings: RequestAppSettings | undefined

  // extension backing fields (assigned by populate)
  private declare _acceptsMeta: Accepts
  private declare _query: ParsedUrlQuery
  private declare _protocol: Protocol
  private declare _hostname: string
  private declare _port: number | undefined
  private declare _subdomains: string[]
  private declare _ip: string | undefined
  private declare _ips: (string | undefined)[]

  // own members
  private _cookies?: Record<string, Cookie>
  body?: Body

  /** @internal */
  populate({ trust, subdomainOffset }: { trust: Trust; subdomainOffset: number | undefined }) {
    this._acceptsMeta = new Accepts(this)
    this._query = getQueryParams(this.url)
    this._protocol = getProtocol(this, trust)
    const host = getHost(this, trust)
    this._hostname = host.hostname
    this._port = host.port
    this._subdomains = getSubdomains(host, subdomainOffset)
    this._ip = getIP(this, trust)
    this._ips = getIPs(this, trust)
  }

  getHeader<HeaderName extends Lowercase<string>>(header: HeaderName): Headers[HeaderName] {
    return getRequestHeader(this, header)
  }

  range(size: number, options?: RangeParsingOptions): Ranges | RangeParseResult | undefined {
    return getRange(this, size, options)
  }

  accepts(): string[]
  accepts(types: string[]): string | false
  accepts(types?: string[]): string | string[] | false {
    return this._acceptsMeta.types(types)
  }

  acceptsEncodings(): string[]
  acceptsEncodings(encodings: string[]): string | false
  acceptsEncodings(encodings?: string[]): string | string[] | false {
    return this._acceptsMeta.encodings(encodings)
  }

  acceptsCharsets(): string[]
  acceptsCharsets(charsets: string[]): string | false
  acceptsCharsets(charsets?: string[]): string | string[] | false {
    return this._acceptsMeta.charsets(charsets)
  }

  acceptsLanguages(): string[]
  acceptsLanguages(charsets: string[]): string | false
  acceptsLanguages(languages?: string[]): string | string[] | false {
    return this._acceptsMeta.languages(languages)
  }

  is(type: string): boolean
  is(types: string[]): boolean
  is(types: string | string[]): boolean {
    return requestTypeIs(this, Array.isArray(types) ? types : [types])
  }

  get query(): ParsedUrlQuery {
    return this._query
  }
  get protocol(): Protocol {
    return this._protocol
  }
  get hostname(): string {
    return this._hostname
  }
  get port(): number | undefined {
    return this._port
  }
  get subdomains(): readonly string[] {
    return this._subdomains
  }
  get ip(): string | undefined {
    return this._ip
  }
  get ips(): readonly (string | undefined)[] {
    return this._ips
  }
  get xhr(): boolean {
    return isXmlHttpRequest(this)
  }
  get secure(): boolean {
    return this.protocol === "https"
  }
  get cookies(): Record<string, Cookie> {
    this._cookies ??= parseCookieHeader(this, this.appSettings?.cookieParsing)
    return this._cookies
  }
  get contentType(): ContentType | undefined {
    try {
      return ContentType.parse(this)
    } catch {
      return undefined
    }
  }
}
