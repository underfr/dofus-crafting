"""
Extracts item descriptions and effects (with min/max rolls) from Dofus 3 bundles.
Outputs data/effects.json and updates data/items.json with descriptions.
"""
import sys, os, json, struct
sys.path.insert(0, os.path.dirname(__file__))
from extract import build_i18n_index, log, OUT_DIR, GAME_DATA

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


def main():
    i18n_index, get_text = build_i18n_index(
        r"C:\Users\under\AppData\Local\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\Content\I18n\fr.bin"
    )

    # ── 1. Build effect definition map: id → description template ───────────
    log("Extracting effect definitions...")
    mb, _ = read_mb(
        os.path.join(GAME_DATA, "data_assets_effectsdataroot.asset.bundle"),
        "EffectsDataRoot"
    )
    effect_defs = {}  # id → {descr, showInTooltip, useDice, isInPercent}
    for ref in mb.references.RefIds:
        d = ref.data
        if d is None or not hasattr(d, "id"): continue
        desc_id = int(d.descriptionId) if isinstance(d.descriptionId, str) else d.descriptionId
        # Also try theoreticalDescriptionId for item tooltips
        theo_id_raw = getattr(d, "theoreticalDescriptionId", "0")
        try: theo_id = int(theo_id_raw)
        except: theo_id = 0

        desc = get_text(i18n_index.get(desc_id, 0)) if desc_id else ""
        theo = get_text(i18n_index.get(theo_id, 0)) if theo_id else ""

        effect_defs[d.id] = {
            "id": d.id,
            "description": desc,
            "theoreticalDescription": theo,
            "showInTooltip": bool(d.showInTooltip),
            "useDice": bool(d.useDice),
            "isInPercent": bool(getattr(d, "isInPercent", 0)),
            "characteristic": d.characteristic,
        }
    log(f"  {len(effect_defs)} effect definitions")

    # ── 2. Build rid → ref map for items bundle ──────────────────────────────
    log("Building items rid map...")
    mb2, env2 = read_mb(
        os.path.join(GAME_DATA, "data_assets_itemsdataroot.asset.bundle"),
        "ItemsDataRoot"
    )
    rid_map = {ref.rid: ref for ref in mb2.references.RefIds}

    # ── 3. Extract descriptions + effects per item ───────────────────────────
    log("Extracting item descriptions and effects...")
    items_extra = {}  # itemId → {description, effects:[]}

    skipped_effects = 0
    for ref in mb2.references.RefIds:
        d = ref.data
        if d is None or not hasattr(d, "id"): continue

        # Description
        desc_id = getattr(d, "descriptionId", 0)
        if isinstance(desc_id, str):
            try: desc_id = int(desc_id)
            except: desc_id = 0
        description = get_text(i18n_index.get(desc_id, 0)) if desc_id else ""

        # Effects
        effects = []
        for eff_ref in getattr(d, "possibleEffects", []):
            rid = getattr(eff_ref, "rid", None)
            if not rid or rid not in rid_map:
                skipped_effects += 1
                continue
            ed = rid_map[rid].data
            if ed is None: continue

            effect_id = getattr(ed, "effectId", 0)
            base_effect_id = getattr(ed, "baseEffectId", effect_id)
            dice_num = getattr(ed, "diceNum", 0)
            dice_side = getattr(ed, "diceSide", 0)
            value = getattr(ed, "value", 0)

            # Look up description from effectId first, fallback to baseEffectId
            eff_def = effect_defs.get(effect_id) or effect_defs.get(base_effect_id) or {}
            description_tmpl = eff_def.get("description", "")
            theo_tmpl = eff_def.get("theoreticalDescription", "")

            import re

            v1 = dice_num if dice_num != 0 else value
            v2 = dice_side  # 0 = valeur fixe

            is_range = v2 > 0 and v1 != v2

            tmpl = theo_tmpl or description_tmpl

            def replace_conditional(m):
                inner = m.group(1)
                # {{~1~2 TEXT}} = afficher TEXT seulement si range
                if '~1~2' in inner:
                    text = re.sub(r'~\d*', '', inner).strip()
                    return (' ' + text + ' ') if is_range else ''
                # {{~ps}} = pluriel, {{~1 TEXT}} = si v1 != 0, etc.
                return ''

            formatted = re.sub(r'\{\{([^}]+)\}\}', replace_conditional, tmpl)

            if is_range:
                formatted = formatted.replace('#1', str(v1)).replace('#2', str(v2))
            else:
                # Valeur fixe : supprimer #2, garder #1
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
            items_extra[d.id] = {
                "description": description,
                "effects": effects,
            }

    log(f"  {len(items_extra)} items with description/effects ({skipped_effects} effects skipped)")

    # ── 4. Save ──────────────────────────────────────────────────────────────
    with open(os.path.join(OUT_DIR, "effects.json"), "w", encoding="utf-8") as f:
        json.dump(effect_defs, f, ensure_ascii=False, indent=2)
    log(f"  Wrote data/effects.json")

    with open(os.path.join(OUT_DIR, "items_extra.json"), "w", encoding="utf-8") as f:
        json.dump(items_extra, f, ensure_ascii=False, indent=2)
    log(f"  Wrote data/items_extra.json")

    log("Done.")


if __name__ == "__main__":
    main()
