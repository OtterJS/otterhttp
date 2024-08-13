/**
 * [RFC 9110, 13.1.3 If-Modified-Since]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-if-modified-since}
 *
 * @param currentLastModified
 * @param validatorLastModified
 */
export function hasBeenModifiedSince(
  currentLastModified: Date | string | undefined,
  validatorLastModified: Date | string
) {
  if (currentLastModified == null) return true

  const currentLastModifiedDate =
    currentLastModified instanceof Date ? currentLastModified.getTime() : Date.parse(currentLastModified)
  const verifierLastModifiedDate =
    validatorLastModified instanceof Date ? validatorLastModified.getTime() : Date.parse(validatorLastModified)

  if (Number.isNaN(currentLastModified)) return true
  if (Number.isNaN(validatorLastModified)) return true

  return currentLastModifiedDate > verifierLastModifiedDate
}
