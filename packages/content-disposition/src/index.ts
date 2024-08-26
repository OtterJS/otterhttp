import {
  decodeExtendedFieldValue,
  formatParameters,
  parseParameters,
  validateParameterNames,
} from "@otterhttp/parameters"

const NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g

const TEXT_REGEXP = /^[\x20-\x7e\x80-\xff]+$/
const TOKEN_REGEXP = /^[!#$%&'*+.0-9A-Z^_`a-z|~-]+$/

const DISPOSITION_TYPE_REGEXP = /^([!#$%&'*+.0-9A-Z^_`a-z|~-]+)(?:$|[\x09\x20]*;)/

export class ContentDisposition {
  type: string
  parameters: Record<string, string>
  constructor(type: string, parameters: Record<string, string>) {
    this.type = type
    this.parameters = parameters
  }
}

const basename = (str: string) => str.slice(str.lastIndexOf("/") + 1)

/**
 * Format Content-Disposition header string.
 */
export function format({
  parameters,
  type,
}: {
  parameters?: Record<string, string>
  type: string | boolean | undefined
}) {
  if (type == null || typeof type !== "string" || !TOKEN_REGEXP.test(type)) {
    throw new TypeError("invalid type")
  }
  // start with normalized type
  let string = String(type).toLowerCase()
  // append parameters
  if (parameters && typeof parameters === "object") {
    validateParameterNames(Object.keys(parameters))
    string += formatParameters(parameters)
  }

  return string
}

function createParams(filename?: string, fallback?: string): Record<string, string> {
  if (filename == null) return {}

  if (typeof fallback === "string" && NON_LATIN1_REGEXP.test(fallback)) {
    throw new TypeError("fallback must be ISO-8859-1 string")
  }

  // restrict to file base name
  const name = basename(filename)

  // determine if name is suitable for quoted string / token
  const canUseAsciiEncoding = TEXT_REGEXP.test(name)
  if (canUseAsciiEncoding && fallback == null) {
    return {
      filename: name,
    }
  }

  if (fallback == null) {
    return {
      "filename*": name,
    }
  }

  return {
    "filename*": name,
    filename: basename(fallback),
  }
}

/**
 * Create an attachment Content-Disposition header.
 *
 * @param filename file name
 * @param options
 */

export function contentDisposition(
  filename?: string,
  options?: {
    type?: string
    fallback?: string
  },
): string {
  // format into string
  return format(new ContentDisposition(options?.type ?? "attachment", createParams(filename, options?.fallback)))
}

/**
 * Parse Content-Disposition header string.
 * @param header string
 */
export function parse(header: string): ContentDisposition {
  const match = DISPOSITION_TYPE_REGEXP.exec(header)

  if (!match) throw new TypeError("invalid type format")

  // normalize type
  const index = match[0].length
  const type = match[1].toLowerCase()

  // calculate index to start at
  if (!match[0].endsWith(";")) return new ContentDisposition(type, {})

  const parameters = parseParameters(header.slice(index - 1))
  for (const [parameterName, parameterValue] of Object.entries(parameters)) {
    if (!parameterName.endsWith("*")) continue
    parameters[parameterName] = decodeExtendedFieldValue(parameterValue)
  }

  return new ContentDisposition(type, parameters)
}
