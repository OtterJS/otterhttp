const NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g

const HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g

const EXT_VALUE_REGEXP =
  /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/

const ENCODE_URL_ATTR_CHAR_REGEXP = /[\x00-\x20"'()*,/:;<=>?@[\\\]{}\x7f]/g

export function getLatin1Fallback(val: unknown) {
  // simple Unicode -> ISO-8859-1 transformation
  return String(val).replace(NON_LATIN1_REGEXP, "?")
}

function percentDecode(_str: string, hex: string) {
  return String.fromCharCode(Number.parseInt(hex, 16))
}

function percentEncode(char: string) {
  return `%${String(char).charCodeAt(0).toString(16).toUpperCase()}`
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc8187
 */
export function encodeUtf8ExtendedFieldValue(val: unknown): string {
  const str = String(val)

  // percent encode as UTF-8
  ENCODE_URL_ATTR_CHAR_REGEXP.lastIndex = 0
  const encoded = encodeURIComponent(str).replace(ENCODE_URL_ATTR_CHAR_REGEXP, percentEncode)

  return `utf-8''${encoded}`
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc8187
 */
export function decodeExtendedFieldValue(str: string) {
  const match = EXT_VALUE_REGEXP.exec(str)
  if (!match) throw new TypeError("invalid extended field value")

  const charset = match[1].toLowerCase()
  const encoded = match[2]
  let value: string
  switch (charset) {
    case "iso-8859-1":
      HEX_ESCAPE_REPLACE_REGEXP.lastIndex = 0
      value = getLatin1Fallback(encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, percentDecode))
      break
    case "utf-8":
      try {
        value = decodeURIComponent(encoded)
      } catch {
        throw new TypeError("invalid encoded utf-8")
      }
      break
    default:
      throw new TypeError("unsupported charset in extended field")
  }

  return value
}
