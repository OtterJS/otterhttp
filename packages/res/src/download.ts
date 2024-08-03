import type { IncomingMessage as Req, ServerResponse as Res } from 'node:http'
import { basename, extname, resolve } from 'node:path'
import { contentDisposition } from '@tinyhttp/content-disposition'
import { sendFile } from '@tinyhttp/send'
import type { SendFileOptions } from '@tinyhttp/send'
import { setContentType, setHeader } from './headers.js'

export type DownloadOptions = SendFileOptions &
  Partial<{
    headers: Record<string, string>
  }>

type Callback = (err?: any) => void

type Download<Response> = {
  (path: string, cb?: Callback): Response
  (path: string, filename: string, cb?: Callback): Response
  (path: string, filename: string, options: DownloadOptions, cb?: Callback): Response
}

export const download = <Request extends Req = Req, Response extends Res = Res>(
  req: Request,
  res: Response
): Download<Response> => {
  return (
    path: string,
    pFilename?: string | Callback,
    pOptions?: DownloadOptions | Callback,
    pDone?: Callback
  ): Response => {
    let done: Callback | undefined
    let filename: string | undefined
    let options: DownloadOptions | undefined

    // support function as second or third arg
    if (typeof pFilename === 'function') {
      filename = undefined
      done = pFilename
    } else if (typeof pOptions === 'function') {
      filename = pFilename
      options = undefined
      done = pOptions
    } else if (typeof pDone === 'function') {
      filename = pFilename
      options = pOptions
      done = pDone
    } else {
      filename = pFilename
      options = pOptions
    }

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

    return sendFile(req, res)(options.root ? path : resolve(path), options, done || (() => undefined))
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
