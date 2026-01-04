---
name: planet
description: Generate a planet as a JSON object for space game worldbuilding. Use /planet to generate a random planet, or specify parameters like /planet type:oceanic or /planet life:true for constrained generation.
---

# Planet Generation Skill

Generate a planet as a JSON object for space game worldbuilding.

## Parameters

Parse any arguments provided after `/planet`. Supported parameters:

- `type:<value>` - Planet type: terrestrial, oceanic, volcanic, rocky, gas_giant, ice, desert, barren
- `size:<value>` - Planet size category for diameter range: tiny, small, medium, large, massive
- `life:<boolean>` - Force life presence: true/false

Example: `/planet type:oceanic size:large life:true`

## Output Schema

Generate a JSON object with these fields:

```json
{
  "name": "string (creative space-themed name)",
  "diameter_km": "number (planet diameter in kilometers)",
  "type": "terrestrial | oceanic | volcanic | rocky | gas_giant | ice | desert | barren",
  "atmosphere": "none | thin | breathable | dense | toxic",
  "gravity_g": "number (surface gravity as Earth multiplier, e.g., 1.0 = Earth)",
  "temperature": {
    "min": "number (minimum surface temperature in Celsius)",
    "max": "number (maximum surface temperature in Celsius)"
  },
  "life": {
    "present": "boolean",
    "type": "none | microbial | flora | fauna | intelligent",
    "status": "null (if no life) | thriving | endangered | extinct",
    "civilization": "null or civilization object if intelligent life"
  },
  "geological_features": ["array of 2-4 natural planetary features"],
  "specific_features": ["array of 0-3 artificial structures, anomalies, or points of interest"],
  "resources": ["1-4 resources from the resource pool"],
  "description": ["array of 4 paragraphs, each 2-3 sentences"]
}
```

### Civilization Object (when life.type is "intelligent")

```json
{
  "name": "string (civilization name)",
  "tech_level": "primitive | bronze_age | iron_age | industrial | atomic | space_age | interstellar | transcendent",
  "status": "thriving | declining | remnant | extinct",
  "notes": "string (brief description of the civilization)"
}
```

## Diameter Ranges

- **tiny**: 400 - 2,000 km (moon-sized)
- **small**: 2,000 - 6,000 km (Mars-sized)
- **medium**: 6,000 - 15,000 km (Earth-sized)
- **large**: 15,000 - 60,000 km (Neptune-sized)
- **massive**: 60,000 - 150,000 km (Jupiter-sized, gas giants)

## Temperature Ranges (Celsius)

- **frozen**: -220 to -80
- **cold**: -80 to -20
- **temperate**: -20 to 40
- **hot**: 40 to 150
- **scorching**: 150 to 500+

## Gravity Ranges (Earth = 1.0g)

Gravity should correlate with planet size and density:

- **tiny** (400-2,000 km): 0.02 - 0.15g (Moon ~0.16g)
- **small** (2,000-6,000 km): 0.15 - 0.5g (Mars ~0.38g)
- **medium** (6,000-15,000 km): 0.6 - 1.4g (Earth = 1.0g)
- **large** (15,000-60,000 km): 0.9 - 1.5g (Neptune ~1.14g)
- **massive/gas_giant** (60,000-150,000 km): 2.0 - 3.0g (Jupiter ~2.53g)

Dense rocky/metallic planets can have higher gravity for their size. Gas giants have high gravity despite low density due to sheer mass.

## Geological Feature Pool

Select 2-4 natural features appropriate to the planet type for `geological_features`:

**Terrain & Geology:**

- Massive canyon systems
- Towering mountain ranges
- Active supervolcanoes
- Crystal cavern networks
- Tectonic rift valleys
- Magnetic pole anomalies
- Exposed planetary core
- Geothermal vent fields

**Impact & Cosmic (natural):**

- Ancient meteor crater
- Orbital debris ring
- Asteroid belt proximity
- Binary sunset (multiple suns)
- Tidally locked hemisphere

**Hydrological:**

- Subterranean ocean
- Perpetual storm systems
- Acid rain regions
- Frozen methane lakes
- Bioluminescent seas
- Planet-spanning hurricane

**Barren/Desolate:**

- Dust seas stretching to horizon
- Impact-scarred wastelands
- Solar wind erosion patterns
- Dead riverbeds or ocean basins
- Petrified remnants of former biosphere
- Glass plains from ancient cataclysm

## Specific Feature Pool

Select 0-3 artificial structures, anomalies, or points of interest for `specific_features`. These are optional—not every planet needs them:

**Artificial/Ruins:**

- Abandoned mining complex
- Ancient alien ruins
- Orbital defense platforms (active or derelict)
- Terraforming equipment (functional or failed)
- Monolithic structures of unknown origin
- Buried megastructure
- Derelict space station in orbit
- Colony settlement (active, abandoned, or destroyed)

**Crash Sites & Wrecks:**

- Starship crash site (colony ship, warship, freighter)
- Escape pod debris field
- Satellite graveyard

**Anomalies:**

- Gravity wells
- Temporal distortion zones
- Radiation hotspots
- Exotic matter deposits
- Signal of unknown origin
- Spatial rifts or wormhole remnants

**Points of Interest:**

- Research outpost
- Pirate hideout
- Smuggler cache
- Automated beacon (distress, navigation, or unknown purpose)
- Quarantine zone

## Coherence Rules

Ensure attributes make logical sense together:

**Temperature constraints:**

- `volcanic` type → hot to scorching range (40°C to 500°C)
- `ice` type → frozen to cold range (-220°C to -20°C)
- `desert` type → extreme ranges (hot days, cold nights possible)
- `barren` type → any range depending on stellar distance (typically extreme)

**Atmosphere constraints:**

- `gas_giant` type → `dense` or `toxic` atmosphere
- `rocky` type → typically `none` or `thin`
- `oceanic` type → `breathable` or `dense` atmosphere
- `barren` type → `none` or `thin` (dead worlds, no atmospheric retention)

**Life constraints:**

- If `life.present` is false → `life.type` must be "none" and `life.status` must be null
- If `life.present` is true → `life.status` must be "thriving", "endangered", or "extinct"
- `none` or `toxic` atmosphere → only microbial life possible (extremophiles)
- `breathable` atmosphere → any life type possible
- `frozen` or `scorching` temperatures → limits complex life
- `barren` type → typically no life; may have microbial extremophiles or extinct civilizations
- Extinct civilizations can exist on now-hostile worlds (conditions changed)

**Gravity/Size constraints:**

- tiny/small diameter → 0.02 - 0.5g
- medium diameter → 0.6 - 1.4g
- large diameter → 0.9 - 1.5g
- massive diameter / gas_giant → 2.0 - 3.0g
- Dense metallic cores can increase gravity beyond typical range

**Geological feature constraints:**

- Match geological features to planet type (no "frozen lakes" on volcanic worlds)
- Select 2-4 geological features that create a coherent natural environment

**Specific feature constraints:**

- Specific features are optional (0-3); not every planet needs artificial or anomalous elements
- Ruins/artificial features imply past or present intelligent life
- Starship crash sites should have a brief story hook
- Anomalies should feel mysterious and unexplained
- Multiple specific features should relate to each other when possible (e.g., ruins + signal of unknown origin)

## Resource Pool

Select 1-4 appropriate resources based on planet type:

- **Common:** water, iron, silicon, carbon, nitrogen
- **Industrial:** titanium, copper, aluminum, uranium, helium-3
- **Rare:** platinum, exotic matter, dark crystals, antimatter
- **Organic:** biomass, rare flora, medicinal compounds
- **Energy:** geothermal, solar potential, fusion fuel

## Description Guidelines

The description is an array of 4 paragraphs (strings), each covering a different aspect:

**Paragraph 1 - Physical environment (2-3 sentences):**

- Dominant landscapes, colors, and sensory details
- Weather patterns, lighting conditions, sky appearance
- Scale and grandeur of notable features

**Paragraph 2 - Atmosphere and mood (2-3 sentences):**

- The feeling of being on this world
- Sounds, smells, or other sensory experiences
- Time of day variations or seasonal changes

**Paragraph 3 - History and mystery (2-3 sentences):**

- Hints at the planet's past
- Unexplained phenomena or lingering questions
- What draws visitors or keeps them away

**Paragraph 4 - Stakes and hooks (2-3 sentences):**

- Why this planet matters to travelers
- Dangers, opportunities, or secrets
- Unresolved tensions or coming changes

Write in an evocative, literary style. Show, don't tell. Create a sense of place that makes readers want to explore.

Example format:

```json
"description": [
  "First paragraph about physical environment...",
  "Second paragraph about atmosphere and mood...",
  "Third paragraph about history and mystery...",
  "Fourth paragraph about stakes and hooks..."
]
```

## Instructions

1. If parameters are provided, use them; otherwise randomly select type and size
2. Generate diameter within the appropriate range for size category
3. Apply coherence rules to determine compatible attributes
4. Generate temperature min/max appropriate to planet type
5. Determine life presence and type (include civilizations when appropriate)
6. Select 2-4 geological features that create a coherent natural environment
7. Select 0-3 specific features (artificial/anomalies/points of interest) that add narrative depth—these are optional
8. Select appropriate resources based on planet type
9. Write a 4-paragraph description array following the Description Guidelines above
10. Save the planet JSON to the `planets/` folder with the filename being the planet name in kebab-case (e.g., `planets/nova-prime.json`)
11. Output the JSON object to confirm what was saved
