import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const certificate = fileURLToPath(new URL('../.local-pwa/server.crt', import.meta.url))
const key = fileURLToPath(new URL('../.local-pwa/server.key', import.meta.url))
if (!existsSync(certificate) || !existsSync(key)) {
  console.error('Certificado ausente. Execute pnpm pwa:cert antes de pnpm dev:pwa.')
  process.exit(1)
}

const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const child = spawn(process.execPath, [vite, '--port', '5443', '--strictPort'], {
  env: { ...process.env, VALORA_DEV_HTTPS: '1' },
  stdio: 'inherit',
})
child.on('exit', (code) => { process.exitCode = code ?? 1 })
child.on('error', (error) => {
  console.error('Não foi possível iniciar o Vite:', error)
  process.exitCode = 1
})
