import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const iconDirectory = join(projectRoot, 'public', 'icons')

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const pathPoints = [
  [32, 76],
  [52, 52],
  [70, 68],
  [96, 36],
]

function crc32(bytes) {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

function distanceToSegment(x, y, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const projection = ((x - start[0]) * dx + (y - start[1]) * dy) / (dx * dx + dy * dy)
  const t = Math.max(0, Math.min(1, projection))
  return Math.hypot(x - start[0] - t * dx, y - start[1] - t * dy)
}

function pixelColor(x, y) {
  // Ícones de instalação devem preencher todo o bitmap; o sistema aplica
  // o recorte arredondado. Transparência e moldura viram uma borda escura no iOS.
  let color = [16, 24, 34, 255]

  for (let index = 0; index < pathPoints.length - 1; index += 1) {
    if (distanceToSegment(x, y, pathPoints[index], pathPoints[index + 1]) <= 5) {
      const blend = Math.max(0, Math.min(1, (x - 32) / 64))
      color = [
        Math.round(92 + (63 - 92) * blend),
        Math.round(200 + (125 - 200) * blend),
        255,
        255,
      ]
    }
  }

  if (Math.hypot(x - 96, y - 36) <= 6) {
    color = [92, 200, 255, 255]
  }

  return color
}

function makePng(size) {
  const rowLength = size * 4 + 1
  const pixels = Buffer.alloc(rowLength * size)

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowLength
    pixels[rowStart] = 0

    for (let x = 0; x < size; x += 1) {
      const sourceX = (x + 0.5) * 128 / size
      const sourceY = (y + 0.5) * 128 / size
      const offset = rowStart + 1 + x * 4
      const color = pixelColor(sourceX, sourceY)
      pixels.set(color, offset)
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(iconDirectory, { recursive: true })

for (const size of [180, 192, 512]) {
  const name = size === 180 ? 'valora-apple-180.png' : `valora-${size}.png`
  writeFileSync(join(iconDirectory, name), makePng(size))
}
