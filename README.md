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

## Prérequis

- [Node.js 18+](https://nodejs.org/)
- [Python 3.10+](https://www.python.org/) — uniquement pour (re)générer les données
- **Dofus 3** installé sur la machine — uniquement pour (re)générer les données
- Bibliothèques Python :
  ```bash
  pip install UnityPy pillow
  ```

---

## Démarrage rapide

```bash
# 1. Installer les dépendances Node
npm install

# 2. Lancer l'application (si data/data.dcft est présent)
npm start
```

Si `data/data.dcft` est absent, l'UI affiche un bouton **Mettre à jour** qui lance l'extraction complète (voir ci-dessous).

---

## Fichier de données — `data/data.dcft`

Toutes les données du jeu (items, recettes, métiers, effets, icônes) sont regroupées dans un **fichier binaire unique** `data/data.dcft`.

- Distribué directement dans le dépôt / le build — les utilisateurs finaux n'ont **pas** besoin de Python ni du client Dofus.
- Format propriétaire : magic `DCFT` + index de sections + données compressées (zlib niveau 9) puis brouillées (XOR 8 octets rotatif).
- Les icônes (~11 000 PNG) sont chargées en mémoire au démarrage et servies via un serveur HTTP local.

### Régénérer le bundle après un patch Dofus

```bash
# Extraction depuis les assets Unity du client Dofus
python extractor/extract.py
python extractor/extract_effects.py

# Repackage en data.dcft
python extractor/bundle.py
```

Ou cliquer sur **Mettre à jour** dans l'interface (enchaîne les trois scripts et recharge les données à chaud).

---

## Persistance de la queue de craft

La liste de craft est sauvegardée automatiquement dans le dossier utilisateur Electron (`userData/queue.json`) à chaque modification. Elle est restaurée au prochain démarrage.

- **Windows** : `%APPDATA%\dofus-craft\queue.json`
- **macOS** : `~/Library/Application Support/dofus-craft/queue.json`
- **Linux** : `~/.config/dofus-craft/queue.json`

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
│           ├── jobs/            # Icônes métiers (gitignorés, extraits localement)
│           └── ui/
│               ├── stats/       # Icônes de stats pour les tooltips
│               ├── illus/       # Logo et fond d'écran
│               └── npc/         # Illustrations NPC (CSS)
├── extractor/
│   ├── extract.py               # Items, recettes, métiers, icônes → data/*.json + data/icons/
│   ├── extract_effects.py       # Effets et descriptions i18n → data/items_extra.json
│   └── bundle.py                # Repackage tout en data/data.dcft
├── data/
│   └── data.dcft                # Bundle binaire (versionné, fourni dans le dépôt)
├── build/                       # Icônes app pour electron-builder
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
├── .gitignore
├── package.json
└── README.md
```

---

## Chemins des assets Dofus (extraction uniquement)

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

## Build distributable

### Prérequis

- Dossier `build/` avec `icon.ico` (Windows), `icon.icns` (macOS), `icon.png` (Linux, 256×256 min)
- `data/data.dcft` généré

### Générer les installeurs

```bash
npm run build:win    # → dist/  (.exe NSIS + portable)
npm run build:mac    # → dist/  (.dmg x64 + arm64)
npm run build:linux  # → dist/  (.AppImage + .deb)
npm run build        # Toutes les plateformes
```

Le fichier `data/data.dcft` est automatiquement embarqué dans le build via `extraResources`. Les utilisateurs finaux n'ont besoin ni de Python ni du client Dofus.
