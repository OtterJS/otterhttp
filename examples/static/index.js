import { App } from '@otterhttp/app'

import sirv from 'sirv'

new App().use('/files', sirv('static')).listen(3000)
