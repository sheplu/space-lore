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

## Option 3: Add Quadrant Generation Skills
**Goal**: Create skills that generate quadrants with named regions, spiral arms, etc.  
**Effort**: ~2-3 hours  
**Files to modify**: Skill definitions (`/skills/` directory), taxonomy enhancements

## Option 4: Improve Test Coverage
**Goal**: Fix the 1 failing integration test and add more quadrant/body tests  
**Effort**: ~45 min  

## Option 5: Performance/Optimization (Lower Priority)
**Goal**: Optimize validation for large galaxies with many quadrants/systems  
**Effort**: Variable  

