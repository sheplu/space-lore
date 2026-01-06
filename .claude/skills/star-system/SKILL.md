---
name: star-system
description: Generate a star system as a JSON object for space game worldbuilding. Use /star-system to generate a random system, or specify parameters like /star-system stars:binary or /star-system planets:5 for constrained generation.
---

# Star System Generation Skill

Generate a star system as a JSON object for space game worldbuilding. This skill creates the system structure with planet and anomaly references—use `/planet` and `/anomaly` skills separately to generate full details for specific bodies.

## Parameters

Parse any arguments provided after `/star-system`. Supported parameters:

- `stars:<value>` - Star configuration: single, binary, trinary
- `planets:<number>` - Number of planets (0-12)
- `anomalies:<number>` - Number of anomalies (0-3)
- `inhabited:<boolean>` - Whether the system has inhabited worlds
- `faction:<value>` - Controlling faction or affiliation

Example: `/star-system stars:binary planets:6 inhabited:true`

## Output Schema

Generate a JSON object with these fields:

```json
{
  "name": "string (system name)",
  "designation": "string (catalog number, e.g., 'HD 219134', 'Kepler-442')",
  "location": {
    "sector": "string (galactic sector name)",
    "coordinates": "string (e.g., '47.3, -12.8, 891.2')",
    "distance_from_core": "string (e.g., '24,000 light-years')"
  },
  "stars": [
    {
      "name": "string (star name, often system name + letter)",
      "class": "O | B | A | F | G | K | M | L | T | D (white dwarf) | neutron | black_hole",
      "color": "string (blue, blue-white, white, yellow-white, yellow, orange, red, brown, etc.)",
      "mass_solar": "number (mass relative to Sol)",
      "age_billion_years": "number",
      "notes": "string (brief description or notable features)"
    }
  ],
  "planets": [
    {
      "orbital_position": "number (1 = closest to star)",
      "name": "string (planet name)",
      "type": "terrestrial | oceanic | volcanic | rocky | gas_giant | ice | desert | barren",
      "size": "tiny | small | medium | large | massive",
      "inhabited": "boolean",
      "moons": "number (0-20)",
      "notes": "string (1-2 sentences about key features or importance)"
    }
  ],
  "anomalies": [
    {
      "name": "string (anomaly name)",
      "type": "gravitational | temporal | energy | spatial | matter | biological",
      "subtype": "string (from anomaly skill subtypes)",
      "location": "string (e.g., 'outer system', 'between orbits 3-4', 'near star')",
      "notes": "string (brief description of significance)"
    }
  ],
  "asteroid_belts": [
    {
      "name": "string",
      "location": "string (e.g., 'between orbits 4-5')",
      "composition": "rocky | metallic | icy | mixed",
      "density": "sparse | moderate | dense",
      "notes": "string (mining operations, hazards, etc.)"
    }
  ],
  "stations": [
    {
      "name": "string",
      "type": "orbital | deep_space | asteroid_based | ring_station",
      "purpose": "military | trade | research | mining | colony | mixed",
      "population": "number",
      "location": "string (e.g., 'orbit of planet 3', 'asteroid belt')",
      "notes": "string"
    }
  ],
  "faction_control": {
    "primary": "string | null (controlling faction)",
    "contested": "boolean",
    "notes": "string (political situation)"
  },
  "strategic_value": "negligible | low | moderate | high | critical",
  "traffic": "none | minimal | light | moderate | heavy | major_hub",
  "history": ["array of 2-3 historical points"],
  "description": ["array of 3 paragraphs"]
}
```

## Star Classifications

| Class | Color | Temp (K) | Mass (Solar) | Notes |
| ------- | ------- | ---------- | -------------- | ------- |
| O | Blue | 30,000+ | 16-150 | Rare, short-lived, intense radiation |
| B | Blue-white | 10,000-30,000 | 2-16 | Hot, luminous, few habitable worlds |
| A | White | 7,500-10,000 | 1.4-2.1 | Bright, young stars |
| F | Yellow-white | 6,000-7,500 | 1.0-1.4 | Good for habitable worlds |
| G | Yellow | 5,200-6,000 | 0.8-1.0 | Sol-like, ideal for life |
| K | Orange | 3,700-5,200 | 0.5-0.8 | Long-lived, habitable zone close |
| M | Red | 2,400-3,700 | 0.08-0.5 | Most common, red dwarfs |
| L | Dark red/Brown | 1,300-2,400 | 0.06-0.08 | Brown dwarfs, failed stars |
| T | Magenta/Brown | 700-1,300 | <0.06 | Cool brown dwarfs |
| D | White/Blue-white | varies | 0.5-1.4 | White dwarfs (stellar remnants) |
| neutron | - | 600,000+ surface | 1.4-2 | Collapsed stellar cores |
| black_hole | - | - | 3+ | Stellar mass black holes |

## Planet Type Distribution by Star

Match planet types to stellar characteristics:

**Hot stars (O, B, A):**

- Inner planets: barren, volcanic, rocky
- Outer planets: gas_giant, ice
- Life unlikely due to radiation

**Sun-like stars (F, G):**

- Full range of planet types possible
- Habitable zone supports terrestrial, oceanic
- Life most likely

**Cool stars (K, M):**

- Habitable zone very close to star
- Tidal locking common for habitable worlds
- Ice worlds common in outer system

**Remnants (D, neutron):**

- Mostly barren, rocky
- Any former habitable worlds now dead
- May have exotic conditions

## System Architecture Patterns

**Compact systems:**

- 3-5 planets, closely spaced
- Common around M-class stars
- Short orbital periods

**Spread systems:**

- 6-10 planets, wide spacing
- Common around G, K-class stars
- Mix of rocky inner and gas outer

**Giant-dominated:**

- 1-2 massive gas giants
- May have cleared other planets
- Hot Jupiters close to star

**Binary/Trinary considerations:**

- Planets may orbit one star (S-type) or both (P-type)
- Habitable zones can be complex or chaotic
- Some orbital regions unstable

## Coherence Rules

**Star-planet relationships:**

- Hot stars (O, B, A) → few or no habitable worlds
- G, K stars → best for inhabited systems
- M stars → habitable worlds are tidally locked
- White dwarfs/neutron stars → dead systems unless artificially maintained

**Planet ordering:**

- Rocky/terrestrial planets generally inner
- Gas giants generally outer
- Ice worlds in outer reaches
- Exceptions exist (hot Jupiters, migrated worlds)

**Inhabited systems:**

- Require at least one terrestrial/oceanic planet in habitable zone
- Traffic level should match population
- Stations support inhabited worlds

**Anomaly placement:**

- Gravitational anomalies affect system dynamics
- Temporal anomalies may explain unusual features
- Too many anomalies make system unstable

**Traffic and strategic value:**

- Uninhabited systems → minimal traffic unless resources
- Trade routes → moderate to heavy traffic
- Critical resources or position → high strategic value

## History Guidelines

Generate 2-3 historical points covering:

- Discovery and initial survey
- Major events (colonization, battles, disasters)
- Current significance or recent developments

Keep each point to 1-2 sentences.

## Description Guidelines

The description is an array of 3 paragraphs:

**Paragraph 1 - Physical overview (2-3 sentences):**

- Star characteristics and appearance
- Overall system layout
- Notable physical features

**Paragraph 2 - Significance and activity (2-3 sentences):**

- Why the system matters
- Current use and traffic
- Who lives or operates here

**Paragraph 3 - Hooks and mysteries (2-3 sentences):**

- Unresolved questions or tensions
- Opportunities for visitors
- Dangers or secrets

## Generation Algorithm

1. If parameters provided, use them; otherwise randomly determine star count and type
2. Generate star(s) with appropriate classification and characteristics
3. Determine number of planets (consider star type and configuration)
4. Generate planet entries with orbital position, type, size, and notes
5. Apply coherence rules for planet distribution
6. Add anomalies if appropriate (0-2 typical, more is rare)
7. Add asteroid belts based on system architecture (0-2 typical)
8. Add stations if system is inhabited or strategically important
9. Determine faction control and strategic value
10. Set traffic level based on population and importance
11. Generate 2-3 history points
12. Write 3-paragraph description
13. Save to `star-systems/` folder with filename in kebab-case
14. Output the JSON object

## Integration with Other Skills

This skill creates **references** to planets and anomalies. To generate full details:

- Use `/planet type:<type>` to create detailed planet matching system entry
- Use `/anomaly type:<type> subtype:<subtype>` to create detailed anomaly

Example workflow:

1. Generate system: `/star-system planets:4`
2. System shows planet 2 is "oceanic, medium, inhabited"
3. Generate full planet: `/planet type:oceanic size:medium life:true`
4. Name the planet to match system entry
