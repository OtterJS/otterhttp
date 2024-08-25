---
"@otterhttp/app": minor
"@otterhttp/ip-filter": minor
"@otterhttp/request": minor
---

Drop support for next(err), all errors must be `throw`n. Remove `req.originalUrl`, add `req.subpath`. Refactor main request-handling loop.
