"""
Build data.dcft — bundle unique contenant tous les JSON et icônes.
Format : magic DCFT + index sections + données zlib+XOR.
"""
import json, zlib, struct, os, sys

MAGIC   = b'DCFT'
VERSION = 1
XOR_KEY = bytes([0xAF, 0x52, 0x8C, 0x1E, 0x7B, 0x3D, 0x94, 0xC6])

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT_PATH = os.path.join(DATA_DIR, 'data.dcft')


def _xor(data: bytes) -> bytes:
    key = XOR_KEY
    klen = len(key)
    result = bytearray(data)
    for i in range(len(result)):
        result[i] ^= key[i % klen]
    return bytes(result)


def pack_section(raw: bytes) -> bytes:
    """Compress then XOR."""
    return _xor(zlib.compress(raw, level=9))


def log(msg: str):
    print(msg, flush=True)


def build():
    # ── 1. Meta section ─────────────────────────────────────────────────────
    log("Loading JSON files…")
    meta = {}
    for name in ['items', 'recipes', 'jobs', 'item_types', 'items_extra']:
        path = os.path.join(DATA_DIR, f'{name}.json')
        if not os.path.exists(path):
            log(f"  WARN: {name}.json not found, skipping")
            continue
        with open(path, encoding='utf-8') as f:
            meta[name] = json.load(f)
        log(f"  Loaded {name}.json")

    meta_raw    = json.dumps(meta, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    meta_packed = pack_section(meta_raw)
    log(f"  meta: {len(meta_raw):,} B → {len(meta_packed):,} B compressed")

    # ── 2. Icons section ─────────────────────────────────────────────────────
    log("Packing icons…")
    icons_dir = os.path.join(DATA_DIR, 'icons')
    icon_ids  = []
    icon_data = []

    if os.path.isdir(icons_dir):
        for fname in os.listdir(icons_dir):
            if not fname.endswith('.png'):
                continue
            try:
                icon_ids.append(int(fname[:-4]))
            except ValueError:
                continue
            with open(os.path.join(icons_dir, fname), 'rb') as f:
                icon_data.append(f.read())

    count = len(icon_ids)
    # Mini-archive: [count:4][{id:4, offset:4, size:4} × count][PNG…]
    offset = 0
    index_entries = bytearray()
    for iid, d in zip(icon_ids, icon_data):
        index_entries += struct.pack('<III', iid, offset, len(d))
        offset += len(d)

    icons_raw    = struct.pack('<I', count) + bytes(index_entries) + b''.join(icon_data)
    icons_packed = pack_section(icons_raw)
    log(f"  icons ({count} files): {len(icons_raw):,} B → {len(icons_packed):,} B compressed")

    # ── 3. Assemble file ──────────────────────────────────────────────────────
    log("Assembling bundle…")
    sections = [('meta', meta_packed), ('icons', icons_packed)]

    # Compute index byte size
    index_bytes = bytearray()
    for name, data in sections:
        nb = name.encode('utf-8')
        index_bytes += bytes([len(nb)]) + nb + b'\x00\x00\x00\x00\x00\x00\x00\x00'  # placeholder offset+size

    header_size = 4 + 2 + 2  # magic + version + count
    index_size  = sum(1 + len(name.encode()) + 8 for name, _ in sections)
    data_start  = header_size + index_size

    buf = bytearray()
    buf += MAGIC
    buf += struct.pack('<HH', VERSION, len(sections))

    cur_offset = data_start
    for name, data in sections:
        nb = name.encode('utf-8')
        buf += bytes([len(nb)]) + nb + struct.pack('<II', cur_offset, len(data))
        cur_offset += len(data)

    for _, data in sections:
        buf += data

    with open(OUT_PATH, 'wb') as f:
        f.write(buf)

    size_mb = len(buf) / 1024 / 1024
    log(f"\nBundle écrit : {OUT_PATH}")
    log(f"Taille totale : {len(buf):,} octets ({size_mb:.1f} MB)")


if __name__ == '__main__':
    build()
