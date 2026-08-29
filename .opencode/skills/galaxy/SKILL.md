---
name: galaxy
description: Generate a galaxy as a JSON object for space game worldbuilding. Use /galaxy to generate a random galaxy, or specify parameters like /galaxy type:barred-spiral or /galaxy diameter:100000 for constrained generation.
---

# Galaxy Generator

Generate a galaxy and write it to disk as the root of a new content tree.

## Inputs

Parse parameters if given (e.g. `type:spiral`, `diameter:100000`, `thickness:2000`, `stars:400000000000`), otherwise surprise the user.
No mandatory questions — all inputs can be randomized within sensible bounds.

## Procedure

1. Read `data/taxonomy.json` — galaxy types, style guide, and writing conventions are law.
2. Choose coordinates `{x,y,z}` for the galactic center (typically near origin `{0,0,0}` but can be offset for multi-galaxy setups).
3. Derive the galaxy id — NEVER invent it:
   `npm run id -- gal <x> <y> <z>`
4. Build the JSON object:
   - `name`: invented proper noun (see style guide)
   - `description`: 3 sentences per style guide recipe (appearance, history/behavior, hook)
   - `tags`: 2–6 lowercase tags (type, mood, scale)
   - `id`: derived from step 3
   - `type`: one of `spiral`, `barred-spiral`, `elliptical`, `irregular`
   - `diameterLy`: positive number (typical: 20000–150000)
   - `thicknessLy`: positive number ≤ diameterLy (typical: 500–5000)
   - `estimatedStarCount`: positive integer (typical: 1e10–1e12)
5. Follow the style guide section of `data/taxonomy.json` for names, tone and description shape. English only.
6. Create directory `content/<galaxyDirName>/` and subdirectories:
   - `content/<galaxyDirName>/systems/`
   - `content/<galaxyDirName>/anomalies/`
7. Write the file to `content/<galaxyDirName>/galaxy.json`.
8. Run `npm run validate --file <written path>`:
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
9. Report: galaxy name, type, id, diameter, estimated star count, one-line summary.