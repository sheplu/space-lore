// Tests for the inspect model (pure data) and panel (happy-dom).
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'vitest';
import { toInspectModel, type InspectSubject } from './inspectContent';
import { InspectPanel } from './InspectPanel';

const SYSTEM = {
  id: 'sys-1',
  name: 'Emberwatch',
  description: 'A sealed system.',
  tags: ['sealed'],
  galaxyId: 'gal-0',
  coordinates: { x: 0, y: 0, z: 0 },
  ageBillionYears: 5,
  stars: [
    { id: 'star-1', name: 'Ember', description: '', tags: [], type: 'main-sequence', class: 'K', temperatureK: 4500, massSol: 0.7, radiusSol: 0.8, luminositySol: 0.2 },
  ],
  starOrbits: [],
  planets: [
    { id: 'plnt-1', name: 'Rustfall', description: 'A desert world.', tags: ['dry'], orbitIndex: 1, orbitalDistanceAu: 0.7, type: 'desert', radiusEarth: 0.9, gravityG: 0.8, meanTempC: 40, atmosphereDensity: 0.3, hasRings: false, life: 'none', moons: [] },
  ],
  dwarfPlanets: [],
  asteroids: [],
  belts: [],
  comets: [],
  planetNameMapping: {},
} as unknown as Extract<InspectSubject, { kind: 'system' }>['system'];

describe('toInspectModel', () => {
  it('summarizes a system with dive action', () => {
    const model = toInspectModel({ kind: 'system', system: SYSTEM });
    assert.equal(model.title, 'Emberwatch');
    assert.equal(model.action, 'dive-system');
    assert.match(model.stats.find((s) => s.label === 'Stars')?.value ?? '', /K main-sequence/);
  });

  it('details a planet with dive action', () => {
    const model = toInspectModel({ kind: 'planet', planet: SYSTEM.planets[0]!, system: SYSTEM });
    assert.equal(model.action, 'dive-planet');
    assert.equal(model.stats.find((s) => s.label === 'Type')?.value, 'desert');
    assert.equal(model.stats.find((s) => s.label === 'Life')?.value, 'none');
  });

  it('details a moon with dive-to-parent action', () => {
    const model = toInspectModel({
      kind: 'moon',
      moon: { id: 'moon-1', name: 'Cinder', description: '', tags: [], planetId: 'plnt-1', orbitIndex: 1, orbitalDistanceKm: 50000, type: 'rocky', radiusKm: 400, gravityG: 0.05, hasAtmosphere: false },
      planet: SYSTEM.planets[0]!,
      system: SYSTEM,
    });
    assert.equal(model.badge, 'moon · Rustfall');
    assert.equal(model.action, 'dive-planet');
  });

  it('details a star with no action', () => {
    const model = toInspectModel({ kind: 'star', star: SYSTEM.stars[0]!, system: SYSTEM });
    assert.equal(model.action, 'none');
    assert.match(model.stats.find((s) => s.label === 'Temperature')?.value ?? '', /4,500 K/);
  });

  it('details a nebula with fly-to action', () => {
    const model = toInspectModel({
      kind: 'nebula',
      nebula: { id: 'neb-1', name: 'Veil', description: '', tags: [], galaxyId: 'gal-0', type: 'dark', coordinates: { x: 0, y: 0, z: 0 }, radiusLy: 10, temperatureK: 1, densityCm3: 1, massSol: 1, ionizationLevel: 0.1, magneticFieldMicroG: 1, composition: [], containedSystemIds: [], starFormationActivity: 'high', colorPalette: [], observedEffects: [], dangerLevel: 'low' },
    });
    assert.equal(model.action, 'fly-to');
    assert.equal(model.stats.find((s) => s.label === 'Star formation')?.value, 'high');
  });

  it('details an anomaly with scope and containment', () => {
    const model = toInspectModel({
      kind: 'anomaly',
      anomaly: { id: 'anom-1', name: 'Door', description: '', tags: [], category: 'temporal', dangerLevel: 'extreme', location: { scope: 'galaxy', coordinates: { x: 0, y: 0, z: 0 } }, observedEffects: [], containmentPossible: false },
    });
    assert.equal(model.stats.find((s) => s.label === 'Scope')?.value, 'galaxy');
    assert.equal(model.stats.find((s) => s.label === 'Containment')?.value, 'impossible');
  });
});

describe('InspectPanel', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  function setup() {
    let primary = 0;
    let closed = 0;
    const panel = new InspectPanel({ onPrimary: () => primary++, onClose: () => closed++ });
    document.body.append(panel.element);
    return { panel, counts: () => ({ primary, closed }) };
  }

  it('renders lore, tags and stats on show', () => {
    const { panel } = setup();
    panel.show(toInspectModel({ kind: 'system', system: SYSTEM }));
    assert.equal(panel.isOpen(), true);
    assert.match(panel.element.textContent ?? '', /Emberwatch/);
    assert.match(panel.element.textContent ?? '', /A sealed system/);
    assert.match(panel.element.textContent ?? '', /sealed/);
    assert.match(panel.element.textContent ?? '', /K main-sequence/);
  });

  it('hides the primary button when there is no action', () => {
    const { panel } = setup();
    panel.show(toInspectModel({ kind: 'star', star: SYSTEM.stars[0]!, system: SYSTEM }));
    const btn = panel.element.querySelector('.inspect-primary') as HTMLButtonElement;
    assert.equal(btn.hidden, true);
  });

  it('routes button clicks to callbacks', () => {
    const { panel, counts } = setup();
    panel.show(toInspectModel({ kind: 'system', system: SYSTEM }));
    (panel.element.querySelector('.inspect-primary') as HTMLButtonElement).click();
    (panel.element.querySelector('.inspect-close') as HTMLButtonElement).click();
    assert.deepEqual(counts(), { primary: 1, closed: 1 });
  });

  it('tracks open state through hide', () => {
    const { panel } = setup();
    panel.show(toInspectModel({ kind: 'system', system: SYSTEM }));
    panel.hide();
    assert.equal(panel.isOpen(), false);
    assert.equal(panel.element.hidden, true);
  });
});
