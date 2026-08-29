---
name: planet
description: Generate a planet as a JSON object for space game worldbuilding. Use /planet to generate a random planet, or specify parameters like /planet type:oceanic or /planet life:true for constrained generation.
---

# Planet Generator

Generate one planet and insert it into an EXISTING star system file.

## Inputs

Parse parameters if given (e.g. `type:oceanic`, `life:true`, `rings:true`, `moons:2`), otherwise surprise the user.
Ask ONLY for what you cannot decide: which system to extend when several exist under `content/*/systems/`.

## Procedure

1. Read `data/taxonomy.json` — planet type profiles, stat ranges and style guide are law.
2. Read the target system file `content/<galaxyDirName>/systems/<systemId>.json`. If no system exists, direct the user to `/star-system`.
3. Choose the next free orbit: `orbitIndex` must keep the array strictly ascending; `orbitalDistanceAu` must increase with orbitIndex.
4. Derive the planet id — NEVER invent it:
   `npm run id -- plnt <systemId> <orbitIndex>`
5. Build the planet object: `name`, `description`, `tags`, `id`, `orbitIndex`, `orbitalDistanceAu`, `type`, `radiusEarth`, `gravityG`, `meanTempC`, `atmosphereDensity`, `hasRings`, `life`, `moons: []`. All stats inside the chosen type's taxonomy ranges; `life` not above its `lifeCeiling`; respect requested filters (`life:true` means at least microbial).
6. Follow the style guide for naming/tone. English only.
7. Insert the planet into the file's `planets` array keeping ascending order, write the file back.
8. Run `npm run validate --file <system path>`:
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
9. If user requested `moons:N`, generate N moons for this planet:
   - For each moon index 1..N:
     - Derive moon id: `npm run id -- moon <systemId> <planetOrbitIndex> <moonOrbitIndex>`
     - Build moon object with stats from moon taxonomy (type, radiusKm, gravityG, orbitalDistanceKm, hasAtmosphere)
     - Insert into planet.moons array
   - Re-validate system file
10. Report: planet name, type, id, orbit, moon count, one-line summary.