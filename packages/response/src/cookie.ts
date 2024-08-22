import * as cookie from '@otterhttp/cookie'

import type { HasIncomingHeaders, HasOutgoingHeaders, HasReq } from './types'

type SetCookieResponse = HasOutgoingHeaders & HasReq<HasIncomingHeaders>
export type SetCookieOptions = cookie.SerializeOptions & {
  encode?: (value: string) => string
}
export async function setCookie(
  res: SetCookieResponse,
  name,
  value: string,
  { encode, ...options }: SetCookieOptions = {}
): Promise<void> {
  if (encode != null) value = encode(value)

  if (options.maxAge != null) {
    options.expires = new Date(Date.now() + options.maxAge)
    options.maxAge /= 1000
  }

  if (options.path == null) options.path = '/'

  res.appendHeader('set-cookie', cookie.serialize(name, value, options))
}

export async function clearCookie(
  res: SetCookieResponse,
  name: string,
  options?: cookie.SerializeOptions
): Promise<void> {
  await setCookie(res, name, '', Object.assign({}, { expires: new Date(1), path: '/' }, options))
}
