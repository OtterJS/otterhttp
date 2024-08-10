# @otterhttp/router

[![npm (scoped)][npm-badge]](https://npmjs.com/package/@otterhttp/router) [![npm][dl-badge]](https://npmjs.com/package/@otterhttp/router)

Framework-agnostic HTTP router.

## Install

```sh
pnpm i @otterhttp/router
```

## Example

```js
import { Router } from '@otterhttp/router'

const router = new Router()

router.get('/', (req, res) => res.send('Hello World'))

console.log(router.middleware)
```

[npm-badge]: https://img.shields.io/npm/v/@otterhttp/router?style=flat-square
[dl-badge]: https://img.shields.io/npm/dt/@otterhttp/router?style=flat-square
