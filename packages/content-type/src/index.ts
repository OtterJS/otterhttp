import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http'
import { formatParameters, parseParameters, validateParameterNames } from '@otterhttp/parameters'

type Request = { headers: IncomingHttpHeaders }
type Response = { getHeader: <HeaderName extends string>(name: HeaderName) => OutgoingHttpHeaders[HeaderName] }
export type TypeParseableObject = Request | Response
export type TypeParseable = string | TypeParseableObject

/**
 * RegExp to a single whitespace character
 *
 * ```
 * WS = SP / HTAB
 * ```
 */
const WHITESPACE_CHAR_REGEXP = /[\u0009\u0020]/

/**
 * RegExp to match a single token character
 *
 * ```
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * ```
 */
const TOKEN_CHAR_REGEXP = /[!#$%&'*+.^_`|~0-9A-Za-z-]/

/**
 * RegExp to match values entirely consisting of token characters.
 *
 * ```
 * token = 1*tchar
 * ```
 */
const TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/**
 * RegExp to match type in RFC 7231 sec 3.1.1.1
 *
 * ```
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 * ```
 */
const TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

function getContentType(obj: TypeParseableObject) {
  let header: number | string | string[] | undefined

  if ('getHeader' in obj && typeof obj.getHeader === 'function') {
    // res-like
    header = obj.getHeader('content-type')
  } else if ('headers' in obj && typeof obj.headers === 'object') {
    // req-like
    header = obj.headers['content-type']
  }

  if (typeof header !== 'string') {
    throw new TypeError('content-type header is missing from object')
  }

  return header
}

/**
 * Representation of a parsed MIME type.
 */
export class ContentType {
  /**
   * The top-level media type into which the data type falls, such as `video` or `text`.
   * e.g. in `application/json`, the type is `application`.
   */
  readonly type: string

  /**
   * The whole subtype, such as `manifest+json` or `plain`.
   * e.g. in `text/conf+plain`, the subtype is `conf+plain`.
   */
  readonly subtype: string

  /**
   * The subtype suffix, such as `json` or `plain`.
   * e.g. in `text/conf+plain`, the subtype suffix is `plain`.
   */
  readonly subtypeSuffix: string

  /**
   * Optional parameters added to provide additional details.
   * For example, the `charset` parameter is often provided in HTTP contexts, e.g.
   * `Content-Type: application/json; charset=utf-8`
   */
  parameters: Record<string, string>

  static parse(contentType: string): ContentType {
    return parse(contentType)
  }

  /**
   * @internal
   */
  static fromValidatedInput(type: string, subtype: string, subtypeSuffix: string) {
    return new ContentType(type, subtype, subtypeSuffix)
  }

  protected constructor(type: string, subtype: string, subtypeSuffix: string) {
    this.parameters = {}
    this.type = type
    this.subtype = subtype
    this.subtypeSuffix = subtypeSuffix
  }

  toString() {
    return `${this.type}/${this.subtype}${formatParameters(this.parameters)}`
  }

  hasWildcard() {
    return this.type.indexOf('*') !== -1 || this.subtype.indexOf('*') !== -1
  }

  isPlainText() {
    return isPlainText(this)
  }

  /**
   * The whole media type excluding parameters, such as `application/json` or `text/plain`.
   */
  get mediaType() {
    return `${this.type}/${this.subtype}`
  }
}

/**
 * Format object to media type.
 */
export function format(obj: { type: string; subtype: string; parameters?: Record<string, string> }) {
  if (!obj || typeof obj !== 'object') throw new TypeError('argument obj is required')

  const { parameters, type, subtype } = obj

  if (!type || !subtype) throw new TypeError('invalid type')

  let string = `${type}/${subtype}`
  if (!TYPE_REGEXP.test(string)) throw new TypeError('invalid type')

  // append parameters
  if (parameters && typeof parameters === 'object') {
    validateParameterNames(Object.keys(parameters))
    string += formatParameters(parameters)
  }

  return string
}

/**
 * Parse media type to object.
 */
export function parse(value: TypeParseable): ContentType {
  if (!value) throw new TypeError('argument `value` is required')

  // support req/res-like objects as argument
  let header = typeof value === 'object' ? getContentType(value) : value

  if (typeof header !== 'string') throw new TypeError('argument `value` must be string, request-like or response-like')
  header = header.trim()

  let currentIndex = 0
  let slashIndex: number | undefined
  for (; currentIndex < header.length; ++currentIndex) {
    const currentChar = header.charAt(currentIndex)
    if (currentChar === '/') {
      slashIndex = currentIndex
      break
    }
    if (!TOKEN_CHAR_REGEXP.test(currentChar)) throw new TypeError('invalid media type')
  }

  if (typeof slashIndex === 'undefined') throw new TypeError('invalid media type')
  if (slashIndex === 0) throw new TypeError('invalid media type')

  currentIndex += 1
  let plusIndex: number | undefined
  let endIndex: number | undefined
  for (; currentIndex < header.length; ++currentIndex) {
    const currentChar = header.charAt(currentIndex)
    if (currentChar === ';' || WHITESPACE_CHAR_REGEXP.test(currentChar)) {
      if (currentIndex === slashIndex + 1) throw new TypeError('invalid media type')
      endIndex = currentIndex
      break
    }
    if (currentChar === '+') {
      if (currentIndex === slashIndex + 1) throw new TypeError('invalid media type')
      plusIndex = currentIndex
      continue
    }
    if (!TOKEN_CHAR_REGEXP.test(currentChar)) throw new TypeError('invalid media type')
  }

  const lowercaseHeader = header.toLowerCase()
  const type = lowercaseHeader.slice(0, slashIndex)
  const subtype = lowercaseHeader.slice(slashIndex + 1, endIndex)
  const subtypeSuffix = plusIndex == null ? subtype : lowercaseHeader.slice(plusIndex + 1, endIndex)

  const parsedRepresentation = ContentType.fromValidatedInput(type, subtype, subtypeSuffix)
  if (endIndex === undefined) return parsedRepresentation

  parsedRepresentation.parameters = parseParameters(header.slice(endIndex))
  return parsedRepresentation
}

/**
 * `application` MIME subtypes that are plaintext
 */
const applicationPlaintextWhitelist = new Set<string>([
  'ecmascript',
  'javascript',
  'json',
  'xml',
  'x-httpd-php',
  'x-sh',
  'node'
])

export function isPlainText({ type, subtypeSuffix }: ContentType) {
  if (type === 'text') return true
  if (type !== 'application') return false
  return applicationPlaintextWhitelist.has(subtypeSuffix)
}
