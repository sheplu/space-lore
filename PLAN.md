# space-lore — Plan v1

A TypeScript + Zod constraint layer that defines **what exists** in a game galaxy and
**how it is described**, used by opencode skills (`/generate-galaxy`, `/galaxy`,
`/quadrant`, `/star-system`, `/planet`, `/nebula`, `/cluster`, `/snr`, `/anomaly`)
so an LLM generates engine-ready JSON lore within strict boundaries.

## Decisions

| #  | Decision                                                                                   |
|----|--------------------------------------------------------------------------------------------|
| D1 | Consumer: game engine, JSON-first                                                           |
| D2 | Hybrid generation: code = taxonomies/ranges/style, LLM = creative fill                      |
| D3 | Stack: TypeScript executed natively by Node (type stripping), zod only runtime dep          |
| D4 | Tests: built-in `node:test` + `node:assert/strict`; devDeps: typescript + @types/node       |
| D5 | Model: `galaxy → star systems → planets`; nebulae, clusters, SNRs bound to galaxy; anomalies bound to system/planet OR galaxy-level; quadrants map systems to named regions |
| D6 | Scale: variety-complete (every *kind* modeled), instances generated lazily                  |
| D7 | Coordinates: 3D cartesian `{x,y,z}` in light-years, origin = galactic center                |
| D8 | IDs: position-derived — `sha256(position parts) → 8 hex`, prefixed `gal-`/`sys-`/`star-`/`plnt-`/`moon-`/`ast-`/`belt-`/`dwpl-`/`com-`/`anom-`/`neb-`/`clu-`/`snr-` |
| D9 | Constraint layer: typed taxonomies + per-type stat ranges + writing-style guide             |
| D10| Workflow: skill reads exported constraints → generates candidate JSON → `npm run validate` → fix loop → write |
| D11| Layout: `content/<galaxy-id>/…` mirrors tree; one file per system (planets embedded, standalone bodies under `systems/<id>/bodies/`); quadrant `<name>/systems.json` mappings; galaxy-level nebulae/clusters/anomalies/SNRs separate |
| D12| Lore language: English                                                                      |

## Repo layout

```
space-lore/
├── PLAN.md  package.json  tsconfig.json  README.md
├── src/
│   ├── primitives/    # coords.ts, id.ts            (3D ly coords, position-derived ids)
│   ├── schemas/       # common, star, planet, moon, asteroid, belt, dwarf-planet, comet,
│   │                  # star-system, nebula, cluster, snr, anomaly, galaxy (+ index)
│   ├── taxonomy/      # star-classes (+ neutron-star/XRB/black-hole subtypes),
│   │                  # planet/moon/asteroid/belt/dwarf-planet/comet/nebula/cluster/snr/xrb/agn types,
│   │                  # anomaly-categories (+ index)
│   ├── style/         # guide.ts                     (naming, tone, lengths, do/don'ts)
│   ├── validate/      # validate.ts, registry.ts, report.ts
│   ├── cli/           # validate.ts, id.ts (+ id-lib.ts)
│   └── export/        # taxonomy.ts, bundle.ts → data/taxonomy.json
├── data/taxonomy.json        # exported constraint bundle consumed by skills
├── content/gal-<hex>/        # galaxy.json, systems/sys-<hex>.json (+ bodies/),
│                             # <quadrant>/systems.json, nebulae/, clusters/, snr/, anomalies/
├── apps/explorer/            # Three.js galaxy explorer
├── scripts/                  # generate-galaxy.mjs, check-coverage.mjs
└── .opencode/skills/{generate-galaxy,galaxy,quadrant,star-system,planet,nebula,cluster,snr,anomaly}/SKILL.md
```

## Entity schemas (Zod)

- `Coordinates3d`: finite x/y/z, light-years.
- `LoreFields`: name (3–60), description (80–2000), tags[].
- `Galaxy`: type spiral|barred-spiral|elliptical|irregular, diameterLy, thicknessLy,
  estimatedStarCount, optional AGN core (seyfert-1|seyfert-2|quasar|blazar|radio-galaxy|
  liner with per-type stat ranges).
- `StarSystem`: stars 1–5 embedded, planets 0–20 embedded, ageBillionYears ≤ 13.8;
  refine: orbitIndex ascending + unique.
- `Star`: main-sequence class O/B/A/F/G/K/M; white-dwarf, neutron-star
  (subtypes radio-pulsar|magnetar|x-ray-pulsar, plus XRB states
  lmxb|hmxb|microquasar|ultracompact|symbiotic), black-hole (normal|xrb),
  brown-dwarf, supergiant, hypergiant; temperatureK/massSol/radiusSol/luminositySol
  must fall inside taxonomy ranges for the declared type/class, with subtypes
  adding their own spin/accretion/jet fields.
- `Planet`: orbitIndex ≥ 1, orbitalDistanceAu > 0, type from taxonomy; radiusEarth/
  gravityG/meanTempC/atmosphereDensity within type ranges; life none<microbial<simple<
  complex<intelligent not exceeding type ceiling; moonCount within type range.
- `Nebula` / `Cluster` / `Snr`: galaxy-bound (`galaxyId` + coordinates inside the
  galaxy radius), per-type stat ranges and profile matches (shock stage, pulsar/PWN
  flags, coreRadius < tidalRadius); nebulae list `containedSystemIds`, clusters
  `memberSystemIds`, all resolvable to system files.
- `Anomaly`: category gravitational|temporal|energy|spatial|quantum|biological,
  dangerLevel low|moderate|high|extreme, discriminated location:
  galaxy+coordinates | systemId | planetId.

## Workflow contract (skills)

1. Read `data/taxonomy.json` (taxonomies + stat ranges + style guide).
2. Ask the user for target coordinates / optional filters (`/planet type:oceanic`).
3. Compute position-derived ids with `npm run id -- <kind> <parts...>` (never invent ids).
4. Emit candidate JSON following the schema sketch above.
5. Run `npm run validate --file <path>`; fix and re-validate until clean.
6. Write to the correct `content/<galaxy-id>/…` path.
   Never edit schemas or taxonomy to make invalid output pass.

Cross-file checks live in `npm run validate` (whole tree): referenced galaxy/system/
planet ids exist, coordinates inside parent-galaxy bounds, quadrant mappings resolve
to real systems with single-quadrant membership.

## Execution order

1. Scaffold (package.json, tsconfig, deps, this file)
2. Primitives: coords, deriveId (+ `id` CLI) + tests
3. Schemas + tests
4. Taxonomy + consistency tests vs schemas
5. Export script → `data/taxonomy.json`
6. Style guide module
7. Validate library + CLI + tests
8. Skills ×9
9. Seed example content through the real pipeline; `npm run validate` green
10. README update; final gate: `npm test && npm run typecheck && npm run validate`

## Test strategy (added post-v1)

Tests live under `tests/`, split per category, all runnable via built-in `node:test`
(no test library). Coverage gate ≥ 80% lines over `src/` via
`node --test --experimental-test-coverage` + lcov parsing (`scripts/check-coverage.mjs`).

| Tier | Location | Scope |
|---|---|---|
| unit | `tests/unit/` | pure modules in isolation: coords, id derivation, id-lib aliases, schemas, taxonomy consistency, style guide, registry, report rendering |
| integration | `tests/integration/` | several modules together, real fs in temp dirs: content-tree validation with cross-file checks, taxonomy×schema matrix, exported bundle vs disk |
| e2e | `tests/e2e/` | real subprocesses: id CLI, validate CLI (repo + synthetic cwd), full skill-style generation pipeline |

Commands: `npm run test:unit`, `test:integration`, `test:e2e`, `test` (all),
`test:coverage` (suite + gate).

