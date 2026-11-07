/** Read bounded public files. Never trust a remote Content-Length alone. */
export async function boundedBytes(response: Response, maximum = 24 * 1024 * 1024): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error('official_source_unavailable')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break
      size += value.length
      if (size > maximum) throw new Error('official_source_too_large')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  const result = new Uint8Array(size); let offset = 0
  for (const part of chunks) { result.set(part, offset); offset += part.length }
  return result
}

/** ZIP central directory supports data descriptors and multiple CSVs (CVM).
 * Reject encryption, ZIP64, oversized entries and unsupported compression. */
export async function zipFiles(bytes: Uint8Array, accept: (name: string) => boolean): Promise<Map<string, string>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  for (; end >= Math.max(0, bytes.length - 65557); end--) if (view.getUint32(end, true) === 0x06054b50) break
  if (end < Math.max(0, bytes.length - 65557)) throw new Error('invalid_zip')
  const count = view.getUint16(end + 10, true)
  if (count > 32 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('unsupported_zip')
  let offset = view.getUint32(end + 16, true); let total = 0
  const out = new Map<string, string>()
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('invalid_zip')
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true)
    const compressed = view.getUint32(offset + 20, true), expanded = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    const local = view.getUint32(offset + 42, true)
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true)
    if (!accept(name)) continue
    total += expanded
    if (flags & 1 || ![0, 8].includes(method) || expanded > 48 * 1024 * 1024 || total > 96 * 1024 * 1024 || local + 30 > bytes.length) throw new Error('unsupported_zip')
    if (view.getUint32(local, true) !== 0x04034b50) throw new Error('invalid_zip')
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    if (start + compressed > bytes.length) throw new Error('invalid_zip')
    const payload = bytes.slice(start, start + compressed)
    let response = new Response(payload)
    if (method === 8) response = new Response(response.body!.pipeThrough(new DecompressionStream('deflate-raw')))
    const decoded = await boundedBytes(response, Math.max(1, expanded))
    if (decoded.length !== expanded) throw new Error('invalid_zip_size')
    out.set(name, new TextDecoder('windows-1252').decode(decoded))
  }
  return out
}

/** RFC4180 quoting with semicolon separator, including embedded newlines. */
export function csvRecords(text: string): Record<string, string>[] {
  const records: string[][] = []; let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (!quoted && (c === ';' || c === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = ''
      if (c === '\n') { records.push(row); row = [] }
    } else cell += c
  }
  if (quoted) throw new Error('invalid_csv')
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); records.push(row) }
  const header = records.shift()?.map(c => c.replace(/^\uFEFF/, '')) ?? []
  return records.filter(r => r.some(Boolean)).map(r => {
    if (r.length !== header.length) throw new Error('invalid_csv_columns')
    return Object.fromEntries(header.map((key, index) => [key, r[index]]))
  })
}

export function validIso(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
