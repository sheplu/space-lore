# space-lore

Constraint layer and generation workflow for space game lore: galaxies, star systems,
planets, moons, asteroids, belts, dwarf planets, comets, and anomalies. Code defines
**what exists** (taxonomies, stat ranges, style guide); an LLM skill generates
engine-ready JSON **within those constraints**.

See [PLAN.md](./PLAN.md) for design decisions.

## How it works

```
data/taxonomy.json          ← constraints exported from code (npm run export:taxonomy)
        ↓ read by
.opencode/skills/*          ← /galaxy /quadrant /star-system /planet /anomaly generate candidate JSON
        ↓ checked by
npm run validate            ← Zod schemas + cross-file reference checks
        ↓ written to
content/gal-<id>/…          ← engine-ready lore, one JSON per system
```

Every entity id is position-derived (`sha256` of its place in the galaxy → `sys-e65081c3`),
so the same location always resolves to the same identity. Content is variety-complete:
every *kind* of object is modeled, instances are generated lazily via the skills.

## Commands

| Command | Purpose |
|---|---|
| `npm run export:taxonomy` | regenerate `data/taxonomy.json` from `src/taxonomy` + `src/style` |
| `node scripts/seed-systems.mjs [--seed <s>] [--dry-run] [--prune]` | deterministically seed 24 demo systems (+ quadrant mapping) into `content/gal-1dcef06b` |
| `npm run id -- <kind> <parts...>` | derive a position-prefixed entity id (`gal`, `sys`, `star`, `plnt`, `moon`, `ast`, `belt`, `dwpl`, `com`, `anom`, `neb`, `clu`, `snr`) |
| `npm run validate -- --file <path>` | validate one content file against its schema |
| `npm run validate` | validate the whole `content/` tree incl. cross-file references |
| `npm test` | full test suite: unit → integration → e2e (`node:test`) |
| `npm run test:unit` / `test:integration` / `test:e2e` | single tier |
| `npm run test:coverage` | suite + coverage gate (≥ 80% lines over `src/`, currently ~99%) |
| `npm run typecheck` | strict TypeScript check |

## Body Types (in star systems)

| Type | Schema | Orbits | ID Prefix | OrbitIndex Namespace |
|---|---|---|---|---|
| Planet | `planet.ts` | Star | `plnt-` | Shared (1–20) |
| Dwarf Planet | `dwarf-planet.ts` | Star | `dwpl-` | Shared (1–20) |
| Asteroid | `asteroid.ts` | Star | `ast-` | Shared (1–20) |
| Belt | `belt.ts` | Star | `belt-` | Shared (1–20) |
| Comet | `comet.ts` | Star | `com-` | Shared (1–20) |
| Moon | `moon.ts` | Planet | `moon-` | Per-planet (1–N) |

## Generation skills (opencode)

- `/generate-galaxy [type:spiral] [systems:20] [nebulae:8] [clusters:5] [snrs:5] [anomalies:5]` — full pipeline: galaxy + quadrants + systems + nebulae + clusters + SNRs + anomalies
- `/galaxy [type:spiral] [diameter:100000]` — new galaxy root with directories (optional AGN core)
- `/quadrant [galaxy:vireth-shroud] [quadrants:4]` — named region mappings (core, arms, halo)
- `/star-system [stars:binary] [planets:3] [dwarfPlanets:2] [asteroids:10] [belts:1] [comets:5]` — new system with all body types, registered in its quadrant
- `/planet [type:oceanic] [life:true] [moons:2]` — insert a planet (+ optional moons) into an existing system
- `/nebula [type:emission] [danger:high]` — standalone nebula, galaxy-bound
- `/cluster [type:globular] [mass:500000]` — standalone star cluster, galaxy-bound
- `/snr [type:plerion] [age:5000]` — standalone supernova remnant, galaxy-bound
- `/anomaly [category:temporal] [danger:extreme]` — standalone anomaly, galaxy/system/planet-bound

Each skill reads `data/taxonomy.json`, derives ids via `npm run id`, writes into
`content/<galaxy-id>/…` and loops on `npm run validate` until clean. Skills never edit
schemas or taxonomy to make invalid output pass.

## Layout

```
src/
├── primitives/   # 3D light-year coordinates, position-derived ids
├── schemas/      # Zod: galaxy (+AGN), star-system (stars+planets+dwarfs+asteroids+belts+comets), star, planet, moon, asteroid, belt, dwarf-planet, comet, nebula, cluster, snr, anomaly
├── taxonomy/     # star classes O–M + star types + neutron-star/XRB/black-hole subtypes, planet/moon/asteroid/belt/dwarf-planet/comet/nebula/cluster/snr/XRB/AGN types + stat ranges
├── style/        # writing-style guide consumed by skills
├── validate/     # single-file + whole-tree validation with cross-checks (registry, report)
├── cli/          # validate.ts, id.ts (+ id-lib)
└── export/       # constraint bundle builder + taxonomy exporter
tests/
├── unit/         # pure modules in isolation
├── integration/  # fs-backed trees, cross-module checks (schemas × taxonomy)
└── e2e/          # real CLI subprocesses incl. full skill-style pipeline
apps/explorer/   # Three.js galaxy explorer (galaxy → quadrant → system → planet zoom)
scripts/         # generate-galaxy.mjs pipeline, check-coverage.mjs gate
content/         # generated lore (committed)
data/taxonomy.json # exported constraint bundle (committed)
```

## Taxonomy Categories

- **Galaxy types**: spiral, barred-spiral, elliptical, irregular (+ optional AGN core)
- **Star classes**: O, B, A, F, G, K, M (temperature, mass, radius, luminosity ranges)
- **Star types**: main-sequence, white-dwarf, neutron-star, black-hole, brown-dwarf, supergiant, hypergiant
- **Neutron-star subtypes**: normal, radio-pulsar, magnetar, x-ray-pulsar (+ XRB states: lmxb, hmxb, microquasar, ultracompact, symbiotic)
- **Black-hole subtypes**: normal, xrb
- **Planet types**: rocky, oceanic, gas-giant, ice-giant, desert, volcanic, frozen, terrestrial
- **Moon types**: rocky, icy, volcanic, captured-asteroid, shepherd
- **Asteroid types**: rocky, metallic, icy, carbonaceous
- **Belt types**: main, kuiper, scattered, trojan
- **Dwarf planet types**: icy, rocky, hybrid
- **Comet types**: short-period, long-period, sungrazer, interstellar
- **Nebula types**: emission, reflection, dark, planetary, supernova-remnant, molecular-cloud, hii-region
- **Cluster types**: globular, open, nuclear, association
- **SNR types**: young, middle-aged, old, plerion, thermal-composite
- **XRB types**: lmxb, hmxb, microquasar, ultracompact, symbiotic (donor + accretion profiles)
- **AGN types**: seyfert-1, seyfert-2, quasar, blazar, radio-galaxy, liner
- **Anomaly categories**: gravitational, temporal, energy, spatial, quantum, biological
- **Life levels**: none → microbial → simple → complex → intelligent

## Validation

- Single-file: Zod schema checks (stat ranges, required fields, format)
- Cross-file: system/nebula/cluster/snr `galaxyId` references exist and coordinates lie within the galaxy radius; galaxy-scope anomaly coordinates resolve against the enclosing `galaxy.json`
- Cross-file: anomaly `systemId`/`planetId` references exist; nebula `containedSystemIds` and cluster `memberSystemIds` resolve to system files; standalone moon `planetId` resolves to a known planet
- Cross-file: quadrant mappings reference existing systems; a system appears in at most one quadrant
- In-system: `orbitIndex` uniqueness across all star-orbiting bodies (+ per-planet for moons), `moon.planetId` matches parent, `belt.largestBodyId` references an asteroid, `planetNameMapping` keys are position-derived, `starOrbits` reference known stars

## Lore Style

- English only, evocative but concrete
- 3-sentence descriptions: appearance → history/behavior → hook/danger
- Invented proper nouns (no Earth mythology or trademarks)
- 2–6 lowercase tags per entity

Requires Node ≥ 22.18 (native TypeScript execution). Runtime dependency: zod only.