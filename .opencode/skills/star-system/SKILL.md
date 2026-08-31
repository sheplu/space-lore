---
name: star-system
description: Generate a star system as a JSON object for space game worldbuilding. Use /star-system to generate a random system, or specify parameters like /star-system stars:binary or /star-system planets:5 for constrained generation.
---

# Star System Generator

Generate engine-ready lore for one star system and write it to disk.

## Inputs

Parse user parameters if given (e.g. `stars:binary`, `stars:triple`, `type:neutron-star`, `type:black-hole`, `class:M`, `planets:3`, `dwarfPlanets:2`, `asteroids:10`, `belts:1`, `comets:5`), otherwise surprise them.
Ask the user ONLY for what you cannot decide: target coordinates (or offer to invent some), and which galaxy to use when several exist in `content/`.

## Procedure

1. Read `data/taxonomy.json` — it defines star types (main-sequence, white-dwarf, neutron-star, black-hole, brown-dwarf, supergiant, hypergiant), star classes (O/B/A/F/G/K/M), planet types, moon types, asteroid types, belt types, dwarf planet types, comet types, stat ranges and the writing-style guide. These constraints are law; never contradict them.
2. Pick the parent galaxy: scan `content/*/galaxy.json`. If none exists, tell the user to create a galaxy shell first (hand-authored JSON following `src/schemas/galaxy.ts`, or ask you to draft one for them to review).
3. Choose coordinates `{x,y,z}` inside the galaxy radius (`diameterLy / 2`, distance from origin).
4. Derive the system id — NEVER invent it by hand:
   `npm run id -- sys <galaxyId> <x> <y> <z>`
5. Build the JSON object in this order:
   a) Stars first — determine star configuration:
      - Single star: one star of any type
      - Binary (`stars:binary`): two stars sharing orbitIndex 1 in `starOrbits`
      - Triple (`stars:triple`): three stars (hierarchical: close pair + distant tertiary)
      - Custom: parse `type:` for each star (e.g. `type:neutron-star,class:G`)
   b) Belts (define zones: main ~2-4 AU, kuiper ~30-50 AU, etc.)
   c) Planets + Dwarf Planets (respect belt zones, avoid overlap, orbitIndex strictly ascending shared across all star-orbiting bodies)
   d) Moons for each planet/dwarf planet (per-planet orbitIndex starting at 1)
   e) Individual asteroids (in belt zones or trojan points)
   f) Comets (high eccentricity, random inclinations)
   
   Top level: `name`, `description`, `tags`, `id`, `galaxyId`, `coordinates`, `ageBillionYears` (0.001–13.8), `stars` (1–5), `starOrbits`, `planets`, `dwarfPlanets`, `asteroids`, `belts`, `comets`, `planetNameMapping`.
   - each star: `id` (derived: `npm run id -- star <systemId> <starIndex>`), `name`, `description`, `tags`, `type` (main-sequence|white-dwarf|neutron-star|black-hole|brown-dwarf|supergiant|hypergiant), `class` (O/B/A/F/G/K/M, only for main-sequence), plus `temperatureK`, `massSol`, `radiusSol`, `luminositySol` inside that type/class's taxonomy ranges
   - `starOrbits`: array of `{index, starIds[]}` — index 1 = innermost stellar orbit; binary pairs share same index
   - each planet: `name`, `description`, `tags`, `orbitIndex`, `orbitalDistanceAu`, `type`, stats inside the type's taxonomy ranges (`radiusEarth`, `gravityG`, `meanTempC`, `atmosphereDensity`), `hasRings`, `life` not above the type's `lifeCeiling`, `moons: []`
   - each dwarf planet: `name`, `description`, `tags`, `orbitIndex`, `orbitalDistanceAu`, `type` (icy/rocky/hybrid), `radiusKm`, `gravityG`, `meanTempC`, `hasAtmosphere`, `moonCount`
   - each asteroid: `name`, `description`, `tags`, `orbitIndex`, `orbitalDistanceAu`, `type` (rocky/metallic/icy/carbonaceous), `radiusKm`, `massKg`, `albedo`, `rotationPeriodHours`
   - each belt: `name`, `description`, `tags`, `orbitIndex`, `innerEdgeAu`, `outerEdgeAu`, `type` (main/kuiper/scattered/trojan), `totalMassEarth`, `largestBodyId` (optional, references asteroid), `composition`
   - each comet: `name`, `description`, `tags`, `orbitIndex`, `semiMajorAxisAu`, `eccentricity`, `inclinationDeg`, `perihelionAu`, `aphelionAu`, `orbitalPeriodYears`, `type` (short-period/long-period/sungrazer/interstellar), `nucleusRadiusKm`, `isActive`, `dustProductionRate`, `gasProductionRate`
   - each planet id derived: `npm run id -- plnt <systemId> <orbitIndex>`
   - each dwarf planet id derived: `npm run id -- dwpl <systemId> <orbitIndex>`
   - each asteroid id derived: `npm run id -- ast <systemId> <orbitIndex>`
   - each belt id derived: `npm run id -- belt <systemId> <beltIndex>`
   - each comet id derived: `npm run id -- com <systemId> <cometIndex>`
   - each moon id derived: `npm run id -- moon <systemId> <planetOrbitIndex> <moonOrbitIndex>`
   - each star id derived: `npm run id -- star <systemId> <starIndex>` (starIndex = 1, 2, 3... in creation order)
6. Follow the style guide section of `data/taxonomy.json` for names, tone and description shape. English only.
7. Write the file to `content/<galaxyDirName>/systems/<systemId>.json`.
8. Run `npm run validate --file <written path>`:
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
9. Report to the user: system name, id, star count + types, planet roster (one line each), dwarf planets, belts, asteroid count, comet count.