import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

// Run Vite with --manifest first. Static closures exclude prefetch/SW installation.
const directory = process.argv[2] ?? 'dist'
const manifest = JSON.parse(await readFile(join(directory, '.vite/manifest.json'), 'utf8'))
const entry = Object.keys(manifest).find(key => manifest[key].isEntry)
if (!entry) throw new Error('Build sem entrada no manifest')
function closure(keys) {
  const visited = new Set()
  function visit(key) {
    if (visited.has(key)) return
    if (!manifest[key]) throw new Error(`Dependência ausente: ${key}`)
    visited.add(key)
    for (const dependency of manifest[key].imports ?? []) visit(dependency)
  }
  keys.forEach(visit)
  return [...new Set([...visited].map(key => manifest[key].file).filter(file => file.endsWith('.js')))]
}
async function bytes(files) {
  let raw = 0, gzip = 0
  for (const file of files) {
    const buffer = await readFile(join(directory, file))
    raw += buffer.length; gzip += gzipSync(buffer).length
  }
  return { files: files.length, bytes: raw, gzipBytes: gzip }
}
const report = { directory, entry: await bytes(closure([entry])), routes: {} }
for (const [name, paths] of Object.entries({
  inicio: ['shared/layout/AppShellNovo.tsx', 'modules/inicio/components/InicioPage.tsx'],
  posicoes: ['shared/layout/AppShellNovo.tsx', 'modules/ativos/components/AtivosPage.tsx', 'modules/ativos/components/AtivosPosicoes.tsx'],
})) {
  const keys = paths.map(path => Object.keys(manifest).find(key => key.endsWith(path))).filter(Boolean)
  report.routes[name] = await bytes(closure([entry, ...keys]))
}
report.allJavaScript = await bytes([...new Set(Object.values(manifest).map(value => value.file).filter(file => file.endsWith('.js')))])
console.log(JSON.stringify(report, null, 2))
