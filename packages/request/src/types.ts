import type { IncomingHttpHeaders } from 'node:http'
import type { Socket } from 'node:net'

export type HasHeaders = { headers: IncomingHttpHeaders }
export type HasSocket = { socket: Socket }

// https://stackoverflow.com/a/76616671
type Omit<T, K extends PropertyKey> = { [P in keyof T as Exclude<P, K>]: T[P] }

type ExtraHeaders = {
  referrer?: string | undefined
  'if-range'?: string | undefined
}

export type Headers = Omit<IncomingHttpHeaders, keyof ExtraHeaders> & ExtraHeaders
