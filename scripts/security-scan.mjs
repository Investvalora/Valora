import { execFileSync } from 'node:child_process'
import { readFileSync, lstatSync } from 'node:fs'

// Report file/category only; never print the matched credential.
const patterns = [
  ['supabase-secret', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['github-token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})/],
  ['sendgrid-token', /SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{30,}/],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['database-password', /postgres(?:ql)?:\/\/[^\s:/]+:[^\s@]{8,}@[^\s]+/],
]
let findings = 0
let scanned = 0
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
for (const file of files) {
  if (!lstatSync(file).isFile()) continue
  const buffer = readFileSync(file)
  if (buffer.includes(0)) continue
  scanned++
  const text = buffer.toString('utf8')
  for (const [category, pattern] of patterns) {
    if (pattern.test(text)) { console.error(`${file}: ${category}`); findings++ }
  }
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString()).role === 'service_role') {
        console.error(`${file}: privileged-jwt`); findings++
      }
    } catch { /* Not a JWT. */ }
  }
}
console.log(`Secret scan: ${scanned} tracked text files; ${findings} findings.`)
process.exitCode = findings ? 1 : 0
