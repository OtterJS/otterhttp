import { type IncomingMessage as Request, type ServerResponse as Response, type Server, createServer } from 'node:http'

export const runServer = (func: (req: Request, res: Response) => void | Promise<void>): Server => {
  return createServer(async (req, res) => {
    try {
      await func(req, res)
    } finally {
      res.end()
    }
  })
}
