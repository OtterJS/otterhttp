import path from 'node:path'
import { defineConfig } from 'vitest/config'

const relative = (relativePath: string) => {
  return path.resolve(import.meta.dirname, relativePath)
}

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      include: ['packages/*/src']
    }
  },
  resolve: {
    alias: {
      '@otterhttp/accepts': relative('packages/accepts/src'),
      '@otterhttp/app': relative('packages/app/src'),
      '@otterhttp/content-disposition': relative('packages/content-disposition/src'),
      '@otterhttp/content-type': relative('packages/content-type/src'),
      '@otterhttp/cookie': relative('packages/cookie/src'),
      '@otterhttp/cookie-signature': relative('packages/cookie-signature/src'),
      '@otterhttp/dotenv': relative('packages/dotenv/src'),
      '@otterhttp/encode-url': relative('packages/encode-url/src'),
      '@otterhttp/errors': relative('packages/errors/src'),
      '@otterhttp/etag': relative('packages/etag/src'),
      '@otterhttp/forwarded': relative('packages/forwarded/src'),
      '@otterhttp/ip-filter': relative('packages/ip-filter/src'),
      '@otterhttp/jsonp': relative('packages/jsonp/src'),
      '@otterhttp/proxy-address': relative('packages/proxy-address/src'),
      '@otterhttp/rate-limit': relative('packages/rate-limit/src'),
      '@otterhttp/req': relative('packages/req/src'),
      '@otterhttp/res': relative('packages/res/src'),
      '@otterhttp/router': relative('packages/router/src'),
      '@otterhttp/send': relative('packages/send/src'),
      '@otterhttp/type-is': relative('packages/type-is/src'),
      '@otterhttp/url': relative('packages/url/src'),
      '@otterhttp/vary': relative('packages/vary/src'),
      '@': relative('.')
    }
  }
})
