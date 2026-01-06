---
description: Generate star systems. Use /star-systems 3 for 3 random systems, or /star-systems 2 stars:binary for constrained generation.
argument-hint: <count> [stars:<value>] [planets:<number>] [anomalies:<number>] [inhabited:<bool>]
---

# Batch Star System Generation

Generate multiple star systems using the `/star-system` skill.

## Parse Arguments

From `$ARGUMENTS`, extract:

- **count**: First argument (required number 1-5). If missing, default to 2.
- **stars**: Optional constraint passed to each /star-system generation
- **planets**: Optional constraint passed to each /star-system generation
- **anomalies**: Optional constraint passed to each /star-system generation
- **inhabited**: Optional constraint passed to each /star-system generation
- **faction**: Optional constraint passed to each /star-system generation

## Instructions

1. Parse count and any constraints from $ARGUMENTS
2. Generate the requested number of star systems using the `/star-system` skill schema and rules
3. Apply any provided constraints to all systems
4. If no constraints given, vary star types and sizes for diversity
5. Ensure all system names are unique
6. Output as a JSON array with no markdown code blocks
