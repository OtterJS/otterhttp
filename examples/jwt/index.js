import { App } from "@otterhttp/app"
import { jwt } from "@otterhttp/jwt"
import jsonwebtoken from "jsonwebtoken"
import { urlencoded } from "milliparsec"

const app = new App()
const secretToken = "very secret key"

app.use(jwt({ secret: secretToken, algorithm: "HS256" }))
app.use(urlencoded())

app.get("/", (_req, res) => {
  res.send('Go to "/login" page to login')
})

app.post("/login", (req, res) => {
  const { body } = req

  if (body.user !== "admin" || body.pwd !== "admin") {
    res.send("Incorrect login")
    return
  }

  res
    .set("X-Token", jsonwebtoken.sign({ cool: true }, secretToken, { algorithm: "HS256" }))
    .status(204)
    .end()
})

app.listen(3000)
