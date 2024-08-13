import * as cookie from '@otterhttp/cookie'

import type { HasIncomingHeaders, HasOutgoingHeaders, HasReq } from './types'

type SetCookieResponse = HasOutgoingHeaders & HasReq<HasIncomingHeaders>
export type SetCookieOptions = cookie.SerializeOptions & {
  encode?: (value: string) => string
}
export async function setCookie(
  res: SetCookieResponse,
  name,
  value: string | Record<string, unknown>,
  { encode, ...options }: SetCookieOptions = {}
): Promise<void> {
  let val = typeof value === 'object' ? `j:${JSON.stringify(value)}` : String(value)

  if (encode != null) val = encode(val)

  if (options.maxAge != null) {
    options.expires = new Date(Date.now() + options.maxAge)
    options.maxAge /= 1000
  }

  if (options.path == null) options.path = '/'

  res.appendHeader('set-cookie', `${cookie.serialize(name, String(val), options)}`)
}

export async function clearCookie(
  res: SetCookieResponse,
  name: string,
  options?: cookie.SerializeOptions
): Promise<void> {
  await setCookie(res, name, '', Object.assign({}, { expires: new Date(1), path: '/' }, options))
}
