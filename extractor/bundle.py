"""
Build data.dcft — bundle unique contenant tous les JSON (toutes langues) et icônes.
Format : magic DCFT + index sections + données zlib+XOR.
Sections : meta_fr, meta_en, meta_es, meta_de, meta_pt, icons
"""
import json, zlib, struct, os, sys
sys.path.insert(0, os.path.dirname(__file__))

from extract import (
    build_i18n_index, get_i18n_path, extract_for_lang,
    extract_icons, LANGUAGES, OUT_DIR, log
)
from extract_effects import extract_effects_for_lang

MAGIC   = b'DCFT'
VERSION = 2
XOR_KEY = bytes([0xAF, 0x52, 0x8C, 0x1E, 0x7B, 0x3D, 0x94, 0xC6])

OUT_PATH = os.path.join(OUT_DIR, 'data.dcft')


def _xor(data: bytes) -> bytes:
    key = XOR_KEY
    klen = len(key)
    result = bytearray(data)
    for i in range(len(result)):
        result[i] ^= key[i % klen]
    return bytes(result)


def pack_section(raw: bytes) -> bytes:
    return _xor(zlib.compress(raw, level=9))


def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    sections = []

    # ── Meta sections (one per language) ────────────────────────────────────
    for lang in LANGUAGES:
        log(f"\n─── Language: {lang} ───")
        i18n_index, get_text = build_i18n_index(get_i18n_path(lang))

        data = extract_for_lang(i18n_index, get_text)

        log("  Extracting effects...")
        items_extra = extract_effects_for_lang(i18n_index, get_text)
        log(f"    {len(items_extra)} items with effects/descriptions")
        data['items_extra'] = items_extra

        meta_raw    = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        meta_packed = pack_section(meta_raw)
        sections.append((f'meta_{lang}', meta_packed))
        log(f"  meta_{lang}: {len(meta_raw):,} B → {len(meta_packed):,} B compressed")

    # ── Icons section ────────────────────────────────────────────────────────
    log("\n─── Icons ───")
    # Use fr items/recipes to determine which icons to extract
    fr_data = json.loads(
        next(d for n, d in [(n, zlib.decompress(_xor(d))) for n, d in sections if n == 'meta_fr'])
    )
    extract_icons(fr_data['items'], fr_data['recipes'])

    icons_dir = os.path.join(OUT_DIR, 'icons')
    icon_ids, icon_data = [], []
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
    offset = 0
    index_entries = bytearray()
    for iid, d in zip(icon_ids, icon_data):
        index_entries += struct.pack('<III', iid, offset, len(d))
        offset += len(d)

    icons_raw    = struct.pack('<I', count) + bytes(index_entries) + b''.join(icon_data)
    icons_packed = pack_section(icons_raw)
    sections.append(('icons', icons_packed))
    log(f"  icons ({count} files): {len(icons_raw):,} B → {len(icons_packed):,} B compressed")

    # ── Assemble file ────────────────────────────────────────────────────────
    log("\n─── Assembling bundle ───")
    header_size = 4 + 2 + 2
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
    log(f"Langues : {', '.join(LANGUAGES)}")


if __name__ == '__main__':
    build()
