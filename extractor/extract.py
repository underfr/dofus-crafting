"""
Extracts items, recipes, and jobs from Dofus 3 Unity asset bundles.
Outputs JSON files to the data/ directory.
"""
import sys
import os
import json
import struct

import UnityPy
import UnityPy.config

UnityPy.config.FALLBACK_UNITY_VERSION = "6000.3.3f1"

from PIL import Image

GAME_DATA = r"C:\Users\under\AppData\Local\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\Content\Data"
I18N_DIR  = r"C:\Users\under\AppData\Local\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\Content\I18n"
ICON_BUNDLE = r"C:\Users\under\AppData\Local\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\Content\Picto\Items\item_assets_2x.bundle"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

LANGUAGES = ['fr', 'en', 'es', 'de', 'pt']


def get_i18n_path(lang):
    return os.path.join(I18N_DIR, f'{lang}.bin')


def log(msg):
    print(msg, flush=True)


def _read_7bit_int(data, offset):
    """C# BinaryWriter 7-bit variable-length encoded int."""
    result = 0
    shift = 0
    while True:
        b = data[offset]
        offset += 1
        result |= (b & 0x7F) << shift
        shift += 7
        if not (b & 0x80):
            break
    return result, offset


def build_i18n_index(path):
    log(f"Loading I18n index from {os.path.basename(path)}...")
    with open(path, "rb") as f:
        data = f.read()

    INDEX_START = 7
    ENTRY_SIZE = 8
    first_offset = struct.unpack_from("<I", data, INDEX_START + 4)[0]

    index = {}
    for i in range(0, first_offset - INDEX_START, ENTRY_SIZE):
        pos = INDEX_START + i
        if pos + 8 > first_offset:
            break
        eid = struct.unpack_from("<I", data, pos)[0]
        eoff = struct.unpack_from("<I", data, pos + 4)[0]
        index[eid] = eoff

    def get_text(offset):
        if offset >= len(data):
            return ""
        try:
            length, text_start = _read_7bit_int(data, offset)
            return data[text_start:text_start + length].decode("utf-8", errors="replace")
        except Exception:
            return ""

    log(f"  {len(index)} I18n entries loaded")
    return index, get_text


def read_mb(path, name):
    env = UnityPy.load(path)
    for obj in env.objects:
        if obj.type.name == "MonoBehaviour":
            data = obj.read()
            if data.m_Name == name:
                return data
    raise RuntimeError(f"MonoBehaviour '{name}' not found in {path}")


def extract_jobs(i18n_index, get_text):
    path = os.path.join(GAME_DATA, "data_assets_jobsdataroot.asset.bundle")
    mb = read_mb(path, "JobsDataRoot")
    jobs = []
    for ref in mb.references.RefIds:
        d = ref.data
        jobs.append({
            "id": d.id,
            "name": get_text(i18n_index.get(d.nameId, 0)),
            "iconId": d.iconId,
        })
    return jobs


def extract_item_types(i18n_index, get_text):
    path = os.path.join(GAME_DATA, "data_assets_itemtypesdataroot.asset.bundle")
    mb = read_mb(path, "ItemTypesDataRoot")
    item_types = []
    for ref in mb.references.RefIds:
        d = ref.data
        item_types.append({
            "id": d.id,
            "name": get_text(i18n_index.get(d.nameId, 0)),
        })
    return item_types


def extract_recipes(i18n_index, get_text):
    path = os.path.join(GAME_DATA, "data_assets_recipesdataroot.asset.bundle")
    mb = read_mb(path, "RecipesDataRoot")
    recipes = []
    for ref in mb.references.RefIds:
        d = ref.data
        name_id_raw = d.resultNameId
        name_id = int(name_id_raw) if isinstance(name_id_raw, str) else name_id_raw
        recipes.append({
            "resultId": d.resultId,
            "resultName": get_text(i18n_index.get(name_id, 0)),
            "resultTypeId": d.resultTypeId,
            "resultLevel": d.resultLevel,
            "ingredientIds": list(d.ingredientIds),
            "quantities": list(d.quantities),
            "jobId": d.jobId,
            "skillId": d.skillId,
        })
    return recipes


def extract_items(i18n_index, get_text):
    path = os.path.join(GAME_DATA, "data_assets_itemsdataroot.asset.bundle")
    mb = read_mb(path, "ItemsDataRoot")
    items = []
    skipped = 0
    for ref in mb.references.RefIds:
        d = ref.data
        if d is None or not hasattr(d, "id"):
            skipped += 1
            continue
        try:
            items.append({
                "id": d.id,
                "name": get_text(i18n_index.get(d.nameId, 0)),
                "typeId": d.typeId,
                "level": d.level,
                "iconId": d.iconId,
                "price": float(d.price) if hasattr(d, "price") else 0,
                "realWeight": d.realWeight if hasattr(d, "realWeight") else 0,
            })
        except Exception:
            skipped += 1
    return items


def extract_for_lang(i18n_index, get_text):
    """Extract all game data for a given language (i18n already loaded)."""
    log("  Extracting jobs...")
    jobs = extract_jobs(i18n_index, get_text)
    log(f"    {len(jobs)} jobs")

    log("  Extracting item types...")
    item_types = extract_item_types(i18n_index, get_text)
    log(f"    {len(item_types)} item types")

    log("  Extracting recipes...")
    recipes = extract_recipes(i18n_index, get_text)
    log(f"    {len(recipes)} recipes")

    log("  Extracting items...")
    items = extract_items(i18n_index, get_text)
    log(f"    {len(items)} items")

    return {"jobs": jobs, "item_types": item_types, "recipes": recipes, "items": items}


ICON_SIZE = 80


def extract_icons(items, recipes):
    log("Extracting icons...")
    icons_dir = os.path.join(OUT_DIR, "icons")
    os.makedirs(icons_dir, exist_ok=True)

    item_by_id = {i["id"]: i for i in items}
    needed_icon_ids = set()
    for item in items:
        needed_icon_ids.add(item["iconId"])
    for r in recipes:
        for iid in r["ingredientIds"]:
            item = item_by_id.get(iid)
            if item:
                needed_icon_ids.add(item["iconId"])

    existing = {
        int(f[:-4]) for f in os.listdir(icons_dir) if f.endswith(".png") and f[:-4].isdigit()
    }
    to_extract = needed_icon_ids - existing
    log(f"  {len(needed_icon_ids)} needed, {len(existing)} cached, extracting {len(to_extract)}...")

    if not to_extract:
        log("  All icons already cached.")
        return

    env = UnityPy.load(ICON_BUNDLE)
    extracted = 0
    for obj in env.objects:
        if obj.type.name != "Sprite":
            continue
        data = obj.read()
        try:
            icon_id = int(data.m_Name)
        except ValueError:
            continue
        if icon_id not in to_extract:
            continue
        try:
            img = data.image.convert("RGBA")
            ratio = min(ICON_SIZE / img.width, ICON_SIZE / img.height)
            new_w = max(1, int(img.width * ratio))
            new_h = max(1, int(img.height * ratio))
            thumb = img.resize((new_w, new_h), Image.LANCZOS)
            canvas = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
            canvas.paste(thumb, ((ICON_SIZE - new_w) // 2, (ICON_SIZE - new_h) // 2))
            canvas.save(os.path.join(icons_dir, f"{icon_id}.png"))
            extracted += 1
        except Exception:
            pass

    log(f"  {extracted} icons extracted to data/icons/")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    i18n_index, get_text = build_i18n_index(get_i18n_path('fr'))
    data = extract_for_lang(i18n_index, get_text)

    for name, content in data.items():
        with open(os.path.join(OUT_DIR, f"{name}.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        log(f"  Wrote data/{name}.json")

    extract_icons(data["items"], data["recipes"])
    log("Done!")


if __name__ == "__main__":
    main()
