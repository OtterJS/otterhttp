import { weakCompareETags } from "./compare-etag"

/**
 * [RFC 9110, 13.1.2 If-None-Match]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-if-none-match}
 *
 * @param currentETag
 * @param validatorETags
 */
export function noneMatch(currentETag: string | undefined, validatorETags: string) {
  if (currentETag == null) return true
  if (currentETag.trim() === "") return true
  if (validatorETags === "*") return false

  let start = 0
  let end = 0

  for (let i = 0, len = validatorETags.length; i < len; i++) {
    switch (validatorETags.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) start = end = i + 1
        break
      case 0x2c /* , */:
        if (weakCompareETags(currentETag, validatorETags.substring(start, end))) return false
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  return !weakCompareETags(currentETag, validatorETags.substring(start, end))
}
