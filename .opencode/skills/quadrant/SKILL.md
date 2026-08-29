---
name: quadrant
description: Generate quadrant mappings for a galaxy, dividing it into named regions (core, arms, halo) with systemId→name maps.
---

# Quadrant Generator

Generate quadrant directories and `systems.json` mapping files for a galaxy.

## Inputs

Parse parameters if given (e.g. `galaxy:vireth-shroud`, `quadrants:4`, `names:core,inner-arm,outer-arm,halo`), otherwise use sensible defaults.
Ask ONLY for what you cannot decide: which galaxy to use when several exist in `content/`.

## Procedure

1. Read the target galaxy file `content/<galaxyDirName>/galaxy.json` to get diameter, type, and coordinates.
2. Choose quadrant count and names (default 4: `core`, `inner-arm`, `outer-arm`, `halo`). For barred spirals: `core`, `bar`, `inner-arm`, `outer-arm`, `halo`.
3. For each quadrant:
   - Create directory `content/<galaxyDirName>/<quadrantName>/`
   - Build `systems.json` as an empty object `{}` (systems are added later via `/star-system` which can reference quadrant mappings)
   - Write `content/<galaxyDirName>/<quadrantName>/systems.json`
4. Optionally: if user provides a list of existing system IDs to pre-populate, add them to the appropriate quadrant's mapping based on their coordinates relative to galactic center.
5. Follow the style guide for quadrant names (lowercase, hyphenated, descriptive).
6. Run `npm run validate --all` to ensure quadrant mappings are valid JSON with correct ID formats.
7. Report: galaxy name, quadrant names, directory paths created.

## Quadrant Naming Conventions

- Spiral galaxies: `core`, `inner-arm`, `outer-arm`, `halo`
- Barred spirals: `core`, `bar`, `inner-arm`, `outer-arm`, `halo`
- Ellipticals: `core`, `inner-halo`, `outer-halo`
- Irregulars: `central`, `region-1`, `region-2`, `region-3`

## Integration with Star System Generation

When `/star-system` generates a system, it can:
- Read quadrant mappings to find which quadrant a coordinate falls in
- Add the system to that quadrant's `systems.json` mapping
- Or create systems without quadrant assignment (flat `systems/` directory)