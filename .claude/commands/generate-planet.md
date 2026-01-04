---
description: Generate planet. Use /planets 5 for 5 random planets, or /planets 3 type:oceanic for constrained generation.
argument-hint: <count> [type:<value>] [size:<value>] [life:<bool>]
---

# Batch Planet Generation

Generate multiple planets using the `/planet` skill.

## Parse Arguments

From `$ARGUMENTS`, extract:

- **count**: First argument (required number 1-10). If missing, default to 3.
- **type**: Optional constraint passed to each /planet generation
- **size**: Optional constraint passed to each /planet generation
- **life**: Optional constraint passed to each /planet generation

## Instructions

1. Parse count and any constraints from $ARGUMENTS
2. Generate the requested number of planets using the `/planet` skill schema and rules
3. Apply any provided constraints to all planets
4. If no constraints given, vary types and sizes for diversity
5. Ensure all planet names are unique
6. Output as a JSON array with no markdown code blocks
