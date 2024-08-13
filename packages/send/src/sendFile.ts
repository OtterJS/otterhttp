import { createReadStream, statSync } from 'node:fs'
import { extname, isAbsolute } from 'node:path'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import mime from 'mime'

import type { HasIncomingHeaders, HasOutgoingHeaders, HasReq, HasStatus, HasWriteMethods } from './types'
import { createETag } from './utils'

export type ReadStreamOptions = Partial<{
  flags: string
  encoding: BufferEncoding
  fd: number
  mode: number
  autoClose: boolean
  emitClose: boolean
  start: number
  end: number
  highWaterMark: number
}>

export type SendFileOptions = ReadStreamOptions &
  Partial<{
    root: string
    headers: Record<string, any>
    caching: Partial<{
      maxAge: number
      immutable: boolean
    }>
  }>

export type Caching = Partial<{
  maxAge: number
  immutable: boolean
}>

type SendFileResponse = HasOutgoingHeaders &
  HasReq<HasIncomingHeaders> &
  HasStatus &
  HasWriteMethods &
  NodeJS.WritableStream

export const enableCaching = (res: HasOutgoingHeaders, caching: Caching): void => {
  let cc = caching.maxAge != null && `public,max-age=${caching.maxAge}`
  if (cc && caching.immutable) cc += ',immutable'
  else if (cc && caching.maxAge === 0) cc += ',must-revalidate'

  if (cc) res.setHeader('Cache-Control', cc)
}

const makeIndestructible = (stream: NodeJS.WritableStream) => {
  return new Writable({ write: stream.write.bind(stream) })
}

/**
 * Sends a file by piping a stream to response.
 *
 * It also checks for extension to set a proper `Content-Type` header.
 *
 * Path argument must be absolute. To use a relative path, specify the `root` option first.
 *
 * @param res Response
 * @param path
 * @param opts
 */
export async function sendFile(res: SendFileResponse, path: string, opts: SendFileOptions = {}): Promise<void> {
  const { root, headers = {}, encoding = 'utf-8', caching, ...options } = opts
  const req = res.req

  if (!isAbsolute(path) && !root) throw new TypeError('path must be absolute')

  if (caching) enableCaching(res, caching)

  const filePath = root ? join(root, path) : path

  const stats = statSync(filePath)

  headers['Content-Encoding'] = encoding

  headers['Last-Modified'] = stats.mtime.toUTCString()

  headers.ETag = createETag(stats, encoding)

  // TODO: add freshness check here

  if (!res.getHeader('Content-Type')) headers['Content-Type'] = `${mime.getType(extname(path))}; charset=utf-8`

  let status = res.statusCode || 200

  if (req.headers.range) {
    status = 206
    const [x, y] = req.headers.range.replace('bytes=', '').split('-')
    const end = (options.end = Number.parseInt(y, 10) || stats.size - 1)
    const start = (options.start = Number.parseInt(x, 10) || 0)

    if (start >= stats.size || end >= stats.size) {
      res
        .writeHead(416, {
          'Content-Range': `bytes */${stats.size}`
        })
        .end()
      return
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`
    headers['Content-Length'] = end - start + 1
    headers['Accept-Ranges'] = 'bytes'
  } else {
    headers['Content-Length'] = stats.size
  }

  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)

  res.writeHead(status, headers)

  const stream = createReadStream(filePath, options)
  await pipeline(stream, makeIndestructible(res))
}
