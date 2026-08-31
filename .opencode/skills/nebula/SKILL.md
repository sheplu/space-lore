---
name: nebula
description: Generate a nebula as a JSON object for space game worldbuilding. Use /nebula to generate a random nebula, or specify parameters like /nebula type:emission or /nebula danger:high for constrained generation.
---

# Nebula Generator

Generate one nebula as a standalone JSON file in a galaxy's nebulae directory.

## Inputs

Parse parameters if given (e.g. `type:emission`, `danger:high`, `starFormation:high`, `radius:50`), otherwise surprise the user.
Ask ONLY for what you cannot decide: which galaxy to use when several exist in `content/`.

## Procedure

1. Read `data/taxonomy.json` — nebula types, profiles, danger levels and style guide are law.
2. Pick the parent galaxy directory under `content/`. If none exists, direct the user to create a galaxy shell first.
3. Choose the nebula location: coordinates `{x,y,z}` within the galaxy radius (`diameterLy / 2`).
4. Derive the nebula id — NEVER invent it:
   `npm run id -- neb <galaxyId> <x> <y> <z>`
5. Build the object: `name`, `description`, `tags`, `id`, `galaxyId`, `type`, `coordinates`, `radiusLy`, `temperatureK`, `densityCm3`, `massSol`, `ionizationLevel`, `magneticFieldMicroG`, `composition`, `containedSystemIds: []`, `starFormationActivity`, `colorPalette`, `ageMyr` (optional), `centralObjectId` (optional), `observedEffects` (1–10 short strings), `dangerLevel`. Draw effect flavor from the type's traits; default danger from the profile unless the user overrides.
6. Follow the style guide for naming/tone. English only.
7. Create directory `content/<galaxyDirName>/nebulae/` if it doesn't exist.
7. Write to `content/<galaxyDirName>/nebulae/<nebulaId>.json`.
8. Run `npm run validate --file <written path>`:
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
9. Report: name, type, id, radius, star formation activity, one-line hook.

## Nebula Type Characteristics

- **emission**: Hot ionized gas, red/pink glow, moderate star formation, energized by O/B stars
- **reflection**: Cold dust scattering starlight, blue glow, low star formation, near young stars
- **dark**: Opaque dust lanes, blocks background light, high star formation, coldest nebulae
- **planetary**: Expanding shell from dying star, teal/green colors, central white dwarf, short-lived
- **supernova-remnant**: Expanding shockwave, X-ray/radio, contains NS/BH, cosmic ray accelerator
- **molecular-cloud**: Giant cold H2 clouds, primary star factories, extreme star formation, filamentary
- **hii-region**: Ionized by massive stars, bright H-alpha, high star formation, expanding fronts

## Danger Levels by Type (Default)

- emission: moderate
- reflection: low
- dark: low (navigation hazard from obscuration)
- planetary: low (expanding shell)
- supernova-remnant: high (radiation, shockwaves)
- molecular-cloud: moderate (density, gravitational collapse)
- hii-region: high (UV radiation, stellar winds)