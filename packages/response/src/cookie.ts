import * as cookie from "@otterhttp/cookie"

import type { HasIncomingHeaders, HasOutgoingHeaders, HasReq } from "./types"

type SetCookieResponse = HasOutgoingHeaders & HasReq<HasIncomingHeaders>
export type SetCookieOptions = cookie.SerializeOptions & {
  sign?: ((cookieValue: string) => string) | undefined
}
export function setCookie(res: SetCookieResponse, name, value: string, options: SetCookieOptions = {}): void {
  if (options.maxAge != null) {
    options.expires = new Date(Date.now() + options.maxAge)
    options.maxAge /= 1000
  }

  if (options.path == null) options.path = "/"

  if (options.sign != null) {
    value = options.sign(value)
  }

  res.appendHeader("set-cookie", cookie.serialize(name, value, options))
}

export function clearCookie(res: SetCookieResponse, name: string, options?: cookie.SerializeOptions): void {
  setCookie(res, name, "", Object.assign({}, { expires: new Date(1), path: "/" }, options))
}
