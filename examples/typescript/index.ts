import { App } from '../../packages/app/src'

const app = new App()

app
  .get('/', (_, res) => res.end('hi'))
  .listen(3000, () => console.log('Started on http://localhost:3000'))