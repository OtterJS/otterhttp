import { type Server, createServer } from 'node:http'
import { Request } from '@/packages/app/src'
import { Response } from '@/packages/res/src'

export const runServer = (func: (req: Request, res: Response) => void | Promise<void>): Server => {
  const listener = async (req: Request, res: Response) => {
    req.populate({ trust: 0, subdomainOffset: undefined })
    try {
      await func(req, res)
    } finally {
      res.end()
    }
  }

  // @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/pull/70289
  return createServer({ IncomingMessage: Request, ServerResponse: Response }, listener)
}
