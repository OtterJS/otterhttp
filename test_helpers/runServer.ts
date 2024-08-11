import { type Server, type ServerResponse, createServer } from 'node:http'
import { Request } from '@/packages/app/src'

export const runServer = (func: (req: Request, res: ServerResponse) => void | Promise<void>): Server => {
  const listener = async (req: Request, res: ServerResponse) => {
    req.populate({ trust: 0, subdomainOffset: undefined })
    try {
      await func(req, res)
    } finally {
      res.end()
    }
  }

  return createServer({ IncomingMessage: Request }, listener)
}
