---
name: anomaly
description: Generate a space anomaly as a JSON object for space game worldbuilding. Use /anomaly to generate a random anomaly, or specify parameters like /anomaly type:gravitational or /anomaly danger:extreme for constrained generation.
---

# Space Anomaly Generation Skill

Generate a space anomaly as a JSON object for space game worldbuilding.

## Parameters

Parse any arguments provided after `/anomaly`. Supported parameters:

- `type:<value>` - Anomaly type: gravitational, temporal, energy, spatial, matter, biological
- `subtype:<value>` - Specific subtype (must match type, see Subtypes table)
- `danger:<value>` - Danger level: benign, low, moderate, high, extreme, catastrophic
- `stability:<value>` - Stability: stable, fluctuating, unstable, volatile
- `origin:<value>` - Origin: natural, artificial, unknown

Example: `/anomaly type:gravitational subtype:wormhole danger:extreme`

## Output Schema

Generate a JSON object with these fields:

```json
{
  "name": "string (creative, evocative name)",
  "type": "gravitational | temporal | energy | spatial | matter | biological",
  "subtype": "string (from type's subtype pool)",
  "classification": "string (e.g., 'G-7 Singularity', 'T-3 Temporal Rift')",
  "extent": {
    "radius_km": "number | null (for small anomalies)",
    "radius_au": "number | null (for large anomalies)",
    "shape": "spherical | elliptical | irregular | fluctuating | ring | corridor"
  },
  "danger_level": "benign | low | moderate | high | extreme | catastrophic",
  "stability": "stable | fluctuating | unstable | volatile",
  "detectability": {
    "visual": "boolean",
    "sensor_range_km": "number",
    "signature": "string (description of sensor signature)"
  },
  "effects": {
    "proximity": ["array of 1-3 effects when nearby"],
    "contact": ["array of 1-3 effects on contact"],
    "prolonged_exposure": ["array of 1-3 effects from extended exposure"]
  },
  "origin": "natural | artificial | unknown",
  "age": "string (estimated age, e.g., '3.2 billion years', 'unknown', '47 hours')",
  "behavior": {
    "pattern": "static | drifting | orbiting | expanding | contracting | pulsing",
    "cycle": "string | null (e.g., '47-hour pulse cycle', null if no cycle)",
    "predictability": "predictable | semi-predictable | erratic | chaotic"
  },
  "phenomena": ["array of 2-4 observable phenomena"],
  "hazards": ["array of 1-3 specific hazards"],
  "opportunities": ["array of 1-3 potential benefits or uses"],
  "known_incidents": ["array of 0-2 brief historical events"],
  "description": ["array of 4 paragraphs, each 2-3 sentences"]
}
```

## Anomaly Types and Subtypes

| Type | Subtypes |
| ------ | ---------- |
| gravitational | black_hole, gravity_well, gravity_void, wormhole, gravity_lens, tidal_zone |
| temporal | time_dilation, temporal_rift, chrono_loop, temporal_echo, stasis_field, causality_fracture |
| energy | plasma_storm, radiation_field, energy_vortex, electromagnetic_dead_zone, hyperspace_bleed, stellar_remnant |
| spatial | dimensional_rift, space_fold, void_pocket, non_euclidean_zone, reality_bubble, subspace_breach |
| matter | dark_matter_concentration, exotic_matter, antimatter_pocket, quantum_foam, crystalline_formation, proto_matter |
| biological | space_organism, living_nebula, spore_cloud, hive_cluster, bio_ship_graveyard, consciousness_field |

## Classification Codes

Generate classification codes based on type and severity:

- **G-#** - Gravitational (G-1 minor to G-10 catastrophic)
- **T-#** - Temporal (T-1 minor to T-10 catastrophic)
- **E-#** - Energy (E-1 minor to E-10 catastrophic)
- **S-#** - Spatial (S-1 minor to S-10 catastrophic)
- **M-#** - Matter (M-1 minor to M-10 catastrophic)
- **B-#** - Biological (B-1 minor to B-10 catastrophic)

Higher numbers indicate greater danger/intensity. Add descriptive suffix (e.g., "G-7 Singularity", "T-4 Temporal Eddy").

## Extent Ranges

**Small anomalies (use radius_km):**

- Microscopic: 0.001 - 1 km
- Localized: 1 - 100 km
- Regional: 100 - 10,000 km
- Planetary: 10,000 - 100,000 km

**Large anomalies (use radius_au):**

- Stellar: 0.01 - 1 AU
- System: 1 - 50 AU
- Interstellar: 50+ AU

## Sensor Range Guidelines

- Benign/Low danger: 1,000 - 50,000 km detection range
- Moderate danger: 50,000 - 500,000 km detection range
- High danger: 500,000 - 5,000,000 km detection range
- Extreme/Catastrophic: 5,000,000 - 50,000,000+ km detection range

## Phenomena Pool

Select 2-4 phenomena appropriate to the anomaly type:

**Gravitational:**

- Light bending around the anomaly
- Objects accelerating without thrust
- Tidal forces causing structural stress
- Gravitational lensing of background stars
- Time dilation effects near the boundary
- Spaghettification of matter crossing threshold

**Temporal:**

- Ships appearing older/newer after passing through
- Radio signals arriving before being sent
- Visible echoes of past events
- Objects existing in multiple timeframes simultaneously
- Causality loops affecting nearby systems
- Aging/de-aging of biological matter

**Energy:**

- Electromagnetic interference patterns
- Radiation spikes at irregular intervals
- Visible plasma discharge arcs
- Sensor ghosts and false readings
- Power systems overloading or draining
- Hull ionization and corona effects

**Spatial:**

- Objects appearing larger/smaller than they are
- Navigation instruments giving contradictory readings
- Visible distortion of starfield
- Ships exiting at different locations than entered
- Impossible geometries visible within
- Subspace interference patterns

**Matter:**

- Exotic particles detectable on sensors
- Matter spontaneously changing state
- Unusual gravitational readings despite small mass
- Antimatter annihilation flashes
- Crystalline growth on exposed surfaces
- Quantum uncertainty manifesting at macro scale

**Biological:**

- Organic signatures on sensors
- Bioluminescent displays
- Electromagnetic patterns resembling neural activity
- Spores or microorganisms in surrounding space
- Pheromone-like chemical signatures
- Psychic pressure or telepathic interference

## Hazards Pool

Select 1-3 hazards appropriate to danger level and type:

**Physical:**

- Hull breach from gravitational stress
- Structural collapse from tidal forces
- Radiation exposure exceeding safe limits
- Power system overload
- Navigation system failure
- Life support compromise

**Temporal:**

- Crew aging/de-aging
- Memory loss or temporal disorientation
- Causality paradoxes
- Equipment malfunction from timeline interference
- Trapped in time loop
- Desynchronization from normal spacetime

**Biological:**

- Contamination by exotic organisms
- Psychic attack or mental influence
- Parasitic infestation
- Genetic mutation
- Crew behavioral changes
- Life support consumption by organisms

**Existential:**

- Complete ship destruction
- Crew disappearance
- Dimensional displacement
- Molecular disintegration
- Consciousness transfer/loss
- Reality breakdown

## Opportunities Pool

Select 1-3 opportunities appropriate to the anomaly:

**Scientific:**

- Unique research opportunity
- Data valuable to scientific institutions
- Chance to study rare phenomena
- Test exotic theories

**Navigational:**

- Shortcut through normal space
- Access to otherwise unreachable regions
- Strategic chokepoint control
- Emergency escape route

**Resource:**

- Exotic matter collection
- Energy harvesting potential
- Rare element concentration
- Unique material synthesis

**Strategic:**

- Natural defensive position
- Hidden base location
- Smuggling route
- Ambush point

**Other:**

- Communication with other dimensions/times
- Contact with alien intelligence
- Recovery of lost ships/personnel
- Archaeological significance

## Coherence Rules

Ensure attributes make logical sense together:

**Subtype constraints:**

- `black_hole` → danger must be "extreme" or "catastrophic", stability must be "stable"
- `antimatter_pocket` → danger must be "extreme" or "catastrophic"
- `wormhole` → shape should be "ring" or "corridor", behavior pattern "static" or "pulsing"
- `chrono_loop` → behavior predictability "predictable" or "semi-predictable"
- `consciousness_field` → origin likely "unknown" or "biological"

**Stability constraints:**

- `volatile` stability → danger must be at least "high"
- `stable` stability → behavior predictability "predictable" or "semi-predictable"
- `unstable` or `volatile` → behavior predictability "erratic" or "chaotic"

**Type-specific constraints:**

- Temporal anomalies → must include at least one temporal hazard
- Biological anomalies → behavior pattern must not be "static"
- Energy anomalies → detectability.visual usually true
- Gravitational anomalies → must affect navigation/sensors

**Effect escalation:**

- Proximity effects should be less severe than contact effects
- Contact effects should be less severe than prolonged exposure effects
- Effects should match the danger level (benign anomalies don't cause death)

**Origin constraints:**

- `artificial` origin → age typically measured in centuries or less
- `natural` origin → age typically measured in millions/billions of years
- `unknown` origin → age often "unknown" or "indeterminate"

**Detectability constraints:**

- Higher danger → larger sensor detection range
- `black_hole` → visual is true (light bending visible)
- `gravity_void` → visual is false (absence harder to detect)
- `electromagnetic_dead_zone` → sensor_range_km should be low

## Description Guidelines

The description is an array of 4 paragraphs (strings), each covering a different aspect:

**Paragraph 1 - Physical manifestation (2-3 sentences):**

- What the anomaly looks like visually
- How it appears on sensors
- Scale and presence in space

**Paragraph 2 - Behavior and effects (2-3 sentences):**

- How the anomaly acts over time
- What happens to objects/ships that approach
- Observable patterns or cycles

**Paragraph 3 - History and significance (2-3 sentences):**

- How the anomaly was discovered
- Notable incidents or encounters
- Scientific or strategic importance

**Paragraph 4 - Current status and hooks (2-3 sentences):**

- Present-day situation
- Ongoing mysteries or research
- Why travelers should care

Write in an evocative, scientific-yet-mysterious style. Balance hard science terminology with sense of wonder.

Example format:

```json
"description": [
  "First paragraph about physical manifestation...",
  "Second paragraph about behavior and effects...",
  "Third paragraph about history and significance...",
  "Fourth paragraph about current status and hooks..."
]
```

## Generation Algorithm

1. If parameters are provided, use them; otherwise randomly select type
2. Select subtype from the type's subtype pool (or use provided subtype)
3. Generate a creative, evocative name befitting the type/subtype
4. Create classification code based on type and danger level
5. Determine extent (radius and shape) appropriate to subtype
6. Apply coherence rules to determine danger_level and stability
7. Set detectability based on type and danger level
8. Generate effects array with escalating severity (proximity < contact < prolonged)
9. Determine origin and age with coherence to subtype
10. Set behavior pattern, cycle, and predictability
11. Select 2-4 phenomena from the appropriate pool
12. Select 1-3 hazards matching danger level
13. Select 1-3 opportunities
14. Generate 0-2 known incidents (brief historical events)
15. Write a 4-paragraph description array following Description Guidelines
16. Save the anomaly JSON to the `anomalies/` folder with filename being the name in kebab-case (e.g., `anomalies/void-of-echoes.json`)
17. Output the JSON object to confirm what was saved
