# Feature Backlog — Space Lore Galaxy Generation

## Core Galaxy Structure (Done ✅)
- [x] Galaxy generation (`/galaxy`)
- [x] Quadrant mappings (`/quadrant`)
- [x] Star system generation (`/star-system`)
- [x] Planet generation (`/planet`)

## Celestial Bodies (Done ✅)
- [x] Stars (main-sequence O–M, white dwarfs, neutron stars, black holes, brown dwarfs, supergiants, hypergiants)
- [x] Planets (10 types)
- [x] Dwarf planets
- [x] Moons (5 types)
- [x] Asteroids (4 types)
- [x] Asteroid belts (4 types)
- [x] Comets (4 types)
- [x] Nebulae (7 types) — `/nebula`

## Natural Phenomena — Missing

### High Priority (Structure)
- [x] **Star clusters** (`/cluster`)
  - Globular clusters (ancient, halo, metal-poor, 10⁴–10⁶ stars)
  - Open clusters (young, disk, metal-rich, 10²–10⁴ stars)
  - Nuclear star clusters (galactic center)
  - Associations (very young, unbound, OB/T/R)
  - Hierarchy: Galaxy → Quadrant → Cluster → Member systems

- [ ] **Satellite galaxies** (`/satellite`)
  - Dwarf galaxies orbiting main galaxy (Magellanic Cloud analogs)
  - Own content tree: systems, quadrants, clusters, nebulae
  - Hierarchy: Galaxy → Satellite → [own structure]

- [ ] **Stellar streams** (`/stream`)
  - Tidal debris from disrupted clusters/satellites
  - Spans multiple quadrants
  - Member system references + orbital properties

### Medium Priority (Stellar Subtypes / Variants)
- [x] **Pulsars** — Rotating neutron stars with electromagnetic beams
  - Subtype of neutron star: `radio-pulsar`
  - Period, period derivative, magnetic field, beam geometry
  - Timing noise, glitches

- [x] **Magnetars** — Ultra-magnetic neutron stars (10¹⁵ G)
  - Subtype of neutron star: `magnetar`
  - SGR bursts, AXP behavior, starquakes
  - Persistent X-ray emission

- [ ] **X-ray pulsars** — Accretion-powered neutron stars in binaries
  - Subtype of neutron star: `x-ray-pulsar`
  - X-ray emission, binary companion, cyclotron lines

- [ ] **X-ray binaries** — Compact object + donor star
  - Low-mass (LMXB) / High-mass (HMXB)
  - Accretion disk, jets, state transitions
  - Microquasars

- [x] **Supernova remnants** (`/snr`) — **NEW**
  - Young SNR (free-expansion, Cas A/Tycho/Kepler)
  - Middle-aged SNR (Sedov-Taylor, self-similar)
  - Old SNR (radiative, cooling shell, Cygnus Loop)
  - Plerions / Pulsar wind nebulae (Crab/Vela, central pulsar + PWN)
  - Thermal-composite (mixed morphology, shell + center-filled X-ray)
  - Hierarchy: Galaxy → Quadrant → SNR

### Lower Priority (Galaxy-scale)
- [ ] **AGN / Quasar** — Active galactic nucleus
  - Galaxy-level property (not all galaxies)
  - SMBH + accretion disk + jet
  - Variability, luminosity classes

- [ ] **HI regions / Neutral hydrogen clouds** — 21cm emitters
  - Cold neutral medium (CNM), Warm neutral medium (WNM)
  - Pre-star-formation reservoirs

- [ ] **Superbubbles / Galactic chimneys** — Multi-SN cavities
  - Hot ionized medium (HIM) tunnels
  - Blowout into halo

- [ ] **Nuclear star cluster** — Distinct from SMBH
  - Galactic center dense cluster
  - Coexistence with SMBH

## Gameplay Layer (Not Yet — Separate Track)
- [ ] Factions / Polities (`/faction`)
- [ ] Stations / Structures (`/station`)
- [ ] FTL Routes / Trade lanes (`/route`)
- [ ] Resources / Economy (`/resource`)
- [ ] Events / History timeline (`/event`)
- [ ] Characters / NPCs (`/character`)
- [ ] Ships / Fleets (`/fleet`)

## Technical Debt
- [ ] Performance optimization for large galaxies (Option 6)
- [ ] Cross-galaxy references (multi-galaxy setups)
- [ ] Procedural name generation improvements