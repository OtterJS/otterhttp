import type { IncomingHttpHeaders } from "node:http"
import type { Socket } from "node:net"

import type { IPv4, IPv6 } from "@otterhttp/proxy-address"

export type HasIpAddresses = { ips: readonly (IPv4 | IPv6 | undefined)[] }
export type HasHeaders = { headers: IncomingHttpHeaders }
export type HasSocket = { socket: Socket }

// https://stackoverflow.com/a/76616671
type Omit<T, K extends PropertyKey> = { [P in keyof T as Exclude<P, K>]: T[P] }

type ExtraHeaders = {
  referrer?: string | undefined
  "if-range"?: string | undefined
}

export type Headers = Omit<IncomingHttpHeaders, keyof ExtraHeaders> & ExtraHeaders

export type CookieParsingSettings = {
  /**
   * Transform function used to decode all cookies from ASCII.
   * @default {@link decodeURIComponent}
   */
  cookieDecoder?: (cookie: string) => string
} & (
  | {
      /**
       * Predicate used to determine whether a cookie is signed.
       * @see cookieUnsigner
       */
      signedCookieMatcher: (cookie: string) => boolean

      /**
       * Transform function used to unsign signed cookies.
       * @see signedCookieMatcher
       */
      cookieUnsigner: (signedCookie: string) => string
    }
  | {
      /**
       * Predicate used to determine whether a cookie is 'encoded'.
       * @see cookieUnsigner
       */
      encodedCookieMatcher?: undefined

      /**
       * Transform function used to decode encoded cookies.
       * @see encodedCookieMatcher
       */
      cookieUnsigner?: undefined
    }
)

export type RequestAppSettings = {
  cookieParsing?: CookieParsingSettings
}
