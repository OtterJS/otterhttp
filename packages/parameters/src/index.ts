/**
 * RegExp for values that can be escaped to create a valid quoted-string
 *
 * ```
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * ```
 */
const TEXT_REGEXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/

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
 * RegExp to match qdtext chars in RFC 7231 sec 3.1.1.1
 *
 * ```
 * qdtext = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * ```
 */
const QUOTED_STRING_CONTENTS_REGEXP = /[\u0009\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]/

/**
 * RegExp to match chars that can be quoted-pair in RFC 7230 sec 3.2.6
 *
 * ```
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 * ```
 */
const CAN_QUOTE_REGEXP = /[\u0009\u0020-\u00ff]/

/**
 * RegExp to match characters that must be quoted to be valid quoted-string content.
 */
const MUST_QUOTE_REGEXP = /([\\"])/g

export function qstring(val: string) {
  // no need to quote tokens
  if (TOKEN_REGEXP.test(val)) return val

  if (val.length > 0 && !TEXT_REGEXP.test(val)) throw new TypeError('invalid parameter value')

  return `"${val.replace(MUST_QUOTE_REGEXP, '\\$1')}"`
}

export function formatParameters(parameters: Record<string, string>): string {
  return Object.entries(parameters)
    .sort()
    .map(([parameterName, parameterValue]) => `; ${parameterName}=${qstring(parameterValue)}`)
    .join('')
}

/**
 * Parser for parameters as defined in [RFC 9110]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-parameters}
 *
 * ```
 * parameters = *( OWS ";" OWS [ parameter ] )
 * parameter  = token "=" ( token / quoted-string )
 * ```
 */
export function parseParameters(value: string): Record<string, string> {
  let currentIndex = 0
  let validIfTerminate = false
  let semicolonIndex: number | undefined
  let parameterNameIndex: number | undefined
  let equalsIndex: number | undefined

  let quotedParameterValue: string[] | undefined
  let currentCharEscaped = false

  const parsedParameters: Record<string, string> = {}

  function reset() {
    semicolonIndex = undefined
    parameterNameIndex = undefined
    equalsIndex = undefined

    quotedParameterValue = undefined
    currentCharEscaped = false
  }

  function pop() {
    if (parameterNameIndex == null) return
    if (equalsIndex == null) throw new Error()

    const parameterName = value.slice(parameterNameIndex, equalsIndex).toLowerCase()
    const parameterValue =
      quotedParameterValue != null ? quotedParameterValue.join('') : value.slice(equalsIndex + 1, currentIndex)
    parsedParameters[parameterName] = parameterValue
  }

  for (; currentIndex < value.length; currentIndex++) {
    const currentChar = value.charAt(currentIndex)
    validIfTerminate = false

    // match whitespace until ";"
    if (semicolonIndex == null) {
      if (currentChar === ';') {
        semicolonIndex = currentIndex
        validIfTerminate = true
        continue
      }
      if (!WHITESPACE_CHAR_REGEXP.test(currentChar)) throw new TypeError('invalid parameter format')
      continue
    }

    // match whitespace until token (parameter name) or semicolon
    if (parameterNameIndex == null) {
      if (TOKEN_CHAR_REGEXP.test(currentChar)) {
        parameterNameIndex = currentIndex
        continue
      }
      if (currentChar === ';') {
        semicolonIndex = currentIndex
        validIfTerminate = true
        continue
      }
      if (!WHITESPACE_CHAR_REGEXP.test(currentChar)) throw new TypeError('invalid parameter format')
      validIfTerminate = true
      continue
    }

    // match token until "="
    if (equalsIndex == null) {
      if (currentChar === '=') {
        equalsIndex = currentIndex
        continue
      }
      if (!TOKEN_CHAR_REGEXP.test(currentChar)) throw new TypeError('invalid parameter format')
      continue
    }

    // initialize quotedParameterValue and consume the "\"" if the parameter value is quoted
    if (equalsIndex === currentIndex - 1 && currentChar === '"') {
      quotedParameterValue = []
      continue
    }

    // match token until whitespace or semicolon
    if (quotedParameterValue == null) {
      if (currentChar === ';') {
        pop()
        reset()
        semicolonIndex = currentIndex
        validIfTerminate = true
        continue
      }
      if (WHITESPACE_CHAR_REGEXP.test(currentChar)) {
        pop()
        reset()
        continue
      }
      if (!TOKEN_CHAR_REGEXP.test(currentChar)) throw new TypeError('invalid parameter format')
      validIfTerminate = true
      continue
    }

    // match quoted string contents until double quote
    if (currentCharEscaped) {
      if (!CAN_QUOTE_REGEXP.test(currentChar)) throw new TypeError('invalid parameter format')
      currentCharEscaped = false
      quotedParameterValue.push(currentChar)
      continue
    }
    if (currentChar === '"') {
      pop()
      reset()
      validIfTerminate = true
      continue
    }
    if (currentChar === '\\') {
      currentCharEscaped = true
      continue
    }
    if (!QUOTED_STRING_CONTENTS_REGEXP.test(currentChar)) throw new TypeError('invalid parameter format')
    quotedParameterValue.push(currentChar)
  }

  if (!validIfTerminate) throw new TypeError('invalid parameter format')

  pop()
  return parsedParameters
}
