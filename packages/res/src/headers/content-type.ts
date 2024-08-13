import mime from 'mime'

import type { HasOutgoingHeaders } from '../types'
import { setResponseHeader } from './set-header'

export function setResponseContentTypeHeader(res: HasOutgoingHeaders, type: string): void {
  const validatedType = type.indexOf('/') === -1 ? mime.getType(type) : type
  if (validatedType == null) return
  setResponseHeader(res, 'content-type', validatedType)
}
