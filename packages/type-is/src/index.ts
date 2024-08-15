import { type TypeParseable, format as formatType, parse as parseType } from '@otterhttp/content-type'
import mime from 'mime'

function normalizeType(value: TypeParseable) {
  // parse the type
  const type = parseType(value)
  type.parameters = {}
  // reformat it
  return formatType(type)
}

function tryNormalizeType(value: TypeParseable | undefined) {
  if (!value) return null

  try {
    return normalizeType(value)
  } catch (err) {
    return null
  }
}

function mimeMatch(expected: string | null, actual: string | null): boolean {
  // invalid type
  if (expected == null) return false
  if (actual == null) return false

  // split types
  const actualParts = actual.split('/')
  const expectedParts = expected.split('/')

  // invalid format
  if (actualParts.length !== 2 || expectedParts.length !== 2) return false

  // validate type
  if (expectedParts[0] !== '*' && expectedParts[0] !== actualParts[0]) return false

  // validate suffix wildcard
  if (expectedParts[1].slice(0, 2) === '*+')
    return (
      expectedParts[1].length <= actualParts[1].length + 1 &&
      expectedParts[1].slice(1) === actualParts[1].slice(1 - expectedParts[1].length)
    )

  // validate subtype
  if (expectedParts[1] !== '*' && expectedParts[1] !== actualParts[1]) return false

  return true
}

function normalize(type: string): string | null {
  // invalid type
  if (typeof type !== 'string') return null

  switch (type) {
    case 'urlencoded':
      return 'application/x-www-form-urlencoded'
    case 'multipart':
      return 'multipart/*'
  }
  // "+json" -> "*/*+json" expando
  if (type[0] === '+') return `*/*${type}`

  return type.indexOf('/') === -1 ? mime.getType(type) : type
}

/**
 * Compare a `value` content-type with `types`.
 * Each `type` can be an extension like `html`,
 * a special shortcut like `multipart` or `urlencoded`,
 * or a mime type.
 */
export function typeIs(value: TypeParseable | undefined, types?: readonly string[]) {
  let i: number
  // remove parameters and normalize
  const val = tryNormalizeType(value)

  // no type or invalid
  if (!val) return false

  // no types, return the content type
  if (!types || !types.length) return val

  let type: string
  for (i = 0; i < types.length; i++) {
    if (mimeMatch(normalize((type = types[i])), val)) {
      return type[0] === '+' || type.indexOf('*') !== -1 ? val : type
    }
  }

  // no matches
  return false
}
