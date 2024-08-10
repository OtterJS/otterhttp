# @otterhttp/cookie-signature

[![npm (scoped)](https://img.shields.io/npm/v/@otterhttp/cookie-signature?style=flat-square)](https://npmjs.com/package/@otterhttp/cookie-signature) [![npm](https://img.shields.io/npm/dt/@otterhttp/cookie-signature?style=flat-square)](https://npmjs.com/package/@otterhttp/cookie-signature)

HTTP cookie signing and unsigning. A rewrite of [cookie-signature](https://github.com/tj/node-cookie-signature) module.

## Install

```sh
pnpm i @otterhttp/cookie-signature
```

## API

```js
import { sign, unsign } from '@otterhttp/cookie-signature'
```

### `sign(val, secret)`

Signd the given `val` with `secret`.

### `unsign(val, secret)`

Unsign and decode the given `val` with `secret`, returning `false` if the signature is invalid.
