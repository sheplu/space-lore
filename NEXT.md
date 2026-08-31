# Next Steps

## Option 1: ✅ Complete - Body Detection Validation
**Status**: Already working - `detectKind` recognizes planet bodies in `/systems/<id>/bodies/` directories  
**Details**: The integration tests pass (18/18) and the body folder path detection is functional  
**Files**: `src/validate/validate.ts` has the body folder recognition logic  
**Next**: Move to Option 2

## Option 2: Add Asteroid/Belt Support in /body/
**Goal**: Extend the `/body/` folder to support asteroid types beyond just planets  
**New body types**: `ast-<id>` (asteroids), `belt-<id>` (asteroid belts), `moon-<id>` (moons)  
**Effort**: ~1 hour  
**Files to modify**:
- `src/taxonomy/planet-types.ts`: Add asteroid and asteroid-belt types and profiles
- `src/schemas/planet.ts`: Update to handle new types
- `tests/`: Add asteroid/belt test fixtures

## Option 3: ✅ Complete - Quadrant Generation
**Status**: Implemented for the seeded galaxy (Vireth Shroud, a spiral galaxy)  
**Details**: Created quadrant directories and `systems.json` mappings for all 4 spiral quadrants:
- `content/gal-1dcef06b/core/systems.json`
- `content/gal-1dcef06b/inner-arm/systems.json`
- `content/gal-1dcef06b/outer-arm/systems.json`
- `content/gal-1dcef06b/halo/systems.json`

Validation passes with all 9 files (galaxy, 2 anomalies, 2 systems, 4 quadrant mappings). The quadrant skill was already defined in `.opencode/skills/quadrant/SKILL.md` and the validation supports `starSystemQuadrantMapping` as a content kind.  
**Next**: Move to Option 2 or 4

## Option 4: Add Exotic Stellar Remnants (Neutron Stars, Black Holes, White Dwarfs)
**Goal**: Add unusual star types beyond main-sequence O-M classes
**New star classes**: 
- `WD` (White Dwarf) - compact, hot, Earth-sized remnant
- `NS` (Neutron Star) - extremely dense, rapid rotation, strong magnetic fields
- `BH` (Black Hole) - event horizon, no surface, accretion disk
- Binary system support already exists via multi-star systems (1-5 stars)
**Effort**: ~1-2 hours  
**Files to modify**:
- `src/taxonomy/star-classes.ts`: Add WD, NS, BH classes with stat ranges
- `src/schemas/star.ts`: Update validation
- `data/taxonomy.json`: Re-export via `npm run export:taxonomy`
- `tests/`: Add test cases for exotic stars

## Option 5: Improve Test Coverage
**Goal**: Fix the 1 failing integration test and add more quadrant/body tests  
**Effort**: ~45 min  

## Option 6: Performance/Optimization (Lower Priority)
**Goal**: Optimize validation for large galaxies with many quadrants/systems  
**Effort**: Variable