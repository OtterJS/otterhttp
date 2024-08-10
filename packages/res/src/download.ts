import type { IncomingMessage as Req, ServerResponse as Res } from 'node:http'
import { basename, extname, resolve } from 'node:path'
import { contentDisposition } from '@otterhttp/content-disposition'
import { sendFile } from '@otterhttp/send'
import type { SendFileOptions } from '@otterhttp/send'
import { setContentType, setHeader } from './headers.js'

export type DownloadOptions = SendFileOptions &
  Partial<{
    headers: Record<string, string>
  }>

export type Download<Response> = (path: string, filename?: string, options?: DownloadOptions) => Promise<Response>

export const download = <Request extends Req = Req, Response extends Res = Res>(
  req: Request,
  res: Response
): Download<Response> => {
  return async (path: string, filename?: string, options?: DownloadOptions): Promise<Response> => {
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
    return await sendFile(req, res)(options.root ? path : resolve(path), options)
  }
}

export const attachment = <Response extends Res>(res: Response) => {
  return (filename?: string): Response => {
    if (filename) {
      setContentType(res)(extname(filename))
      filename = basename(filename)
    }

    setHeader(res)('Content-Disposition', contentDisposition(filename))

    return res
  }
}
