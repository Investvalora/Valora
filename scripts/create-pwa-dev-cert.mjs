import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIP } from 'node:net'

const directory = fileURLToPath(new URL('../.local-pwa/', import.meta.url))
await mkdir(directory, { recursive: true })

function openssl(...args) {
  const result = spawnSync('openssl', args, { stdio: 'inherit' })
  if (result.error) throw new Error('OpenSSL não encontrado. Instale o OpenSSL e execute novamente.', { cause: result.error })
  if (result.status !== 0) throw new Error(`OpenSSL falhou com código ${result.status}`)
}

const caKey = join(directory, 'ca.key')
const caCert = join(directory, 'ca.crt')
const caConfig = join(directory, 'ca.cnf')
if (existsSync(caKey) !== existsSync(caCert)) {
  throw new Error('A autoridade local está incompleta. Confira .local-pwa/ca.key e ca.crt.')
}

if (!existsSync(caKey)) {
  await writeFile(caConfig, [
    '[req]',
    'distinguished_name = dn',
    'prompt = no',
    'x509_extensions = v3_ca',
    '[dn]',
    'CN = Valora Local Development CA',
    '[v3_ca]',
    'basicConstraints = critical,CA:TRUE',
    'keyUsage = critical,keyCertSign,cRLSign',
  ].join('\n'))
  openssl(
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '365',
    '-keyout', caKey, '-out', caCert,
    '-config', caConfig, '-extensions', 'v3_ca',
  )
}

const addresses = new Set(['127.0.0.1'])
for (const interfaces of Object.values(networkInterfaces())) {
  for (const item of interfaces ?? []) {
    if (item.family === 'IPv4' && !item.internal) addresses.add(item.address)
  }
}
for (const argument of process.argv.slice(2)) {
  if (isIP(argument) !== 4) throw new Error(`IP inválido: ${argument}`)
  addresses.add(argument)
}

const configuration = [
  '[req]',
  'distinguished_name = dn',
  'prompt = no',
  '[dn]',
  'CN = Valora Local Development',
  '[ext]',
  'basicConstraints = CA:FALSE',
  'keyUsage = digitalSignature, keyEncipherment',
  'extendedKeyUsage = serverAuth',
  'subjectAltName = @alt_names',
  '[alt_names]',
  'DNS.1 = localhost',
  ...[...addresses].map((address, index) => `IP.${index + 1} = ${address}`),
].join('\n')

const configPath = join(directory, 'server.cnf')
const serverKey = join(directory, 'server.key')
const requestPath = join(directory, 'server.csr')
const serverCert = join(directory, 'server.crt')
await writeFile(configPath, `${configuration}\n`)

openssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', serverKey, '-out', requestPath, '-config', configPath)
openssl(
  'x509', '-req', '-in', requestPath, '-CA', caCert, '-CAkey', caKey,
  '-CAcreateserial', '-out', serverCert, '-days', '365', '-sha256',
  '-extfile', configPath, '-extensions', 'ext',
)

console.log(`\nCertificado local criado para: ${[...addresses].join(', ')}`)
console.log(`Autoridade para confiar no computador e celular: ${caCert}`)
console.log('A chave privada fica em .local-pwa/ e não deve ser compartilhada.')
