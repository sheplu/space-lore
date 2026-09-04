---
name: generate-galaxy
description: Generate a complete galaxy with all content types in one command. Use /generate-galaxy to create a galaxy with quadrants, star systems, nebulae, clusters, SNRs, and anomalies.
---

# Galaxy Generator Pipeline

Generate a complete, validated galaxy with all content types in one command.

## Inputs

Parse parameters if given (e.g. `type:spiral diameter:80000 systems:50 nebulae:10 clusters:5 snrs:5 anomalies:5`), otherwise use sensible defaults.

Required parameters:
- `galaxyId` or `galaxy` name to use existing galaxy, or generate new one

Optional parameters (with defaults):
- `type`: spiral | barred-spiral | elliptical | irregular (default: spiral)
- `diameterLy`: galaxy diameter in light-years (default: 80000)
- `thicknessLy`: disk thickness (default: 1200)
- `starCount`: estimated stars (default: 2e11)
- `systems`: number of star systems to generate (default: 20)
- `systemsPerQuadrant`: distribution [core, inner-arm, outer-arm, halo] (default: [2, 8, 8, 2])
- `nebulae`: number of nebulae (default: 8)
- `clusters`: number of star clusters (default: 5)
- `snrs`: number of supernova remnants (default: 5)
- `anomalies`: number of anomalies (default: 5)
- `anomalyTypes`: galaxy|system|planet (default: all)
- `seed`: optional seed for reproducibility

## Procedure

### 1. Galaxy Creation
- If galaxyId provided: load existing galaxy
- Else: generate new galaxy with `/galaxy` using provided parameters
- Save to `content/<galaxyDir>/galaxy.json`
- Validate

### 2. Quadrant Generation
- Run `/quadrant` with galaxy, quadrant count (4 for spiral, 5 for barred, 3 for elliptical/irregular)
- Creates quadrant directories and `systems.json` mappings
- Validate

### 3. Star System Generation (per quadrant)
For each quadrant, generate N systems based on `systemsPerQuadrant`:
- Use `/star-system` with galaxy, coordinates within quadrant bounds
- System parameters:
  - `stars`: random 1-3 (weighted: 1=70%, 2=25%, 3=5%)
  - `planets`: 0-8 based on star type
  - `moons`: 0-5 per planet
  - `asteroids`: 0-10
  - `belts`: 0-2
  - `comets`: 0-5
  - `dwarfPlanets`: 0-3
- Assign to quadrant's `systems.json` mapping
- Validate each system

### 4. Nebula Generation
Run `/nebula` N times:
- Distribute across galaxy volume
- Types weighted: emission=30%, dark=25%, molecular-cloud=20%, reflection=15%, hii-region=5%, planetary=5%, snr=5%
- Validate each

### 5. Star Cluster Generation
Run `/cluster` N times:
- Types weighted: globular=40%, open=35%, association=20%, nuclear=5%
- Place in appropriate quadrants (globular→halo, open→arms, nuclear→core)
- Validate each

### 6. Supernova Remnant Generation
Run `/snr` N times:
- Types weighted: middle-aged=35%, old=30%, young=15%, plerion=15%, thermal-composite=5%
- Validate each

### 7. Anomaly Generation
Run `/anomaly` N times:
- Scopes: galaxy=30%, system=50%, planet=20%
- Categories: gravitational=25%, temporal=15%, energy=15%, spatial=15%, biological=10%, exotic=10%, unknown=10%
- Validate each

### 8. Final Validation
- Run `npm run validate` on entire content tree
- Report summary

## Output

Report to user:
```
Galaxy: <name> (<id>)
  Type: <type>, Diameter: <diameterLy> ly
  Stars: ~<starCount>

Quadrants: 4 (core, inner-arm, outer-arm, halo)
  Systems: <N> total (core: X, inner: Y, outer: Z, halo: W)

Star Systems: <N>
  Stars: <N> (main-seq: X, compact: Y)
  Planets: <N>, Dwarf Planets: <N>
  Moons: <N>, Asteroids: <N>
  Belts: <N>, Comets: <N>

Nebulae: <N> (emission: X, dark: Y, ...)
Clusters: <N> (globular: X, open: Y, ...)
SNRs: <N> (young: X, middle: Y, old: Z, plerion: W)
Anomalies: <N> (galaxy: X, system: Y, planet: Z)

Validation: PASS
```