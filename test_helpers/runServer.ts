import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http'
import { Request } from '@/packages/app/src'

export const runServer = (func: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>): Server => {
  const listener = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await func(req, res)
    } finally {
      res.end()
    }
  }

  return createServer({ IncomingMessage: Request }, listener)
}
