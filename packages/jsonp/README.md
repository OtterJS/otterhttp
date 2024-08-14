# @otterhttp/jsonp

[![npm (scoped)](https://img.shields.io/npm/v/@otterhttp/jsonp?style=flat-square)](https://npmjs.com/package/@otterhttp/jsonp) 
[![npm](https://img.shields.io/npm/dt/@otterhttp/jsonp?style=flat-square)](https://npmjs.com/package/@otterhttp/jsonp)

JSONP response extension.

## Install

```sh
pnpm i @otterhttp/jsonp
```

## Example

```js
import { App, extendMiddleware } from '@otterhttp/app'
import { jsonp } from '@otterhttp/jsonp'

new App({
  applyExtensions: (req, res) => {
    extendMiddleware(req, res)
    json(req, res)
  }
})
  .get('/', (req, res) => res.jsonp({ some: 'jsonp' }))
  .listen(3000)
```
