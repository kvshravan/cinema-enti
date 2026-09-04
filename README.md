# Cinema Enti? — Dialogue MVP

A lightweight daily Telugu movie guessing game built as a static site.

## What changed in this version

Each day has THREE separate difficulty modes:

- Easy — highly recognizable dialogue
- Hard — less obvious dialogue
- Ultra Hard — deep-cut dialogue

Each mode has 6 attempts and can reveal actor/year/director clues as the player progresses.

Player progress is stored locally in `localStorage`; there is no backend or account system.

## Run locally

Because browsers may block `fetch()` from a `file://` URL, run a tiny local server:

```bash
python -m http.server 8000
```

Then open:

http://localhost:8000

## Add real audio

Put your legally usable/licensed audio clips under `audio/` and update the paths in `data/games.json`.

The ZIP intentionally does not contain copyrighted movie dialogue/audio.

## Generate data

Edit `games.csv` and run:

```bash
python scripts/generate_games.py
```

## Suggested next upgrades

1. Progressive audio duration (e.g. 1s → 2s → 4s → full)
2. Telugu + English answer aliases
3. Daily streak
4. Shareable result grid
5. Timer / score
6. GitHub Pages deployment workflow
7. Dataset editor/generator
8. Separate audio clips for Easy/Hard/Ultra Hard
