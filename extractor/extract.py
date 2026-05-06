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
I18N_PATH = r"C:\Users\under\AppData\Local\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\Content\I18n\fr.bin"
ICON_BUNDLE = r"C:\Users\under\AppData\Local\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\Content\Picto\Items\item_assets_2x.bundle"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


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
    log("Loading I18n index...")
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


def extract_refs(mb):
    return mb.references.RefIds


def obj_to_dict(obj):
    if not hasattr(obj, "__dict__"):
        return obj
    result = {}
    for k, v in obj.__dict__.items():
        if k in ("__node__", "object_reader"):
            continue
        if hasattr(v, "__dict__") and hasattr(v, "__node__"):
            result[k] = obj_to_dict(v)
        elif isinstance(v, list):
            result[k] = [obj_to_dict(item) for item in v]
        else:
            result[k] = v
    return result


def extract_jobs(i18n_index, get_text):
    log("Extracting jobs...")
    path = os.path.join(GAME_DATA, "data_assets_jobsdataroot.asset.bundle")
    mb = read_mb(path, "JobsDataRoot")
    refs = extract_refs(mb)

    jobs = []
    for ref in refs:
        d = ref.data
        jobs.append({
            "id": d.id,
            "name": get_text(i18n_index.get(d.nameId, 0)),
            "iconId": d.iconId,
        })
    log(f"  {len(jobs)} jobs extracted")
    return jobs


def extract_item_types(i18n_index, get_text):
    log("Extracting item types...")
    path = os.path.join(GAME_DATA, "data_assets_itemtypesdataroot.asset.bundle")
    mb = read_mb(path, "ItemTypesDataRoot")
    refs = extract_refs(mb)

    item_types = []
    for ref in refs:
        d = ref.data
        item_types.append({
            "id": d.id,
            "name": get_text(i18n_index.get(d.nameId, 0)),
        })
    log(f"  {len(item_types)} item types extracted")
    return item_types


def extract_recipes(i18n_index, get_text):
    log("Extracting recipes...")
    path = os.path.join(GAME_DATA, "data_assets_recipesdataroot.asset.bundle")
    mb = read_mb(path, "RecipesDataRoot")
    refs = extract_refs(mb)

    recipes = []
    for ref in refs:
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
    log(f"  {len(recipes)} recipes extracted")
    return recipes


def extract_items(i18n_index, get_text):
    log("Extracting items...")
    path = os.path.join(GAME_DATA, "data_assets_itemsdataroot.asset.bundle")
    mb = read_mb(path, "ItemsDataRoot")
    refs = extract_refs(mb)

    items = []
    skipped = 0
    for ref in refs:
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
        except Exception as e:
            skipped += 1
    if skipped:
        log(f"  (skipped {skipped} entries)")
    log(f"  {len(items)} items extracted")
    return items


ICON_SIZE = 80


def extract_icons(items, recipes):
    log("Extracting icons...")
    icons_dir = os.path.join(OUT_DIR, "icons")
    os.makedirs(icons_dir, exist_ok=True)

    # Collect all iconIds needed (result items + ingredient items)
    item_by_id = {i["id"]: i for i in items}
    needed_icon_ids = set()
    for item in items:
        needed_icon_ids.add(item["iconId"])
    # Also ensure ingredient icons are included
    for r in recipes:
        for iid in r["ingredientIds"]:
            item = item_by_id.get(iid)
            if item:
                needed_icon_ids.add(item["iconId"])

    # Skip already-extracted icons
    existing = {
        int(f[:-4]) for f in os.listdir(icons_dir) if f.endswith(".png") and f[:-4].isdigit()
    }
    to_extract = needed_icon_ids - existing
    log(f"  {len(needed_icon_ids)} icons needed, {len(existing)} already cached, extracting {len(to_extract)}...")

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
            # Scale to ICON_SIZE × ICON_SIZE keeping ratio (up or down), pad with transparency
            ratio = min(ICON_SIZE / img.width, ICON_SIZE / img.height)
            new_w = max(1, int(img.width * ratio))
            new_h = max(1, int(img.height * ratio))
            thumb = img.resize((new_w, new_h), Image.LANCZOS)
            canvas = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
            x = (ICON_SIZE - new_w) // 2
            y = (ICON_SIZE - new_h) // 2
            canvas.paste(thumb, (x, y))
            canvas.save(os.path.join(icons_dir, f"{icon_id}.png"))
            extracted += 1
        except Exception as e:
            pass

    log(f"  {extracted} icons extracted to data/icons/")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    i18n_index, get_text = build_i18n_index(I18N_PATH)

    jobs = extract_jobs(i18n_index, get_text)
    with open(os.path.join(OUT_DIR, "jobs.json"), "w", encoding="utf-8") as f:
        json.dump(jobs, f, ensure_ascii=False, indent=2)

    item_types = extract_item_types(i18n_index, get_text)
    with open(os.path.join(OUT_DIR, "item_types.json"), "w", encoding="utf-8") as f:
        json.dump(item_types, f, ensure_ascii=False, indent=2)

    recipes = extract_recipes(i18n_index, get_text)
    with open(os.path.join(OUT_DIR, "recipes.json"), "w", encoding="utf-8") as f:
        json.dump(recipes, f, ensure_ascii=False, indent=2)

    items = extract_items(i18n_index, get_text)
    with open(os.path.join(OUT_DIR, "items.json"), "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    extract_icons(items, recipes)

    log("Done! Data written to data/")
    log(json.dumps({
        "jobs": len(jobs),
        "itemTypes": len(item_types),
        "recipes": len(recipes),
        "items": len(items),
    }))


if __name__ == "__main__":
    main()
