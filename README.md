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
| `npm run id -- <kind> <parts...>` | derive a position-prefixed entity id (`gal`, `sys`, `plnt`, `moon`, `ast`, `belt`, `dwpl`, `com`, `anom`) |
| `npm run validate --file <path>` | validate one content file against its schema |
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

- `/galaxy [type:spiral] [diameter:100000]` — new galaxy root with directories
- `/quadrant [galaxy:vireth-shroud] [quadrants:4]` — named region mappings (core, arms, halo)
- `/star-system [stars:binary] [planets:3] [dwarfPlanets:2] [asteroids:10] [belts:1] [comets:5]` — new system with all body types
- `/planet [type:oceanic] [life:true] [moons:2]` — insert a planet (+ optional moons) into an existing system
- `/anomaly [category:temporal] [danger:extreme]` — standalone anomaly, galaxy/system/planet-bound

Each skill reads `data/taxonomy.json`, derives ids via `npm run id`, writes into
`content/<galaxy-id>/…` and loops on `npm run validate` until clean. Skills never edit
schemas or taxonomy to make invalid output pass.

## Layout

```
src/
├── primitives/   # 3D light-year coordinates, position-derived ids
├── schemas/      # Zod: galaxy, star-system (stars+planets+dwarfs+asteroids+belts+comets), moons, anomaly
├── taxonomy/     # star classes O–M, planet/moon/asteroid/belt/dwarf-planet/comet types + stat ranges
├── style/        # writing-style guide consumed by skills
├── validate/     # single-file + whole-tree validation with cross-checks
├── cli/          # validate.ts, id.ts (+ id-lib)
└── export/       # constraint bundle builder + taxonomy exporter
tests/
├── unit/         # pure modules in isolation
├── integration/  # fs-backed trees, cross-module checks (schemas × taxonomy)
└── e2e/          # real CLI subprocesses incl. full skill-style pipeline
content/          # generated lore (committed)
data/taxonomy.json # exported constraint bundle (committed)
```

## Taxonomy Categories

- **Star classes**: O, B, A, F, G, K, M (temperature, mass, radius, luminosity ranges)
- **Planet types**: rocky, oceanic, gas-giant, ice-giant, desert, volcanic, frozen, terrestrial
- **Moon types**: rocky, icy, volcanic, captured-asteroid, shepherd
- **Asteroid types**: rocky, metallic, icy, carbonaceous
- **Belt types**: main, kuiper, scattered, trojan
- **Dwarf planet types**: icy, rocky, hybrid
- **Comet types**: short-period, long-period, sungrazer, interstellar
- **Anomaly categories**: gravitational, temporal, energy, spatial, quantum, biological
- **Life levels**: none → microbial → simple → complex → intelligent

## Validation

- Single-file: Zod schema checks (stat ranges, required fields, format)
- Cross-file: galaxy/system/planet id references exist, system coordinates within galaxy radius, moon.planetId matches parent, belt.largestBodyId references asteroid, orbitIndex uniqueness across all star-orbiting bodies
- Moon orbitIndex uniqueness per planet

## Lore Style

- English only, evocative but concrete
- 3-sentence descriptions: appearance → history/behavior → hook/danger
- Invented proper nouns (no Earth mythology or trademarks)
- 2–6 lowercase tags per entity

Requires Node ≥ 22.18 (native TypeScript execution). Runtime dependency: zod only.