---
name: star-system
description: Generate a star system as a JSON object for space game worldbuilding. Use /star-system to generate a random system, or specify parameters like /star-system stars:binary or /star-system planets:5 for constrained generation.
---

# Star System Generator

Generate engine-ready lore for one star system and write it to disk.

## Inputs

Parse user parameters if given (e.g. `stars:binary`, `planets:3`, `class:M`), otherwise surprise them.
Ask the user ONLY for what you cannot decide: target coordinates (or offer to invent some), and which galaxy to use when several exist in `content/`.

## Procedure

1. Read `data/taxonomy.json` — it defines star classes, planet types, stat ranges and the writing-style guide. These constraints are law; never contradict them.
2. Pick the parent galaxy: scan `content/*/galaxy.json`. If none exists, tell the user to create a galaxy shell first (hand-authored JSON following `src/schemas/galaxy.ts`, or ask you to draft one for them to review).
3. Choose coordinates `{x,y,z}` inside the galaxy radius (`diameterLy / 2`, distance from origin).
4. Derive the system id — NEVER invent it by hand:
   `npm run id -- sys <galaxyId> <x> <y> <z>`
5. Build the JSON object:
   - top level: `name`, `description`, `tags`, `id`, `galaxyId`, `coordinates`, `ageBillionYears` (0.001–13.8), `stars` (1–5), `planets` (0–20)
   - each star: `name`, `description`, `tags`, `class` (O/B/A/F/G/K/M) plus `temperatureK`, `massSol`, `radiusSol`, `luminositySol` inside that class's taxonomy ranges
   - each planet: `name`, `description`, `tags`, `orbitIndex` (strictly ascending), `orbitalDistanceAu` (increasing with orbitIndex), `type`, stats inside the type's taxonomy ranges (`radiusEarth`, `gravityG`, `meanTempC`, `atmosphereDensity`, `moonCount`), `hasRings`, `life` not above the type's `lifeCeiling`
   - each planet id derived: `npm run id -- plnt <systemId> <orbitIndex>`
6. Follow the style guide section of `data/taxonomy.json` for names, tone and description shape. English only.
7. Write the file to `content/<galaxyDirName>/systems/<systemId>.json`.
8. Run `npm run validate --file <written path>`:
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
9. Report to the user: system name, id, star count, planet roster (one line each).
