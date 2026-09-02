---
name: snr
description: Generate a supernova remnant as a JSON object for space game worldbuilding. Use /snr to generate a random SNR, or specify parameters like /snr type:plerion or /snr age:5000 for constrained generation.
---

# Supernova Remnant Generator

Generate one supernova remnant as a standalone JSON file in a galaxy's snr directory.

## Inputs

Parse parameters if given (e.g. `type:young`, `age:5000`, `hasPulsar:true`), otherwise surprise the user.
Ask ONLY for what you cannot decide: which galaxy to use when several exist in `content/`.

## Procedure

1. Read `data/taxonomy.json` — SNR types, profiles, and style guide are law.
2. Pick the parent galaxy directory under `content/`. If none exists, direct the user to create a galaxy shell first.
3. Choose the SNR location: coordinates `{x,y,z}` within the galaxy radius (`diameterLy / 2`).
4. Derive the SNR id — NEVER invent it:
   `npm run id -- snr <galaxyId> <x> <y> <z>`
5. Build the object: `name`, `description`, `tags`, `id`, `galaxyId`, `type`, `coordinates`, `ageYr`, `radiusLy`, `expansionVelocityKms`, `temperatureK`, `luminosityXrayErgs`, `luminosityRadioErgs`, `magneticFieldMicroG`, `densityCm3`, `sweptUpMassSol`, `ejectaMassSol`, `composition`, `shockStage`, `hasPulsar`, `hasPwn`, `centralPulsarId` (if hasPulsar), `traits`, `observedEffects`, `dangerLevel`. Draw effect flavor from the type's traits.
6. Follow the style guide for naming/tone. English only.
7. Create directory `content/<galaxyDirName>/snr/` if it doesn't exist.
8. Write to `content/<galaxyDirName>/snr/<snrId>.json`.
9. Run `npm run validate --file <written path>`:
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
10. Report: name, type, id, age, radius, shock stage, pulsar/PWN status, one-line hook.

## SNR Type Characteristics

- **young**: 100-1000 yr, free-expansion, ejecta-dominated, bright X-ray lines, high velocity (2000-30000 km/s), Cas A / Tycho / Kepler analogs
- **middle-aged**: 1000-20000 yr, Sedov-Taylor, self-similar, thermal X-ray, radio shell, efficient cosmic-ray acceleration
- **old**: 20000-100000 yr, radiative phase, cooling shell, incomplete, mixing with ISM, fading X-ray, Cygnus Loop analog
- **plerion**: 100-50000 yr, pulsar wind nebula (PWN), central pulsar powering, synchrotron, torus/jet, TeV gamma-rays, Crab / Vela analogs
- **thermal-composite**: 1000-50000 yr, shell + center-filled X-ray, thermal interior + nonthermal shell, mixed morphology, cloud evaporation

## Danger Levels by Type (Default)

- young: high (intense radiation, fast shocks)
- middle-aged: moderate
- old: low (cooling, fading)
- plerion: extreme (TeV gamma-rays, relativistic particles)
- thermal-composite: moderate

## Default Properties by Type

| Type | Age (yr) | Radius (ly) | Velocity (km/s) | Shock Stage | Pulsar | PWN |
|------|----------|-------------|-----------------|-------------|--------|-----|
| young | 500 | 3 | 10000 | free-expansion | no | no |
| middle-aged | 5000 | 15 | 1000 | sedov-taylor | no | no |
| old | 50000 | 80 | 100 | radiative | no | no |
| plerion | 5000 | 5 | 2000 | plerionic | yes | yes |
| thermal-composite | 10000 | 30 | 500 | sedov-taylor | no | no |