---
name: anomaly
description: Generate a space anomaly as a JSON object for space game worldbuilding. Use /anomaly to generate a random anomaly, or specify parameters like /anomaly type:gravitational or /anomaly danger:extreme for constrained generation.
---

# Anomaly Generator

Generate one space anomaly as a standalone JSON file.

## Inputs

Parse parameters if given (e.g. `category:temporal`, `danger:extreme`, `bound:planet`), otherwise surprise the user.
Ask ONLY for what you cannot decide: which galaxy to use when several exist, and — for system/planet-bound anomalies — the target system or planet.

## Procedure

1. Read `data/taxonomy.json` — anomaly categories, danger levels and style guide are law.
2. Pick the parent galaxy directory under `content/`. If none exists, direct the user to create a galaxy shell first.
3. Choose the location scope:
   - `galaxy`: free-floating; needs coordinates within the galaxy radius (`diameterLy / 2`)
   - `system`: bound to an existing system (`systemId` must exist in content)
   - `planet`: bound to an existing planet (`planetId` must exist inside some system file)
4. Derive the anomaly id — NEVER invent it:
   - galaxy scope: `npm run id -- anom <galaxyId> <x> <y> <z>`
   - system scope: `npm run id -- anom <systemId>`
   - planet scope: `npm run id -- anom <planetId>`
5. Build the object: `name`, `description`, `tags`, `id`, `category`, `dangerLevel`, `location` (discriminated on `scope`: `galaxy|system|planet`), `observedEffects` (1–10 short strings), `containmentPossible`. Draw effect flavor from the category's `effectHints`; default danger from the profile unless the user overrides.
6. Follow the style guide for naming/tone. English only.
7. Write to `content/<galaxyDirName>/anomalies/<anomalyId>.json`.
8. Run `npm run validate --all` (cross-file references matter here):
   - on failure, fix YOUR OUTPUT (never schemas, never taxonomy) and re-validate until clean
9. Report: name, category, danger level, location, one-line hook.
