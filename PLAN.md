# space-lore — Plan v1

A TypeScript + Zod constraint layer that defines **what exists** in a game galaxy and
**how it is described**, used by opencode skills (`/star-system`, `/planet`, `/anomaly`)
so an LLM generates engine-ready JSON lore within strict boundaries.

## Decisions

| #  | Decision                                                                                   |
|----|--------------------------------------------------------------------------------------------|
| D1 | Consumer: game engine, JSON-first                                                           |
| D2 | Hybrid generation: code = taxonomies/ranges/style, LLM = creative fill                      |
| D3 | Stack: TypeScript executed natively by Node (type stripping), zod only runtime dep          |
| D4 | Tests: built-in `node:test` + `node:assert/strict`; devDeps: typescript + @types/node       |
| D5 | Model: `galaxy → star systems → planets`; anomalies bound to system/planet OR galaxy-level  |
| D6 | Scale: variety-complete (every *kind* modeled), instances generated lazily                  |
| D7 | Coordinates: 3D cartesian `{x,y,z}` in light-years, origin = galactic center                |
| D8 | IDs: position-derived — `sha256(position parts) → 8 hex`, prefixed `gal-`/`sys-`/`plnt-`/`anom-` |
| D9 | Constraint layer: typed taxonomies + per-type stat ranges + writing-style guide             |
| D10| Workflow: skill reads exported constraints → generates candidate JSON → `npm run validate` → fix loop → write |
| D11| Layout: `content/<galaxy-id>/…` mirrors tree; one file per system (planets embedded); galaxy-level anomalies separate |
| D12| Lore language: English                                                                      |

## Repo layout

```
space-lore/
├── PLAN.md  package.json  tsconfig.json  README.md
├── src/
│   ├── primitives/    # coords.ts, id.ts            (3D ly coords, position-derived ids)
│   ├── schemas/       # common, star, planet, star-system, anomaly, galaxy (+ index)
│   ├── taxonomy/      # star-classes, planet-types, anomaly-categories (+ index)
│   ├── style/         # guide.ts                     (naming, tone, lengths, do/don'ts)
│   ├── cli/           # validate.ts, id.ts
│   └── export/        # taxonomy.ts → data/taxonomy.json
├── data/taxonomy.json        # exported constraint bundle consumed by skills
├── content/gal-<hex>/        # galaxy.json, systems/sys-<hex>.json, anomalies/anom-<hex>.json
└── .opencode/skills/{star-system,planet,anomaly}/SKILL.md
```

## Entity schemas (Zod)

- `Coordinates3d`: finite x/y/z, light-years.
- `LoreFields`: name (3–60), description (80–2000), tags[].
- `Galaxy`: type spiral|barred-spiral|elliptical|irregular, diameterLy, thicknessLy,
  estimatedStarCount.
- `StarSystem`: stars 1–5 embedded, planets 0–20 embedded, ageBillionYears ≤ 13.8;
  refine: orbitIndex ascending + unique.
- `Star`: class O/B/A/F/G/K/M; temperatureK/massSol/radiusSol/luminositySol must fall
  inside taxonomy ranges for the declared class.
- `Planet`: orbitIndex ≥ 1, orbitalDistanceAu > 0, type from taxonomy; radiusEarth/
  gravityG/meanTempC/atmosphereDensity within type ranges; life none<microbial<simple<
  complex<intelligent not exceeding type ceiling; moonCount within type range.
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

Cross-file checks live in `validate --all`: referenced galaxy/system/planet ids exist,
system coordinates inside parent-galaxy bounds.

## Execution order

1. Scaffold (package.json, tsconfig, deps, this file)
2. Primitives: coords, deriveId (+ `id` CLI) + tests
3. Schemas + tests
4. Taxonomy + consistency tests vs schemas
5. Export script → `data/taxonomy.json`
6. Style guide module
7. Validate library + CLI + tests
8. Skills ×3
9. Seed example content through the real pipeline; `validate --all` green
10. README update; final gate: `npm test && npm run typecheck && npm run validate --all`

## Test strategy (added post-v1)

Tests live under `tests/`, split per category, all runnable via built-in `node:test`
(no test library). Coverage gate ≥ 80% lines over `src/` via
`node --test --experimental-test-coverage` + lcov parsing (`scripts/check-coverage.mjs`).

| Tier | Location | Scope |
|---|---|---|
| unit | `tests/unit/` | pure modules in isolation: coords, id derivation, id-lib aliases, schemas, taxonomy consistency, style guide, report rendering |
| integration | `tests/integration/` | several modules together, real fs in temp dirs: content-tree validation with cross-file checks, taxonomy×schema matrix, exported bundle vs disk |
| e2e | `tests/e2e/` | real subprocesses: id CLI, validate CLI (repo + synthetic cwd), full skill-style generation pipeline |

Commands: `npm run test:unit`, `test:integration`, `test:e2e`, `test` (all),
`test:coverage` (suite + gate).

