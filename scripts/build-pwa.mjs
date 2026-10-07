import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = new URL('../dist/', import.meta.url)
const source = new URL('../public/sw.js', import.meta.url)
const output = new URL('../dist/sw.js', import.meta.url)

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  }))
  return files.flat()
}

const distPath = fileURLToPath(dist)
const files = (await listFiles(distPath))
  .filter((file) => !file.endsWith(`${sep}sw.js`))
  .sort()

const hash = createHash('sha256')
const urls = []
for (const file of files) {
  const url = `/${relative(distPath, file).split(sep).join('/')}`
  urls.push(url)
  hash.update(url)
  hash.update(await readFile(file))
}

const cacheName = `valora-static-${hash.digest('hex').slice(0, 12)}`
const template = await readFile(source, 'utf8')
const cacheDeclaration = "const CACHE_NAME = 'valora-static-v1'"
const shellDeclaration = "const APP_SHELL = ['/index.html']"
if (!template.includes(cacheDeclaration) || !template.includes(shellDeclaration)) {
  throw new Error('Não foi possível localizar os marcadores de cache em public/sw.js')
}

const worker = template
  .replace(cacheDeclaration, `const CACHE_NAME = '${cacheName}'`)
  .replace(shellDeclaration, `const APP_SHELL = ${JSON.stringify(urls)}`)

await writeFile(output, worker)
console.log(`PWA: ${urls.length} arquivos em cache (${cacheName})`)
