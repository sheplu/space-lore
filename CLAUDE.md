# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

space-lore is a space exploration worldbuilding project focused on procedurally generating and cataloging fictional planets for narrative and game design purposes. The project uses Claude AI skills and commands to generate richly detailed planet data in JSON format.

**Current state:** Active development with 21+ generated planets in the dataset.

## Project Structure

```text
space-lore/
├── planets/              # Generated planet JSON data files
├── .claude/
│   ├── commands/         # Claude Code commands (batch operations)
│   │   └── generate-planet.md
│   └── skills/           # Claude Code skills (single operations)
│       └── planet/
│           └── SKILL.md
├── README.md
├── CLAUDE.md
└── LICENSE
```

## Build and Development Commands

This is a data-driven project with no traditional build system. Planet generation is done through Claude Code integration:

### Single Planet Generation
```bash
/planet                          # Generate a random planet
/planet type:oceanic             # Generate a specific type
/planet type:volcanic size:large # Multiple constraints
/planet type:barren life:true    # Force life presence on barren world
```

### Batch Planet Generation
```bash
/planets 5                       # Generate 5 random planets
/planets 3 type:oceanic          # Generate 3 oceanic planets
/planets 10 size:large life:true # Generate 10 large planets with life
```

## Architecture

### Planet Data Schema

Each planet JSON file follows this structure:

```json
{
  "name": "string",
  "diameter_km": "number",
  "type": "terrestrial | oceanic | volcanic | rocky | gas_giant | ice | desert | barren",
  "atmosphere": "none | thin | breathable | dense | toxic",
  "gravity_g": "number",
  "temperature": { "min": "number", "max": "number" },
  "life": {
    "present": "boolean",
    "type": "none | microbial | flora | fauna | intelligent",
    "status": "null | thriving | endangered | extinct",
    "civilization": "null | { name, tech_level, status, notes }"
  },
  "geological_features": ["array of 2-4 features"],
  "specific_features": ["array of 0-3 features"],
  "resources": ["array of 1-4 resources"],
  "description": ["array of 4 narrative paragraphs"]
}
```

### Generation Rules

The planet skill (`/.claude/skills/planet/SKILL.md`) defines coherence rules ensuring realistic planets:
- Temperature ranges correlate with planet type
- Atmosphere compatibility with planet types
- Life constraints based on atmosphere and temperature
- Gravity correlations with size and density
- Geological features match planet characteristics

### File Naming

Planet files use kebab-case naming: `Planet-Name.json` (e.g., `Void-Anchor.json`, `Ember-Vault.json`)
