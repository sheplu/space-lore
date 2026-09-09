// Inspect model: lore + key stats for any clickable entity.
// Pure data module: no DOM, no three.js — fully unit-testable.
import type {
  Anomaly,
  Cluster,
  DwarfPlanet,
  Moon,
  Nebula,
  Planet,
  Snr,
  Star,
  StarSystem,
} from '@/types/galaxy';

export type InspectSubject =
  | { kind: 'system'; system: StarSystem }
  | { kind: 'planet'; planet: Planet; system: StarSystem }
  | { kind: 'moon'; moon: Moon; planet: Planet; system: StarSystem }
  | { kind: 'star'; star: Star; system: StarSystem }
  | { kind: 'dwarf'; dwarf: DwarfPlanet; system: StarSystem }
  | { kind: 'nebula'; nebula: Nebula }
  | { kind: 'cluster'; cluster: Cluster }
  | { kind: 'snr'; snr: Snr }
  | { kind: 'anomaly'; anomaly: Anomaly };

export type InspectAction = 'dive-system' | 'dive-planet' | 'fly-to' | 'none';

export interface InspectStat {
  label: string;
  value: string;
}

export interface InspectModel {
  title: string;
  badge: string;
  action: InspectAction;
  actionLabel: string;
  description: string;
  tags: string[];
  stats: InspectStat[];
}

function starLabel(star: Star): string {
  if (star.type === 'main-sequence') return `${star.class ?? '?'} main-sequence`;
  if (star.subtype) return `${star.type} (${star.subtype})`;
  return star.type;
}

function systemStars(system: StarSystem): string {
  if (system.stars.length === 0) return 'starless';
  return system.stars.map(starLabel).join(' + ');
}

const num = (value: number): string => value.toLocaleString('en-US');

/** Render any inspectable entity as panel-ready lore + stats. */
export function toInspectModel(subject: InspectSubject): InspectModel {
  switch (subject.kind) {
    case 'system': {
      const { system } = subject;
      const bodies =
        system.planets.length + system.dwarfPlanets.length + system.asteroids.length + system.comets.length;
      return {
        title: system.name,
        badge: 'system',
        action: 'dive-system',
        actionLabel: 'Dive in',
        description: system.description,
        tags: system.tags,
        stats: [
          { label: 'Stars', value: systemStars(system) },
          { label: 'Planets', value: String(system.planets.length) },
          { label: 'Belts', value: String(system.belts.length) },
          { label: 'Minor bodies', value: String(bodies) },
          { label: 'Age', value: `${system.ageBillionYears} Gyr` },
        ],
      };
    }
    case 'planet': {
      const { planet, system } = subject;
      return {
        title: planet.name,
        badge: `planet · ${system.name}`,
        action: 'dive-planet',
        actionLabel: 'Dive to planet',
        description: planet.description,
        tags: planet.tags,
        stats: [
          { label: 'Type', value: planet.type },
          { label: 'Orbit', value: `#${planet.orbitIndex} · ${planet.orbitalDistanceAu} AU` },
          { label: 'Radius', value: `${planet.radiusEarth} ⊕` },
          { label: 'Gravity', value: `${planet.gravityG} g` },
          { label: 'Mean temp', value: `${planet.meanTempC} °C` },
          { label: 'Life', value: planet.life },
          { label: 'Moons', value: String(planet.moons.length) },
        ],
      };
    }
    case 'moon': {
      const { moon, planet } = subject;
      return {
        title: moon.name,
        badge: `moon · ${planet.name}`,
        action: 'dive-planet',
        actionLabel: 'Dive to planet',
        description: moon.description,
        tags: moon.tags,
        stats: [
          { label: 'Type', value: moon.type },
          { label: 'Orbit', value: `#${moon.orbitIndex} · ${num(moon.orbitalDistanceKm)} km` },
          { label: 'Radius', value: `${num(moon.radiusKm)} km` },
          { label: 'Gravity', value: `${moon.gravityG} g` },
          { label: 'Atmosphere', value: moon.hasAtmosphere ? 'yes' : 'none' },
        ],
      };
    }
    case 'star': {
      const { star, system } = subject;
      return {
        title: star.name,
        badge: `star · ${system.name}`,
        action: 'none',
        actionLabel: '',
        description: star.description,
        tags: star.tags,
        stats: [
          { label: 'Type', value: starLabel(star) },
          { label: 'Temperature', value: `${num(star.temperatureK)} K` },
          { label: 'Mass', value: `${star.massSol} M☉` },
          { label: 'Radius', value: `${star.radiusSol} R☉` },
          { label: 'Luminosity', value: `${star.luminositySol} L☉` },
        ],
      };
    }
    case 'dwarf': {
      const { dwarf, system } = subject;
      return {
        title: dwarf.name,
        badge: `dwarf planet · ${system.name}`,
        action: 'none',
        actionLabel: '',
        description: dwarf.description,
        tags: dwarf.tags,
        stats: [
          { label: 'Type', value: dwarf.type },
          { label: 'Orbit', value: `#${dwarf.orbitIndex} · ${dwarf.orbitalDistanceAu} AU` },
          { label: 'Radius', value: `${num(dwarf.radiusKm)} km` },
          { label: 'Gravity', value: `${dwarf.gravityG} g` },
          { label: 'Mean temp', value: `${dwarf.meanTempC} °C` },
        ],
      };
    }
    case 'nebula': {
      const { nebula } = subject;
      return {
        title: nebula.name,
        badge: 'nebula',
        action: 'fly-to',
        actionLabel: 'Fly there',
        description: nebula.description,
        tags: nebula.tags,
        stats: [
          { label: 'Type', value: nebula.type },
          { label: 'Radius', value: `${nebula.radiusLy} ly` },
          { label: 'Mass', value: `${num(nebula.massSol)} M☉` },
          { label: 'Star formation', value: nebula.starFormationActivity },
          { label: 'Danger', value: nebula.dangerLevel },
        ],
      };
    }
    case 'cluster': {
      const { cluster } = subject;
      return {
        title: cluster.name,
        badge: 'cluster',
        action: 'fly-to',
        actionLabel: 'Fly there',
        description: cluster.description,
        tags: cluster.tags,
        stats: [
          { label: 'Type', value: cluster.type },
          { label: 'Age', value: `${cluster.ageGyr} Gyr` },
          { label: 'Mass', value: `${num(cluster.massSol)} M☉` },
          { label: 'Tidal radius', value: `${cluster.tidalRadiusLy} ly` },
          { label: 'Metallicity', value: `[Fe/H] ${cluster.metallicityFeH}` },
        ],
      };
    }
    case 'snr': {
      const { snr } = subject;
      return {
        title: snr.name,
        badge: 'remnant',
        action: 'fly-to',
        actionLabel: 'Fly there',
        description: snr.description,
        tags: snr.tags,
        stats: [
          { label: 'Type', value: snr.type },
          { label: 'Age', value: `${num(snr.ageYr)} yr` },
          { label: 'Radius', value: `${snr.radiusLy} ly` },
          { label: 'Shock stage', value: snr.shockStage },
          { label: 'Pulsar / PWN', value: `${snr.hasPulsar ? 'yes' : 'no'} / ${snr.hasPwn ? 'yes' : 'no'}` },
          { label: 'Danger', value: snr.dangerLevel },
        ],
      };
    }
    case 'anomaly': {
      const { anomaly } = subject;
      return {
        title: anomaly.name,
        badge: 'anomaly',
        action: 'fly-to',
        actionLabel: 'Fly there',
        description: anomaly.description,
        tags: anomaly.tags,
        stats: [
          { label: 'Category', value: anomaly.category },
          { label: 'Danger', value: anomaly.dangerLevel },
          { label: 'Scope', value: anomaly.location.scope },
          { label: 'Containment', value: anomaly.containmentPossible ? 'possible' : 'impossible' },
        ],
      };
    }
  }
}
