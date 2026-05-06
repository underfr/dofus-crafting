'use strict'
/**
 * Lecteur du bundle data.dcft.
 * Format : magic DCFT + index sections + données zlib+XOR.
 */

const fs   = require('fs')
const zlib = require('zlib')

const MAGIC   = Buffer.from('DCFT')
const XOR_KEY = Buffer.from([0xAF, 0x52, 0x8C, 0x1E, 0x7B, 0x3D, 0x94, 0xC6])

function xorBuffer(buf) {
  const out  = Buffer.allocUnsafe(buf.length)
  const klen = XOR_KEY.length
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ XOR_KEY[i % klen]
  return out
}

function unpack(data) {
  return zlib.inflateSync(xorBuffer(data))
}

/**
 * @param {string} bundlePath
 * @returns {{ meta: object, iconMap: Map<number, Buffer> }}
 */
function loadBundle(bundlePath) {
  const buf = fs.readFileSync(bundlePath)

  if (!buf.slice(0, 4).equals(MAGIC)) throw new Error('data.dcft: magic invalide')

  const version    = buf.readUInt16LE(4)  // eslint-disable-line no-unused-vars
  const numSections = buf.readUInt16LE(6)

  // Parse index
  const sections = {}
  let pos = 8
  for (let i = 0; i < numSections; i++) {
    const nameLen = buf[pos++]
    const name    = buf.slice(pos, pos + nameLen).toString('utf-8')
    pos += nameLen
    const offset = buf.readUInt32LE(pos)
    const size   = buf.readUInt32LE(pos + 4)
    pos += 8
    sections[name] = { offset, size }
  }

  // ── Meta ──────────────────────────────────────────────────────────────────
  const metaSec = sections['meta']
  if (!metaSec) throw new Error('data.dcft: section "meta" manquante')
  const metaRaw = unpack(buf.slice(metaSec.offset, metaSec.offset + metaSec.size))
  const meta    = JSON.parse(metaRaw.toString('utf-8'))

  // ── Icons ──────────────────────────────────────────────────────────────────
  const iconMap  = new Map()
  const iconsSec = sections['icons']
  if (iconsSec) {
    const raw   = unpack(buf.slice(iconsSec.offset, iconsSec.offset + iconsSec.size))
    const count = raw.readUInt32LE(0)
    const dataStart = 4 + count * 12

    for (let i = 0; i < count; i++) {
      const iPos   = 4 + i * 12
      const id     = raw.readUInt32LE(iPos)
      const offset = raw.readUInt32LE(iPos + 4)
      const size   = raw.readUInt32LE(iPos + 8)
      iconMap.set(id, raw.slice(dataStart + offset, dataStart + offset + size))
    }
  }

  return { meta, iconMap }
}

module.exports = { loadBundle }
