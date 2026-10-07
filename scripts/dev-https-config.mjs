import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const devHttps = process.env.VALORA_DEV_HTTPS === '1'
  ? {
      key: readFileSync(resolve('.local-pwa/server.key'), 'utf8'),
      cert: readFileSync(resolve('.local-pwa/server.crt'), 'utf8'),
    }
  : undefined
