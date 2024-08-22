import { parse as parseCookie } from '@otterhttp/cookie'

import type { CookieParsingSettings, HasHeaders } from './types'

function decodeCookies(cookies: Record<string, string>, options?: CookieParsingSettings) {
  if (options == null) return
  if (options.cookieDecoder == null) return
  if (options.encodedCookieMatcher == null) return

  for (const [cookieName, cookieValue] of Object.entries(cookies)) {
    if (!options.encodedCookieMatcher(cookieValue)) continue
    cookies[cookieName] = options.cookieDecoder(cookieValue)
  }
}

export function parseCookieHeader(req: HasHeaders, options?: CookieParsingSettings | undefined) {
  if (req.headers.cookie == null) {
    return {}
  }

  const cookieJar = parseCookie(req.headers.cookie)
  decodeCookies(cookieJar, options)

  return cookieJar
}
