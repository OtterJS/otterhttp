import type { OutgoingHttpHeaders } from 'node:http'
import ModuleError from 'module-error'

import { HttpStatus, type StatusCode, isValidStatusCode, statusMessages } from './status-codes'

type ModuleErrorOptions = ConstructorParameters<typeof ModuleError>[1]
type HttpErrorOptions = ModuleErrorOptions & {
  statusCode?: StatusCode
  statusMessage?: string
  exposeMessage?: boolean
  headers?: OutgoingHttpHeaders
}

export abstract class HttpError extends ModuleError {
  statusCode: StatusCode
  statusMessage: string
  exposeMessage: boolean
  headers: OutgoingHttpHeaders

  protected constructor(message?: string, options?: HttpErrorOptions) {
    super(message || '', options)

    if (typeof options === 'object' && options != null) {
      if (options.statusCode != null) {
        if (!isValidStatusCode(options.statusCode)) {
          throw new ModuleError(`an HTTPError was thrown with an invalid HTTP status code: ${options.statusCode}`, {
            code: 'ERR_INVALID_HTTP_ERROR_HTTP_STATUS_CODE'
          })
        }
        this.statusCode = options.statusCode
      }
      if (options.statusMessage != null) this.statusMessage = options.statusMessage
      if (options.exposeMessage != null) this.exposeMessage = options.exposeMessage
      if (options.headers != null) this.headers = options.headers
    }

    this.statusCode ??= HttpStatus.InternalServerError
    this.statusMessage ??= statusMessages[this.statusCode]
    this.exposeMessage ??= this.statusCode < 500
    this.headers ??= {}
  }
}

export class NotModifiedError extends HttpError {
  constructor(message?: string, options?: Omit<HttpErrorOptions, 'statusCode'>) {
    const superOptions: HttpErrorOptions = options ?? {}
    superOptions.statusCode = HttpStatus.NotModified
    superOptions.expected ??= true

    super(message, options)
  }
}

export class ClientError extends HttpError {
  constructor(message?: string, options: HttpErrorOptions = {}) {
    options.expected ??= true
    options.statusCode ??= 400

    super(message, options)

    if (this.statusCode < 400 || this.statusCode >= 500) {
      throw new ModuleError(
        `a ClientError was thrown with a disallowed HTTP status code: ${this.statusCode}. Only 4xx codes are allowed.`,
        { code: 'ERR_INVALID_CLIENT_ERROR_HTTP_STATUS_CODE' }
      )
    }
  }
}

export class ServerError extends HttpError {
  constructor(message?: string, options?: HttpErrorOptions) {
    super(message, options)
    if (this.statusCode < 500) {
      throw new ModuleError(
        `a ServerError was thrown with an invalid HTTP status code: ${this.statusCode}. Only 5xx codes are allowed.`,
        { code: 'ERR_INVALID_SERVER_ERROR_HTTP_STATUS_CODE' }
      )
    }
  }
}

export * from './status-codes'
