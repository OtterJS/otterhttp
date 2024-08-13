import { basename, extname, resolve } from 'node:path'
import { contentDisposition } from '@otterhttp/content-disposition'
import { sendFile } from '@otterhttp/send'
import type { SendFileOptions } from '@otterhttp/send'

import { setResponseContentTypeHeader } from './headers'
import type { HasIncomingHeaders, HasOutgoingHeaders, HasReq, HasStatus, HasWriteMethods } from './types'

export type DownloadOptions = SendFileOptions &
  Partial<{
    headers: Record<string, string>
  }>

type DownloadResponse = HasOutgoingHeaders &
  HasReq<HasIncomingHeaders> &
  HasStatus &
  HasWriteMethods &
  NodeJS.WritableStream
export async function download(
  res: DownloadResponse,
  path: string,
  filename?: string,
  options?: DownloadOptions
): Promise<void> {
  // set Content-Disposition when file is sent
  const headers = {
    'Content-Disposition': contentDisposition(filename || basename(path))
  }

  // merge user-provided headers
  if (options?.headers) {
    for (const key of Object.keys(options.headers)) {
      if (key.toLowerCase() !== 'content-disposition') headers[key] = options.headers[key]
    }
  }

  // merge user-provided options
  options = { ...options, headers }

  // send file
  await sendFile(res, options.root ? path : resolve(path), options)
}

export function attachment(res: HasOutgoingHeaders, filename?: string) {
  if (filename) {
    setResponseContentTypeHeader(res, extname(filename))
    filename = basename(filename)
  }

  res.setHeader('Content-Disposition', contentDisposition(filename))
}
