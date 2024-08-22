import { parse as parseCookie } from '@otterhttp/cookie'

import type { CookieParsingSettings, HasHeaders } from './types'

export class Cookie {
  private _value: string
  private _decodedValue: string | undefined
  private _decodingError: unknown | undefined
  private _signed: boolean

  constructor(value: string, signed = false) {
    this._value = value
    this._signed = signed
  }

  get value(): string {
    if (this._decodingError != null) throw this._decodingError
    if (this._signed) return this._decodedValue as string
    return this._value
  }

  get signed(): boolean {
    return this._signed
  }

  /**
   * @internal
   */
  decode(decoder: (encodedValue: string) => string): void {
    try {
      this._value = decoder(this._value)
    } catch (e) {
      this._decodingError = e
    }
    this._signed = true
  }
}

function decodeCookies(cookies: Record<string, Cookie>, options?: CookieParsingSettings) {
  if (options == null) return
  if (options.cookieDecoder == null) return
  if (options.encodedCookieMatcher == null) return

  for (const [cookieName, cookie] of Object.entries(cookies)) {
    if (!options.encodedCookieMatcher(cookie.value)) continue
    cookies[cookieName].decode(options.cookieDecoder)
  }
}

export function parseCookieHeader(req: HasHeaders, options?: CookieParsingSettings | undefined) {
  if (req.headers.cookie == null) {
    return {}
  }

  const rawCookieJar: Record<string, string> = parseCookie(req.headers.cookie)
  const cookieJar: Record<string, Cookie> = {}
  for (const [cookieName, cookieValue] of Object.entries(rawCookieJar)) {
    cookieJar[cookieName] = new Cookie(cookieValue)
  }
  decodeCookies(cookieJar, options)

  return cookieJar
}
