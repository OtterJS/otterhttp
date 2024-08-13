import { send } from './send'
import type {
  HasIncomingHeaders,
  HasMethod,
  HasOutgoingHeaders,
  HasReq,
  HasStatus,
  HasWriteMethods,
  JSONLiteral
} from './types'
import { isJSONLiteral, isString } from './utils'

type JsonResponse = HasOutgoingHeaders &
  HasReq<HasIncomingHeaders & HasMethod> &
  HasStatus &
  HasWriteMethods &
  NodeJS.WritableStream

/**
 * Respond with stringified JSON object
 * @param res Response
 * @param body
 */
export const json = (res: JsonResponse, body: JSONLiteral): void => {
  res.setHeader('Content-Type', 'application/json')

  if (isString(body)) {
    return send(res, body)
  }

  if (body == null) {
    return send(res, '')
  }

  if (isJSONLiteral(body)) {
    return send(res, JSON.stringify(body, null, 2))
  }

  return
}
