import type { IncomingMessage as I, IncomingHttpHeaders } from 'node:http'
import mime from 'mime'
import Negotiator from 'negotiator'

const extToMime = (type: string) => (type.indexOf('/') === -1 ? mime.getType(type) : type)

const validMime = (type: unknown): type is string => typeof type === 'string'

interface IAccepts {
  types(...types: string[]): string | false
  types(types: string[]): string | false
  types(types?: undefined): string[]

  type(...types: string[]): string | false
  type(types: string[]): string | false
  type(types?: undefined): string[]

  encodings(...encodings: string[]): string | false
  encodings(encodings: string[]): string | false
  encodings(encodings?: undefined): string[]

  encoding(...encodings: string[]): string | false
  encoding(encodings: string[]): string | false
  encoding(encodings?: undefined): string[]

  charsets(...charsets: string[]): string | false
  charsets(charsets: string[]): string | false
  charsets(charsets?: undefined): string[]

  charset(...charsets: string[]): string | false
  charset(charsets: string[]): string | false
  charset(charsets?: undefined): string[]

  languages(...languages: string[]): string | false
  languages(languages: string[]): string | false
  languages(languages?: undefined): string[]

  language(...languages: string[]): string | false
  language(languages: string[]): string | false
  language(languages?: undefined): string[]

  lang(...languages: string[]): string | false
  lang(languages: string[]): string | false
  lang(languages?: undefined): string[]

  langs(...languages: string[]): string | false
  langs(languages: string[]): string | false
  langs(languages?: undefined): string[]
}

export class Accepts implements IAccepts {
  headers: IncomingHttpHeaders
  negotiator: Negotiator
  constructor(req: Pick<I, 'headers'>) {
    this.headers = req.headers
    this.negotiator = new Negotiator(req)
  }

  /**
   * Check if the given `types` are acceptable. The best match is returned when at least one
   * type is acceptable, otherwise `false` is returned, in which case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single mime type string such as "application/json",
   * the extension name such as "json" or an array `["json", "html", "text/plain"]`.
   *
   * When a list or array is given, the best match, if any, is returned.
   *
   * When no types are given as arguments, returns all types accepted by the client ordered by preference.
   */
  types(...types: string[]): string | false
  types(types: string[]): string | false
  types(types?: undefined): string[]
  types(firstMimeType?: string | string[] | undefined, ...mimeTypes: string[]): string[] | string | false {
    // if no types are provided,
    if (firstMimeType == null) {
      return this.negotiator.mediaTypes()
    }

    if (Array.isArray(firstMimeType)) {
      mimeTypes.unshift(...firstMimeType)
    } else {
      mimeTypes.unshift(firstMimeType)
    }

    // no accept header, return first given type
    if (!this.headers.accept) {
      return mimeTypes[0]
    }

    const mimes = mimeTypes.map(extToMime)
    const accepts = this.negotiator.mediaTypes(mimes.filter(validMime))
    const first: string | undefined = accepts[0]

    return first ? mimeTypes[mimes.indexOf(first)] : false
  }

  get type() {
    return this.types
  }

  /**
   * Return accepted encodings or best fit based on `encodings`.
   *
   * Given `Accept-Encoding: gzip, deflate`
   * an array sorted by quality is returned:
   *
   *     ['gzip', 'deflate']
   */
  encodings(...encodings: string[]): string | false
  encodings(encodings: string[]): string | false
  encodings(encodings?: undefined): string[]
  encodings(firstEncodings: string | string[] | undefined, ...encodings: string[]): string | string[] | boolean {
    // no encodings, return all requested encodings
    if (firstEncodings == null) {
      return this.negotiator.encodings()
    }

    if (Array.isArray(firstEncodings)) {
      encodings.unshift(...firstEncodings)
    } else {
      encodings.unshift(firstEncodings)
    }

    return this.negotiator.encodings(encodings)[0] || false
  }

  get encoding() {
    return this.encodings
  }

  /**
   * Return accepted charsets or best fit based on `charsets`.
   *
   * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
   * an array sorted by quality is returned:
   *
   *     ['utf-8', 'utf-7', 'iso-8859-1']
   */
  charsets(...charsets: string[]): string | false
  charsets(charsets: string[]): string | false
  charsets(charsets?: undefined): string[]
  charsets(firstCharsets?: string | string[] | undefined, ...charsets: string[]): string | string[] | boolean {
    // no charsets, return all requested charsets
    if (firstCharsets == null) {
      return this.negotiator.charsets()
    }

    if (Array.isArray(firstCharsets)) {
      charsets.unshift(...firstCharsets)
    } else {
      charsets.unshift(firstCharsets)
    }

    return this.negotiator.charsets(charsets)[0] || false
  }

  get charset() {
    return this.charsets
  }

  /**
   * Return accepted languages or best fit based on `langs`.
   *
   * Given `Accept-Language: en;q=0.8, es, pt`
   * an array sorted by quality is returned:
   *
   *     ['es', 'pt', 'en']
   *
   */
  languages(...languages: string[]): string | false
  languages(languages: string[]): string | false
  languages(languages?: undefined): string[]
  languages(firstLanguages?: string | string[] | undefined, ...languages: string[]): string | string[] | false {
    // no languages, return all requested languages
    if (firstLanguages == null) {
      return this.negotiator.languages()
    }

    if (Array.isArray(firstLanguages)) {
      languages.unshift(...firstLanguages)
    } else {
      languages.unshift(firstLanguages)
    }

    return this.negotiator.languages(languages)[0] || false
  }

  get language() {
    return this.languages
  }
  get langs() {
    return this.languages
  }
  get lang() {
    return this.languages
  }
}
