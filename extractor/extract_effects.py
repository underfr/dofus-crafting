"""
Extracts item descriptions and effects (with min/max rolls) from Dofus 3 bundles.
"""
import sys, os, json, struct, re
sys.path.insert(0, os.path.dirname(__file__))
from extract import build_i18n_index, get_i18n_path, log, OUT_DIR, GAME_DATA

import UnityPy, UnityPy.config
UnityPy.config.FALLBACK_UNITY_VERSION = "6000.3.3f1"


def read_mb(path, name):
    env = UnityPy.load(path)
    for obj in env.objects:
        if obj.type.name == "MonoBehaviour":
            data = obj.read()
            if data.m_Name == name:
                return data, env
    raise RuntimeError(f"MonoBehaviour '{name}' not found in {path}")


def extract_effects_for_lang(i18n_index, get_text):
    """Extract items_extra for a given language (i18n already loaded)."""

    # ── Effect definitions ───────────────────────────────────────────────────
    mb, _ = read_mb(
        os.path.join(GAME_DATA, "data_assets_effectsdataroot.asset.bundle"),
        "EffectsDataRoot"
    )
    effect_defs = {}
    for ref in mb.references.RefIds:
        d = ref.data
        if d is None or not hasattr(d, "id"):
            continue
        desc_id = int(d.descriptionId) if isinstance(d.descriptionId, str) else d.descriptionId
        theo_id_raw = getattr(d, "theoreticalDescriptionId", "0")
        try:
            theo_id = int(theo_id_raw)
        except Exception:
            theo_id = 0

        effect_defs[d.id] = {
            "id": d.id,
            "description": get_text(i18n_index.get(desc_id, 0)) if desc_id else "",
            "theoreticalDescription": get_text(i18n_index.get(theo_id, 0)) if theo_id else "",
            "showInTooltip": bool(d.showInTooltip),
            "useDice": bool(d.useDice),
            "isInPercent": bool(getattr(d, "isInPercent", 0)),
            "characteristic": d.characteristic,
        }

    # ── Items ────────────────────────────────────────────────────────────────
    mb2, _ = read_mb(
        os.path.join(GAME_DATA, "data_assets_itemsdataroot.asset.bundle"),
        "ItemsDataRoot"
    )
    rid_map = {ref.rid: ref for ref in mb2.references.RefIds}

    items_extra = {}
    for ref in mb2.references.RefIds:
        d = ref.data
        if d is None or not hasattr(d, "id"):
            continue

        desc_id = getattr(d, "descriptionId", 0)
        if isinstance(desc_id, str):
            try:
                desc_id = int(desc_id)
            except Exception:
                desc_id = 0
        description = get_text(i18n_index.get(desc_id, 0)) if desc_id else ""

        effects = []
        for eff_ref in getattr(d, "possibleEffects", []):
            rid = getattr(eff_ref, "rid", None)
            if not rid or rid not in rid_map:
                continue
            ed = rid_map[rid].data
            if ed is None:
                continue

            effect_id = getattr(ed, "effectId", 0)
            base_effect_id = getattr(ed, "baseEffectId", effect_id)
            dice_num = getattr(ed, "diceNum", 0)
            dice_side = getattr(ed, "diceSide", 0)
            value = getattr(ed, "value", 0)

            eff_def = effect_defs.get(effect_id) or effect_defs.get(base_effect_id) or {}
            description_tmpl = eff_def.get("description", "")
            theo_tmpl = eff_def.get("theoreticalDescription", "")

            v1 = dice_num if dice_num != 0 else value
            v2 = dice_side
            is_range = v2 > 0 and v1 != v2
            tmpl = theo_tmpl or description_tmpl

            def replace_conditional(m):
                inner = m.group(1)
                if '~1~2' in inner:
                    text = re.sub(r'~\d*', '', inner).strip()
                    return (' ' + text + ' ') if is_range else ''
                return ''

            formatted = re.sub(r'\{\{([^}]+)\}\}', replace_conditional, tmpl)
            if is_range:
                formatted = formatted.replace('#1', str(v1)).replace('#2', str(v2))
            else:
                formatted = formatted.replace('#2', '').replace('#1', str(v1))
            formatted = re.sub(r'\s{2,}', ' ', formatted).strip()

            effects.append({
                "effectId": effect_id,
                "baseEffectId": base_effect_id,
                "diceNum": dice_num,
                "diceSide": dice_side,
                "value": value,
                "description": formatted or description_tmpl,
                "characteristic": eff_def.get("characteristic", 0),
                "isInPercent": eff_def.get("isInPercent", False),
            })

        if description or effects:
            items_extra[d.id] = {"description": description, "effects": effects}

    return items_extra


def main():
    i18n_index, get_text = build_i18n_index(get_i18n_path('fr'))
    items_extra = extract_effects_for_lang(i18n_index, get_text)

    with open(os.path.join(OUT_DIR, "items_extra.json"), "w", encoding="utf-8") as f:
        json.dump(items_extra, f, ensure_ascii=False, indent=2)
    log(f"  Wrote data/items_extra.json ({len(items_extra)} items)")
    log("Done.")


if __name__ == "__main__":
    main()
