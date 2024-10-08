import type { IncomingMessage as Request, ServerResponse as Response } from "node:http"
import ipRegex from "ip-regex"

type Filter = string | RegExp

const processIpFilters = (ip: string, filter: Filter[], strict: boolean): boolean => {
  if (strict && !ipRegex().test(ip)) throw new Error(`@otterhttp/ip-filter: Invalid IP: ${ip}`)

  return filter.some((f) => {
    if (typeof f === "string") return f === ip
    if (f instanceof RegExp) return f.test(ip)
  })
}

export type IPFilterOptions = {
  getIp?: (request: Request, response: Response) => string | undefined
  strict?: boolean
  filter: Filter[]
  forbidden?: string
}

export const ipFilter = (opts: IPFilterOptions) => {
  if (opts == null) throw new TypeError("opts must be provided to ipFilter()")
  let { getIp, strict, filter, forbidden } = opts
  getIp ??= (req: Request & { ip?: string }) => req.ip
  strict ??= true
  forbidden ??= "403 Forbidden"

  const fail = (res: Response): void => void res.writeHead(403, forbidden).end()

  return (req: Request, res: Response, next: () => void): void => {
    const ip = getIp(req, res)
    if (ip == null) return fail(res)
    if (typeof ip !== "string") throw new TypeError("@otterhttp/ip-filter: expect `getIp` to return a string")

    const isBadIP = processIpFilters(ip, filter, strict)

    if (isBadIP) {
      return fail(res)
    }

    next()
  }
}
