# Dataset notes

The game expects three dialogue clips per day.

For content, use audio/dialogue you own or are licensed to distribute. Do not scrape and redistribute copyrighted movie dialogue/audio without permission.

A good production workflow is:

1. Build a large Telugu movie metadata list.
2. Collect candidate dialogues from permitted/licensed sources.
3. Rank candidates by recognizability and difficulty.
4. Human-review the final clips.
5. Put only approved audio into the deployed repository.
6. Generate `data/games.json`.

Difficulty can be thought of as:
- Easy: iconic line / instantly recognizable voice or context
- Hard: recognizable to regular viewers but not immediate
- Ultra Hard: obscure line, supporting character, older film, or less memorable scene
