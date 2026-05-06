# Dofus Craft

A craft recipe calculator for **Dofus 3**. Desktop app built with Electron that reads the game's Unity assets to extract items, recipes, effects and icons, then bundles everything into a single embedded binary file.

Available in **French, English, Spanish, German and Portuguese**.

---

## Stack

| Layer | Technology |
|---|---|
| Desktop app | Electron 42 |
| UI | Vanilla JS / HTML / CSS (no framework) |
| Asset extraction | Python 3 + UnityPy + Pillow |
| Icon server | Node.js `http` (random local port) |
| Data bundle | `.dcft` format — zlib + XOR, served in memory |

---

## Quick start

```bash
# 1. Install Node dependencies
npm install

# 2. Place data/data.dcft (see below)

# 3. Run the app
npm start
```

---

## Data file — `data/data.dcft`

All game data (items, recipes, professions, effects, ~11,000 icons) is packed into a **single binary file** `data/data.dcft`.

This file is **not versioned** in the repository (too large for Git). It must be provided separately — either via GitHub releases or generated manually.

- Custom format: magic `DCFT` + section index + compressed (zlib level 9) and obfuscated (rotating 8-byte XOR) data.
- Icons are loaded into memory at startup and served through a local HTTP server.

### Generate the bundle manually

Requires **Python 3.10+**, **UnityPy**, **Pillow** and the **Dofus 3 client** installed.

```bash
pip install UnityPy pillow

python extractor/extract.py
python extractor/extract_effects.py
python extractor/bundle.py
```

The file `data/data.dcft` is then ready to use.

### Dofus asset paths

**Windows** (default):
```
%LOCALAPPDATA%\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\
```

**macOS**:
```
~/Library/Application Support/Ankama/Dofus-dofus3/Dofus_Data/StreamingAssets/
```

These paths can be configured at the top of `extractor/extract.py` and `extractor/extract_effects.py`.

---

## Craft queue persistence

The craft queue is saved automatically on every change and restored on next startup.

| OS | Location |
|---|---|
| Windows | `%APPDATA%\dofus-craft\queue.json` |
| macOS | `~/Library/Application Support/dofus-craft/queue.json` |
| Linux | `~/.config/dofus-craft/queue.json` |

Kamas prices set on ingredients are also persisted in the same folder (`prices.json`).

---

## Project structure

```
craft/
├── src/
│   ├── main.js                  # Electron main process (IPC, icon server, queue & prices)
│   ├── preload.js               # contextIsolation bridge → renderer
│   ├── bundle.js                # .dcft format reader
│   └── renderer/
│       ├── index.html
│       ├── app.js               # UI logic (search, queue, shopping list, tooltip, prices)
│       ├── i18n.js              # Static UI translations (fr, en, es, de, pt)
│       ├── style.css
│       └── assets/
│           ├── jobs/            # Profession icons (gitignored, extracted locally)
│           └── ui/
│               ├── stats/       # Stat icons for tooltips
│               ├── illus/       # Logo and background
│               └── npc/         # NPC illustrations (CSS)
├── extractor/
│   ├── extract.py               # Items, recipes, professions, icons → data/*.json + data/icons/
│   ├── extract_effects.py       # Effects and i18n descriptions → data/items_extra.json
│   └── bundle.py                # Repacks everything into data/data.dcft
├── data/
│   └── data.dcft                # Binary bundle (gitignored — must be provided separately)
├── build/                       # App icons for electron-builder
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
├── .gitignore
├── package.json
└── README.md
```

---

## Distributable build

### Prerequisites

- `data/data.dcft` present in the `data/` folder
- `build/` folder with `icon.ico` (Windows), `icon.icns` (macOS), `icon.png` (Linux, 256×256 min)

### Generate installers

```bash
npm run build:win    # → dist/  (.exe NSIS + portable)
npm run build:mac    # → dist/  (.dmg x64 + arm64)
npm run build:linux  # → dist/  (.AppImage + .deb)
npm run build        # All platforms
```

`data/data.dcft` is automatically bundled into the build via `extraResources`. End users need neither Python nor the Dofus client.
