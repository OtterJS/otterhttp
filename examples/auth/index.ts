import { App } from '@tinyhttp/app'
import { jwt } from '@tinyhttp/jwt'
import bodyParser from 'body-parser'
import jsonwebtoken from 'jsonwebtoken'

const app = new App()
const secretToken = 'very secret key'

app.use(jwt({ secret: secretToken, algorithm: 'HS256' }))
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (_req, res) => {
  res.send('hello little penis')
})

app.post('/login', (req, res) => {
  if (req['body'].username !== 'admin' || req['body'].password !== 'admin') {
    res.send('Incorrect login')
    return
  }

  res
    .set(
      'X-Token',
      jsonwebtoken.sign({ cool: true }, secretToken, { algorithm: 'HS256' })
    )
    .status(204)
    .end()
})

app.listen(8080)