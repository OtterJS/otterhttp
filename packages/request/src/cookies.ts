import { parse as parseCookie } from "@otterhttp/cookie"

import type { CookieParsingSettings, HasHeaders } from "./types"

export class Cookie {
  private _value: string
  private _unsignedValue: string | undefined
  private _unsigningError: unknown | undefined
  private _signed: boolean

  constructor(value: string, signed = false) {
    this._value = value
    this._signed = signed
  }

  get value(): string {
    if (this._unsigningError != null) throw this._unsigningError
    if (this._signed) return this._unsignedValue as string
    return this._value
  }

  get signed(): boolean {
    return this._signed
  }

  /**
   * @internal
   */
  unsign(unsigner: (encodedValue: string) => string): void {
    try {
      this._unsignedValue = unsigner(this._value)
    } catch (e) {
      this._unsigningError = e
    }
    this._signed = true
  }
}

function unsignCookies(cookies: Record<string, Cookie>, options?: CookieParsingSettings) {
  if (options == null) return
  if (options.cookieUnsigner == null) return
  if (options.signedCookieMatcher == null) return

  for (const [cookieName, cookie] of Object.entries(cookies)) {
    if (!options.signedCookieMatcher(cookie.value)) continue
    cookies[cookieName].unsign(options.cookieUnsigner)
  }
}

export function parseCookieHeader(req: HasHeaders, options?: CookieParsingSettings | undefined) {
  if (req.headers.cookie == null) {
    return {}
  }

  const rawCookieJar: Record<string, string> = parseCookie(req.headers.cookie, { decode: options?.cookieDecoder })
  const cookieJar: Record<string, Cookie> = {}
  for (const [cookieName, cookieValue] of Object.entries(rawCookieJar)) {
    cookieJar[cookieName] = new Cookie(cookieValue)
  }
  unsignCookies(cookieJar, options)

  return cookieJar
}
