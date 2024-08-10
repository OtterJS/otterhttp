# @otterhttp/app

The core of tinyhttp. Contains the `App`, `Request` and `Response`. Additionally, it provides special tinyhttp-specific types.

## Install

```sh
pnpm i @otterhttp/app
```

## Example

```ts
import { App } from '@otterhttp/app'
import type { Request, Response, NextFunction } from '@otterhttp/app'

new App()
  .use((req: Request, res: Response, next: NextFunction) => {
    console.log('Did a request')
    next()
  })
  .get('/', (_, res) => res.send('<h1>Hello World</h1>'))
  .get('/page/:page', (req, res) => res.send(`You opened ${req.params.page}`))
  .listen(3000)
```
