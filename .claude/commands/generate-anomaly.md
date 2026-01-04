---
description: Generate anomalies. Use /anomalies 5 for 5 random anomalies, or /anomalies 3 type:gravitational for constrained generation.
argument-hint: <count> [type:<value>] [subtype:<value>] [danger:<value>] [stability:<value>] [origin:<value>]
---

# Batch Anomaly Generation

Generate multiple space anomalies using the `/anomaly` skill.

## Parse Arguments

From `$ARGUMENTS`, extract:

- **count**: First argument (required number 1-10). If missing, default to 3.
- **type**: Optional constraint passed to each /anomaly generation
- **subtype**: Optional constraint passed to each /anomaly generation
- **danger**: Optional constraint passed to each /anomaly generation
- **stability**: Optional constraint passed to each /anomaly generation
- **origin**: Optional constraint passed to each /anomaly generation

## Instructions

1. Parse count and any constraints from $ARGUMENTS
2. Generate the requested number of anomalies using the `/anomaly` skill schema and rules
3. Apply any provided constraints to all anomalies
4. If no constraints given, vary types for diversity
5. Ensure all anomaly names are unique
6. Output as a JSON array with no markdown code blocks
