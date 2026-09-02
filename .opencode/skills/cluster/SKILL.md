---
name: cluster
description: Generate a star cluster as a JSON object for space game worldbuilding. Use /cluster to generate a random cluster, or specify parameters like /cluster type:globular or /cluster mass:500000 for constrained generation.
---

# Star Cluster Generator

Generate one star cluster as a standalone JSON file in a galaxy's clusters directory.

## Inputs

Parse parameters if given (e.g. `type:globular`, `mass:500000`, `age:12`, `metallicity:-1.5`), otherwise surprise the user.
Ask ONLY for what you cannot decide: which galaxy to use when several exist in `content/`.

## Procedure

1. Read `data/taxonomy.json` — cluster types, profiles, and style guide are law.
2. Pick the parent galaxy directory under `content/`. If none exists, direct the user to create a galaxy shell first.
3. Choose the cluster location: coordinates `{x,y,z}` within the galaxy radius (`diameterLy / 2`).
4. Derive the cluster id — NEVER invent it:
   `npm run id -- clu <galaxyId> <x> <y> <z>`
5. Build the object: `name`, `description`, `tags`, `id`, `galaxyId`, `type`, `coordinates`, `ageGyr`, `massSol`, `coreRadiusLy`, `tidalRadiusLy`, `metallicityFeH`, `concentration`, `velocityDispersionKms`, `stellarDensityCore`, `stellarDensityHalfMass`, `memberSystemIds: []`, `traits`, `observedEffects`. Draw effect flavor from the type's traits.
6. Follow the style guide for naming/tone. English only.
7. Create directory `content/<galaxyDirName>/clusters/` if it doesn't exist.
8. Write to `content/<galaxyDirName>/clusters/<clusterId>.json`.
9. Run `npm run validate --file <written path>`:
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
10. Report: name, type, id, mass, age, member count, one-line hook.

## Cluster Type Characteristics

- **globular**: Ancient (10-13.5 Gyr), metal-poor ([Fe/H] -2.5 to -0.5), spherical, 10⁴-10⁷ M☉, halo/bulge, high density, RR Lyrae, X-ray sources
- **open**: Young (<1 Gyr), metal-rich ([Fe/H] -0.5 to +0.5), irregular, 50-5000 M☉, thin disk/spiral arms, expanding, residual gas/dust
- **nuclear**: Galactic center (1-10 Gyr), extreme density (10⁶-10⁹ stars/pc³), 10⁶-10⁸ M☉, coexists with SMBH, high velocity dispersion (30-150 km/s)
- **association**: Very young (<50 Myr), unbound, 100-10⁵ M☉, OB/T/R associations, parent molecular cloud, expanding rapidly

## Default Properties by Type

| Type | Age (Gyr) | Mass (M☉) | Core Radius (ly) | Tidal Radius (ly) | [Fe/H] | Location |
|------|-----------|-----------|------------------|-------------------|--------|----------|
| globular | 12 | 200000 | 3 | 80 | -1.5 | halo |
| open | 0.1 | 1000 | 3 | 15 | +0.1 | disk |
| nuclear | 5 | 10000000 | 1 | 50 | 0.0 | nucleus |
| association | 0.01 | 10000 | 15 | 100 | 0.0 | arms |