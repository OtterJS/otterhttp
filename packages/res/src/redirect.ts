import { STATUS_CODES } from 'node:http'
import { escapeHTML } from 'es-escape-html'

import { formatResponse } from './format.js'
import { getResponseHeader, setResponseLocationHeader } from './headers'
import type { HasAccepts, HasMethod, HasOutgoingHeaders, HasReq, HasStatus } from './types'

type next = (err?: any) => void

type RedirectResponse = HasOutgoingHeaders & HasStatus & HasReq<HasAccepts & HasMethod> & NodeJS.WritableStream
export async function redirect(res: RedirectResponse, url: string, status?: number) {
  let address: string | undefined = url
  status = status || 302

  let body = ''

  setResponseLocationHeader(res, address)
  address = getResponseHeader(res, 'location')
  if (!address) throw new Error()

  await formatResponse(res, {
    text: () => {
      body = `${STATUS_CODES[status]}. Redirecting to ${address}`
    },
    html: () => {
      const u = escapeHTML(address)

      body = `<p>${STATUS_CODES[status]}. Redirecting to <a href="${u}">${u}</a></p>`
    },
    default: () => {
      body = ''
    }
  })

  res.setHeader('Content-Length', Buffer.byteLength(body))

  res.statusCode = status

  if (res.req.method === 'HEAD') res.end()
  else res.end(body)

  return res
}
