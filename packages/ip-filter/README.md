# @otterhttp/ip-filter

[![npm (scoped)][badge-url]][npm-url] [![npm][dl-badge-url]][npm-url]

IP Filtering middleware to send 403 on bad IPs.

## Install

```sh
pnpm i @otterhttp/ip-filter
```

## API

```ts
import { ipFilter } from '@otterhttp/ip-filter'
```

### `ipFilter(options)`

Returns the IP filter middleware.

#### Options

- `ip` - IP to use. Defaults to `req.ip`
- `strict`: throw if invalid IP
- `filter`: blacklist filter (array of strings / RegExps)
- `forbidden`: custom 403 message response

## Example

```ts
import { App } from '@otterhttp/app'
import { ipFilter } from '@otterhttp/ip-filter'

const app = new App()

app.use(ipFilter({ forbidden: 'Get the f*ck out of my server!', filter: [`*.example.com`], strict: true }))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(3000)
```

[badge-url]: https://img.shields.io/npm/v/@otterhttp/ip-filter?style=flat-square
[npm-url]: https://npmjs.com/package/@otterhttp/ip-filter
[dl-badge-url]: https://img.shields.io/npm/dt/@otterhttp/ip-filter?style=flat-square
