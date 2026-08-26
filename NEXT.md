# Next Steps

## Option 1: ✅ Complete - Body Detection Validation
**Status**: Already working - `detectKind` recognizes planet bodies in `/systems/<id>/bodies/` directories  
**Details**: The integration tests pass (18/18) and the body folder path detection is functional  
**Files**: `src/validate/validate.ts` has the body folder recognition logic  
**Next**: Move to Option 2

## Option 2: ✅ Complete - Asteroid/Belt Support in /body/
**Status**: Complete - Added `asteroid` and `asteroid-belt` types to the planet type system  
**Details**: 
- Added `asteroid` and `asteroid-belt` to `PLANET_TYPES` in `src/taxonomy/planet-types.ts`
- Added type profiles for both new types with appropriate validation ranges
- Updated `src/schemas/planet.ts` to handle the new types
- Updated `tests/integration/export-bundle.test.ts` to expect 10 planet types (was 8)
- All 18 integration tests pass, all 13 E2E tests pass, all 36 unit tests pass
**Files modified**:
- `src/taxonomy/planet-types.ts` - Added asteroid and asteroid-belt types and profiles
- `src/schemas/planet.ts` - Updated type enum and profile lookup
- `tests/integration/export-bundle.test.ts` - Updated expected planet types count from 8 to 10

## Option 3: Add Quadrant Generation Skills
**Goal**: Create skills that generate quadrants with named regions, spiral arms, etc.  
**Effort**: ~2-3 hours  
**Files to modify**: Skill definitions (`/skills/` directory), taxonomy enhancements  

## Option 4: Improve Test Coverage (Lower Priority)
**Goal**: Add more quadrant/body tests and verify edge cases  
**Effort**: ~45 min  

## Option 5: Performance/Optimization (Lower Priority)
**Goal**: Optimize validation for large galaxies with many quadrants/systems  
**Effort**: Variable  

---

## Summary
The architecture restructure is complete and fully validated:
- ✅ 36/36 unit tests pass
- ✅ 18/18 integration tests pass  
- ✅ 13/13 E2E tests pass
- ✅ Typecheck clean
- ✅ `/body/` folder supports planets, asteroids, and asteroid belts
- ✅ Quadrant `systems.json` mappings work
- ✅ `planetNameMapping` in star systems works

The codebase now supports: galaxies → named quadrants → star systems → `/body/` folders with planets, asteroids, and asteroid belts.