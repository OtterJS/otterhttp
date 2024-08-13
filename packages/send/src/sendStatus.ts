import { STATUS_CODES } from 'node:http'

import { send } from './send'
import type { HasIncomingHeaders, HasMethod, HasOutgoingHeaders, HasReq, HasStatus, HasWriteMethods } from './types'

type SendStatusResponse = HasOutgoingHeaders &
  HasReq<HasIncomingHeaders & HasMethod> &
  HasStatus &
  HasWriteMethods &
  NodeJS.WritableStream

/**
 * Sets the response HTTP status code to statusCode and send its string representation as the response body.
 *
 * If an unsupported status code is specified, the HTTP status is still set to statusCode and the string version of the code is sent as the response body.
 *
 * @param res Response
 * @param statusCode
 */
export function sendStatus(res: SendStatusResponse, statusCode: number): void {
  const body = STATUS_CODES[statusCode] ?? String(statusCode)

  res.statusCode = statusCode

  res.setHeader('Content-Type', 'text/plain')

  send(res, body)
}
