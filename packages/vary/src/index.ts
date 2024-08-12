import type { OutgoingMessage } from 'node:http'

type HasHeaders = Pick<
  OutgoingMessage,
  'getHeader' | 'getHeaders' | 'setHeader' | 'appendHeader' | 'getHeaderNames' | 'hasHeader' | 'removeHeader'
>

/**
 * RegExp to match field-name in RFC 7230 sec 3.2
 *
 * field-name    = token
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 */
const FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

function getVaryHeader(res: HasHeaders): string[] {
  const vary = res.getHeader('vary')
  if (Array.isArray(vary)) return vary
  if (typeof vary === 'string') return parse(vary.toLowerCase())
  return []
}

function parse(header: string) {
  let end = 0
  const list: string[] = []
  let start = 0

  // gather tokens
  for (let i = 0, len = header.length; i < len; i++) {
    switch (header.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i + 1
        }
        break
      case 0x2c /* , */:
        list.push(header.substring(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(header.substring(start, end))

  return list
}

/**
 * Mark that a request is varied on a header field.
 */
export function vary(res: HasHeaders, field: string | string[]) {
  // get existing header
  const val = getVaryHeader(res)
  const alreadySetHeaderNameLookup = new Set<string>(val)

  // get fields array
  const fields = Array.isArray(field) ? field : parse(field)

  // ensure field names are valid
  for (const field of fields) {
    if (!FIELD_NAME_REGEXP.test(field)) throw new TypeError('field argument contains an invalid header name')
  }

  if (alreadySetHeaderNameLookup.has('*')) {
    if (val.length > 1) res.setHeader('vary', ['*'])
    return
  }

  const unsetHeaderNamesToSet: string[] = []
  for (const headerName of fields) {
    if (headerName === '*') {
      res.setHeader('vary', ['*'])
      return
    }

    const lowerCaseHeaderName = headerName.toLowerCase()
    if (alreadySetHeaderNameLookup.has(lowerCaseHeaderName)) continue
    unsetHeaderNamesToSet.push(headerName)
    alreadySetHeaderNameLookup.add(lowerCaseHeaderName)
  }

  res.appendHeader('vary', unsetHeaderNamesToSet)
}
