'use strict'
/**
 * Lecteur du bundle data.dcft (version 2 — multi-langue).
 * Format : magic DCFT + index sections + données zlib+XOR.
 * Sections : meta_fr, meta_en, meta_es, meta_de, meta_pt, icons
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
 * @returns {{ metas: Record<string, object>, iconMap: Map<number, Buffer> }}
 */
function loadBundle(bundlePath) {
  const buf = fs.readFileSync(bundlePath)

  if (!buf.slice(0, 4).equals(MAGIC)) throw new Error('data.dcft: magic invalide')

  const numSections = buf.readUInt16LE(6)

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

  // ── Meta sections (meta_fr, meta_en, …) ───────────────────────────────────
  const metas = {}
  for (const [name, sec] of Object.entries(sections)) {
    if (!name.startsWith('meta_')) continue
    const lang = name.slice(5)
    const raw  = unpack(buf.slice(sec.offset, sec.offset + sec.size))
    metas[lang] = JSON.parse(raw.toString('utf-8'))
  }

  if (Object.keys(metas).length === 0) throw new Error('data.dcft: aucune section meta_* trouvée')

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

  return { metas, iconMap }
}

module.exports = { loadBundle }
