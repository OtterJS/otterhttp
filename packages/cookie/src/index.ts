const pairSplitRegExp = /; */

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/

function tryDecode(str: string, decode: (str: string) => string) {
  try {
    return decode(str)
  } catch (e) {
    return str
  }
}

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 */
export function parse(
  str: string,
  options: {
    decode?: ((str: string) => string) | undefined
  } = {},
): Record<string, string> {
  options.decode ??= decodeURIComponent

  const obj: Record<string, string> = {}
  const pairs = str.split(pairSplitRegExp)

  for (const pair of pairs) {
    let eqIdx = pair.indexOf("=")

    // skip things that don't look like key=value
    if (eqIdx < 0) continue

    const key = pair.slice(0, eqIdx).trim()
    let val = pair.slice(++eqIdx, pair.length).trim()

    // quoted values
    if ('"' === val[0]) val = val.slice(1, -1)

    // only assign once
    if (obj[key] == null) obj[key] = tryDecode(val, options.decode)
  }

  return obj
}

export type SerializeOptions = {
  encode?: ((str: string) => string) | null | undefined
  maxAge?: number | null | undefined
  domain?: string | null | undefined
  path?: string | null | undefined
  httpOnly?: boolean | null | undefined
  secure?: boolean | null | undefined
  sameSite?: boolean | "Strict" | "strict" | "Lax" | "lax" | "None" | "none" | string | null | undefined
  expires?: Date | null | undefined
}

export function serialize(name: string, val: string, options: SerializeOptions = {}): string {
  options.encode ??= encodeURIComponent

  if (!fieldContentRegExp.test(name)) throw new TypeError("argument name is invalid")

  const value = options.encode(val)

  if (value && !fieldContentRegExp.test(value)) throw new TypeError("argument val is invalid")

  let str = `${name}=${value}`

  if (null != options.maxAge) {
    const maxAge = options.maxAge - 0

    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) throw new TypeError("option maxAge is invalid")

    str += `; Max-Age=${Math.floor(maxAge)}`
  }

  if (options.domain) {
    if (!fieldContentRegExp.test(options.domain)) throw new TypeError("option domain is invalid")

    str += `; Domain=${options.domain}`
  }

  if (options.path) {
    if (!fieldContentRegExp.test(options.path)) throw new TypeError("option path is invalid")

    str += `; Path=${options.path}`
  }

  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`

  if (options.httpOnly) str += "; HttpOnly"

  if (options.secure) str += "; Secure"

  if (options.sameSite) {
    const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite

    switch (sameSite) {
      case true:
      case "strict":
        str += "; SameSite=Strict"
        break
      case "lax":
        str += "; SameSite=Lax"
        break
      case "none":
        str += "; SameSite=None"
        break
      default:
        throw new TypeError("option sameSite is invalid")
    }
  }

  return str
}
