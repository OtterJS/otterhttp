import { ContentType, type TypeParseable, parse as parseType } from '@otterhttp/content-type'
import mime from 'mime'

function tryParseType(value: TypeParseable | undefined) {
  if (!value) return null

  try {
    return parseType(value)
  } catch (err) {
    return null
  }
}

function mimeMatch(actual: ContentType | null, expected: ContentType): boolean {
  // invalid types
  if (actual == null) return false
  if (expected == null) return false

  // ensure top-level type matches
  if (expected.type !== '*' && expected.type !== actual.type) return false

  // check for suffix wildcards & match
  if (expected.subtype.startsWith('*+')) return actual.subtypeSuffix === expected.subtypeSuffix

  // validate subtype
  if (expected.subtype !== '*' && expected.subtype !== actual.subtype) return false

  return true
}

function normalize(type: string): ContentType | null {
  // invalid type
  if (typeof type !== 'string') return null

  switch (type) {
    case 'urlencoded':
      return ContentType.parse('application/x-www-form-urlencoded')
    case 'multipart':
      return ContentType.parse('multipart/*')
  }
  // "+json" -> "*/*+json" expando
  if (type[0] === '+') return ContentType.parse(`*/*${type}`)

  if (type.indexOf('/') !== -1) return ContentType.parse(type)
  const inferredType = mime.getType(type)
  if (inferredType == null) return null
  return ContentType.parse(inferredType)
}

/**
 * Compare a `value` content-type with `types`.
 * Each `type` can be an extension like `html`,
 * a special shortcut like `multipart` or `urlencoded`,
 * or a mime type.
 */
export function typeIs(
  value: TypeParseable | undefined,
  types?: readonly (string | ContentType)[]
): ContentType | false {
  let i: number
  // remove parameters and normalize
  const parsedValue = tryParseType(value)

  // no type or invalid
  if (!parsedValue) return false

  // no types, return the content type
  if (!types || !types.length) return parsedValue

  let type: ContentType | string
  let normalizedType: ContentType | null = null
  for (i = 0; i < types.length; i++) {
    type = types[i]
    normalizedType = typeof type === 'string' ? normalize(type) : type
    if (normalizedType == null) continue
    if (!mimeMatch(parsedValue, normalizedType)) continue
    if (type[0] === '+') return parsedValue
    if (normalizedType.hasWildcard()) return parsedValue
    return normalizedType
  }

  // no matches
  return false
}

export type { ContentType }
