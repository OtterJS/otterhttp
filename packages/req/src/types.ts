import type { IncomingHttpHeaders } from 'node:http'
import type { Socket } from 'node:net'

export type HasHeaders = { headers: IncomingHttpHeaders }
export type HasSocket = { socket: Socket }
