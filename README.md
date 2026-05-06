# Dofus Craft

Calculateur de recettes de craft pour **Dofus 3**. Application desktop Electron qui lit les assets Unity du jeu pour extraire items, recettes, effets et icônes, puis les regroupe dans un fichier binaire embarqué.

---

## Stack

| Couche | Technologie |
|---|---|
| Application desktop | Electron 42 |
| UI | Vanilla JS / HTML / CSS (sans framework) |
| Extraction assets | Python 3 + UnityPy + Pillow |
| Serveur d'icônes | Node.js `http` (port local aléatoire) |
| Bundle de données | Format `.dcft` — zlib + XOR, servi en mémoire |

---

## Démarrage rapide

```bash
# 1. Installer les dépendances Node
npm install

# 2. Placer data/data.dcft (voir ci-dessous)

# 3. Lancer l'application
npm start
```

---

## Fichier de données — `data/data.dcft`

Toutes les données du jeu (items, recettes, métiers, effets, ~11 000 icônes) sont regroupées dans un **fichier binaire unique** `data/data.dcft`.

Ce fichier n'est **pas versionné** dans le dépôt (trop volumineux pour Git). Il doit être fourni séparément — via les releases GitHub ou généré manuellement.

- Format propriétaire : magic `DCFT` + index de sections + données compressées (zlib niveau 9) puis brouillées (XOR 8 octets rotatif).
- Les icônes sont chargées en mémoire au démarrage et servies via un serveur HTTP local.

### Générer le bundle manuellement

Nécessite **Python 3.10+**, **UnityPy**, **Pillow** et le **client Dofus 3** installé.

```bash
pip install UnityPy pillow

python extractor/extract.py
python extractor/extract_effects.py
python extractor/bundle.py
```

Le fichier `data/data.dcft` est alors prêt à l'emploi.

### Chemins des assets Dofus

**Windows** (défaut) :
```
%LOCALAPPDATA%\Ankama\Dofus-dofus3\Dofus_Data\StreamingAssets\
```

**macOS** :
```
~/Library/Application Support/Ankama/Dofus-dofus3/Dofus_Data/StreamingAssets/
```

Ces chemins sont configurables en haut de `extractor/extract.py` et `extractor/extract_effects.py`.

---

## Persistance de la queue de craft

La liste de craft est sauvegardée automatiquement à chaque modification et restaurée au prochain démarrage.

| OS | Emplacement |
|---|---|
| Windows | `%APPDATA%\dofus-craft\queue.json` |
| macOS | `~/Library/Application Support/dofus-craft/queue.json` |
| Linux | `~/.config/dofus-craft/queue.json` |

---

## Structure du projet

```
craft/
├── src/
│   ├── main.js                  # Processus principal Electron (IPC, serveur icônes, queue)
│   ├── preload.js               # Bridge contextIsolation → renderer
│   ├── bundle.js                # Lecteur du format .dcft
│   └── renderer/
│       ├── index.html
│       ├── app.js               # Logique UI (recherche, queue, shopping list, tooltip)
│       ├── style.css
│       └── assets/
│           ├── jobs/            # Icônes métiers (gitignorées, extraites localement)
│           └── ui/
│               ├── stats/       # Icônes de stats pour les tooltips
│               ├── illus/       # Logo et fond d'écran
│               └── npc/         # Illustrations NPC (CSS)
├── extractor/
│   ├── extract.py               # Items, recettes, métiers, icônes → data/*.json + data/icons/
│   ├── extract_effects.py       # Effets et descriptions i18n → data/items_extra.json
│   └── bundle.py                # Repackage tout en data/data.dcft
├── data/
│   └── data.dcft                # Bundle binaire (gitignorés — à fournir séparément)
├── build/                       # Icônes app pour electron-builder
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
├── .gitignore
├── package.json
└── README.md
```

---

## Build distributable

### Prérequis

- `data/data.dcft` présent dans le dossier `data/`
- Dossier `build/` avec `icon.ico` (Windows), `icon.icns` (macOS), `icon.png` (Linux, 256×256 min)

### Générer les installeurs

```bash
npm run build:win    # → dist/  (.exe NSIS + portable)
npm run build:mac    # → dist/  (.dmg x64 + arm64)
npm run build:linux  # → dist/  (.AppImage + .deb)
npm run build        # Toutes les plateformes
```

`data/data.dcft` est automatiquement embarqué dans le build via `extraResources`. Les utilisateurs finaux n'ont besoin ni de Python ni du client Dofus.
