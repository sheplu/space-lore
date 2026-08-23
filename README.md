# space-lore

Constraint layer and generation workflow for space game lore: galaxies, star systems,
planets and anomalies. Code defines **what exists** (taxonomies, stat ranges, style
guide); an LLM skill generates engine-ready JSON **within those constraints**.

See [PLAN.md](./PLAN.md) for design decisions.

## How it works

```
data/taxonomy.json          ← constraints exported from code (npm run export:taxonomy)
        ↓ read by
.opencode/skills/*          ← /star-system  /planet  /anomaly generate candidate JSON
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
| `npm run id -- <kind> <parts...>` | derive a position-prefixed entity id (`gal`, `sys`, `plnt`, `anom`) |
| `npm run validate --file <path>` | validate one content file against its schema |
| `npm run validate` | validate the whole `content/` tree incl. cross-file references |
| `npm test` | full test suite: unit → integration → e2e (`node:test`) |
| `npm run test:unit` / `test:integration` / `test:e2e` | single tier |
| `npm run test:coverage` | suite + coverage gate (≥ 80% lines over `src/`, currently ~99%) |
| `npm run typecheck` | strict TypeScript check |

## Generation skills (opencode)

- `/star-system [stars:N] [class:M] [planets:N]` — new system with embedded planets
- `/planet [type:oceanic] [life:true]` — insert a planet into an existing system
- `/anomaly [category:temporal] [danger:extreme]` — standalone anomaly, galaxy/system/planet-bound

Each skill reads `data/taxonomy.json`, derives ids via `npm run id`, writes into
`content/<galaxy-id>/…` and loops on `npm run validate` until clean. Skills never edit
schemas or taxonomy to make invalid output pass.

## Layout

```
src/
├── primitives/   # 3D light-year coordinates, position-derived ids
├── schemas/      # Zod: galaxy, star-system (stars+planets), anomaly
├── taxonomy/     # star classes O–M, planet types, anomaly categories + stat ranges
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

Requires Node ≥ 22.18 (native TypeScript execution). Runtime dependency: zod only.
