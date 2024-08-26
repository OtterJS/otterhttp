import type { Request, Response } from "@otterhttp/app"

export type JSONPOptions = Partial<{
  escape: boolean
  replacer: (this: any, key: string, value: any) => any
  spaces: string | number
  callbackName: string
}>

function stringify(
  value: unknown,
  replacer?: (this: unknown, key: string, value: any) => any,
  spaces?: string | number,
  // biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
  escape = false,
) {
  let json = replacer || spaces ? JSON.stringify(value, replacer, spaces) : JSON.stringify(value)

  if (escape) {
    json = json.replace(/[<>&]/g, (c: string): string => {
      switch (c.charCodeAt(0)) {
        case 0x3c:
          return "\\u003c"
        case 0x3e:
          return "\\u003e"
        case 0x26:
          return "\\u0026"
      }
      return undefined as never
    })
  }

  return json
}

/**
 * Send JSON response with JSONP callback support
 * @param res Response
 * @param obj object to send
 * @param opts
 */
export function jsonp(res: Response<Request>, obj: unknown, opts: JSONPOptions = {}) {
  const val = obj

  // biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
  const { escape, replacer, spaces, callbackName = "callback" } = opts

  let body = stringify(val, replacer, spaces, escape)

  let callback = res.req.query[callbackName]

  if (!res.getHeader("Content-Type")) {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Type", "application/json")
  }

  // jsonp
  if (typeof callback === "string" && callback.length !== 0) {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Type", "text/javascript")

    // restrict callback charset
    callback = callback.replace(/[^[\]\w$.]/g, "")

    // replace chars not allowed in JavaScript that are in JSON
    body = body.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")

    // the /**/ is a specific security mitigation for "Rosetta Flash JSONP abuse"
    // the typeof check is just to reduce client error noise
    body = `/**/ typeof ${callback} === 'function' && ${callback}(${body});`
  }

  return res.send(body)
}
