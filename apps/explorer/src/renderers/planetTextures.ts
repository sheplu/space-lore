// Shared procedural planet textures — seeded per body id so every planet
// renders identically at every zoom level, generated lazily on demand and
// cached with an LRU cap so texture memory stays bounded.
import * as THREE from 'three';

export type PlanetTextureType =
  | 'rocky'
  | 'oceanic'
  | 'gas-giant'
  | 'ice-giant'
  | 'desert'
  | 'volcanic'
  | 'frozen'
  | 'terrestrial';

const TEX_W = 256;
const TEX_H = 128;

/** Bounded texture cache: one canvas texture per body, LRU-evicted. */
const textureCache = new Map<string, THREE.CanvasTexture>();
const MAX_CACHED_TEXTURES = 24;

function cacheGet(key: string): THREE.CanvasTexture | null {
  const tex = textureCache.get(key);
  if (!tex) return null;
  // Refresh LRU order.
  textureCache.delete(key);
  textureCache.set(key, tex);
  return tex;
}

function cacheSet(key: string, tex: THREE.CanvasTexture): void {
  while (textureCache.size >= MAX_CACHED_TEXTURES) {
    const oldest = textureCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    const old = textureCache.get(oldest);
    textureCache.delete(oldest);
    old?.dispose();
  }
  textureCache.set(key, tex);
}

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value noise in [0,1]. */
function valueNoise(width: number, height: number, cells: number, rand: () => number, octaves = 4): Float32Array {
  const data = new Float32Array(width * height);
  let amplitude = 1;
  let total = 0;
  let freq = cells;
  for (let o = 0; o < octaves; o++) {
    const gw = freq + 1;
    const gh = Math.max(2, Math.floor(freq * (height / width)) + 1);
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    for (let y = 0; y < height; y++) {
      const gy = (y / height) * (gh - 1);
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < width; x++) {
        const gx = (x / width) * (gw - 1);
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const v00 = grid[y0 * gw + x0] ?? 0;
        const v10 = grid[y0 * gw + Math.min(x0 + 1, gw - 1)] ?? 0;
        const v01 = grid[Math.min(y0 + 1, gh - 1) * gw + x0] ?? 0;
        const v11 = grid[Math.min(y0 + 1, gh - 1) * gw + Math.min(x0 + 1, gw - 1)] ?? 0;
        const top = v00 + (v10 - v00) * sx;
        const bottom = v01 + (v11 - v01) * sx;
        data[y * width + x] = (data[y * width + x] ?? 0) + (top + (bottom - top) * sy) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.5;
    freq *= 2;
  }
  for (let i = 0; i < data.length; i++) data[i] = (data[i] ?? 0) / total;
  return data;
}

function canvasTexture(paint: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  paint(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function paintTerrain(
  ctx: CanvasRenderingContext2D,
  noise: Float32Array,
  detail: Float32Array,
  ocean: [number, number, number],
  land: [[number, number, number], [number, number, number]],
  landThreshold: number,
  clouds: boolean,
  iceCaps: boolean,
): void {
  const img = ctx.createImageData(TEX_W, TEX_H);
  for (let y = 0; y < TEX_H; y++) {
    const lat = Math.abs(y / TEX_H - 0.5) * 2;
    for (let x = 0; x < TEX_W; x++) {
      const i = y * TEX_W + x;
      const n = (noise[i] ?? 0.5) + ((detail[i] ?? 0.5) - 0.5) * 0.35;
      let r: number;
      let g: number;
      let b: number;
      if (n > landThreshold) {
        const t = Math.min(1, (n - landThreshold) * 3);
        r = land[0][0] + (land[1][0] - land[0][0]) * t;
        g = land[0][1] + (land[1][1] - land[0][1]) * t;
        b = land[0][2] + (land[1][2] - land[0][2]) * t;
      } else {
        const shade = 0.85 + n * 0.3;
        r = ocean[0] * shade;
        g = ocean[1] * shade;
        b = ocean[2] * shade;
      }
      if (iceCaps && lat > 0.82 - (n - 0.5) * 0.2) {
        r = 235; g = 242; b = 250;
      }
      if (clouds && (detail[(y * TEX_W + ((x + 47) % TEX_W))] ?? 0) > 0.68) {
        r = r * 0.35 + 255 * 0.65;
        g = g * 0.35 + 255 * 0.65;
        b = b * 0.35 + 255 * 0.65;
      }
      img.data[i * 4] = Math.min(255, r);
      img.data[i * 4 + 1] = Math.min(255, g);
      img.data[i * 4 + 2] = Math.min(255, b);
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function paintBands(
  ctx: CanvasRenderingContext2D,
  noise: Float32Array,
  detail: Float32Array,
  palette: [number, number, number][],
  bands: number,
  storm: boolean,
): void {
  const img = ctx.createImageData(TEX_W, TEX_H);
  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      const i = y * TEX_W + x;
      const warp = ((noise[i] ?? 0.5) - 0.5) * 2.2;
      const bandPos = ((y / TEX_H) * bands + warp + bands) % bands;
      const bandIndex = Math.floor(bandPos) % palette.length;
      const band = palette[bandIndex] ?? [200, 200, 200];
      const shade = 0.9 + ((detail[i] ?? 0.5) - 0.5) * 0.25;
      img.data[i * 4] = Math.min(255, band[0] * shade);
      img.data[i * 4 + 1] = Math.min(255, band[1] * shade);
      img.data[i * 4 + 2] = Math.min(255, band[2] * shade);
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (storm) {
    ctx.fillStyle = 'rgba(225, 150, 110, 0.9)';
    ctx.beginPath();
    ctx.ellipse(TEX_W * 0.68, TEX_H * 0.62, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 200, 160, 0.9)';
    ctx.beginPath();
    ctx.ellipse(TEX_W * 0.68, TEX_H * 0.62, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintVolcanic(ctx: CanvasRenderingContext2D, noise: Float32Array, detail: Float32Array): void {
  const img = ctx.createImageData(TEX_W, TEX_H);
  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      const i = y * TEX_W + x;
      const n = noise[i] ?? 0.5;
      const d = detail[i] ?? 0.5;
      const crack = 1 - Math.min(1, Math.abs(n - 0.5) * 6);
      const lava = Math.max(0, crack - 0.45) * 1.8;
      const shade = 0.5 + d * 0.5;
      img.data[i * 4] = Math.min(255, 35 * shade + lava * 255);
      img.data[i * 4 + 1] = Math.min(255, 25 * shade + lava * 110);
      img.data[i * 4 + 2] = Math.min(255, 22 * shade + lava * 20);
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function buildPlanetTexture(id: string, type: string): THREE.CanvasTexture {
  const rand = mulberry32(hashSeed(`planet-${id}`));
  const noise = valueNoise(TEX_W, TEX_H, 6, rand);
  const detail = valueNoise(TEX_W, TEX_H, 24, rand, 3);
  switch (type) {
    case 'gas-giant':
      return canvasTexture((ctx) => paintBands(ctx, noise, detail, [
        [210, 180, 140], [190, 140, 100], [230, 210, 180], [170, 110, 80], [220, 190, 150],
      ], 9, true));
    case 'ice-giant':
      return canvasTexture((ctx) => paintBands(ctx, noise, detail, [
        [170, 210, 230], [140, 190, 220], [190, 225, 240], [120, 170, 210],
      ], 6, false));
    case 'oceanic':
      return canvasTexture((ctx) => paintTerrain(ctx, noise, detail,
        [18, 55, 115], [[45, 110, 60], [110, 95, 55]], 0.52, true, true));
    case 'terrestrial':
      return canvasTexture((ctx) => paintTerrain(ctx, noise, detail,
        [25, 70, 110], [[60, 120, 60], [130, 110, 70]], 0.55, true, true));
    case 'rocky':
      return canvasTexture((ctx) => paintTerrain(ctx, noise, detail,
        [110, 95, 80], [[70, 60, 50], [140, 125, 105]], 0.5, false, false));
    case 'desert':
      return canvasTexture((ctx) => paintTerrain(ctx, noise, detail,
        [205, 165, 105], [[170, 130, 80], [230, 200, 150]], 0.5, false, false));
    case 'volcanic':
      return canvasTexture((ctx) => paintVolcanic(ctx, noise, detail));
    case 'frozen':
      return canvasTexture((ctx) => paintTerrain(ctx, noise, detail,
        [190, 215, 235], [[150, 180, 210], [230, 240, 250]], 0.5, true, false));
    default:
      return canvasTexture((ctx) => paintTerrain(ctx, noise, detail,
        [120, 120, 120], [[90, 90, 90], [150, 150, 150]], 0.5, false, false));
  }
}

/** Seeded surface texture for a planet, shared across zoom levels via cache. */
export function planetTexture(id: string, type: string): THREE.CanvasTexture {
  const key = `planet-${id}-${type}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const tex = buildPlanetTexture(id, type);
  cacheSet(key, tex);
  return tex;
}

export function moonTexture(id: string, type: string): THREE.CanvasTexture {
  const key = `moon-${id}-${type}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const rand = mulberry32(hashSeed(`moon-${id}`));
  const noise = valueNoise(TEX_W, TEX_H, 8, rand);
  const base: [number, number, number] = type === 'icy' ? [170, 185, 220] : [135, 125, 115];
  const tex = canvasTexture((ctx) => {
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let i = 0; i < TEX_W * TEX_H; i++) {
      const n = noise[i] ?? 0.5;
      const crater = n < 0.32 ? 0.55 : 1;
      const shade = (0.75 + n * 0.5) * crater;
      img.data[i * 4] = Math.min(255, base[0] * shade);
      img.data[i * 4 + 1] = Math.min(255, base[1] * shade);
      img.data[i * 4 + 2] = Math.min(255, base[2] * shade);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
  cacheSet(key, tex);
  return tex;
}

/** Drop cached textures (e.g. on full dispose). Cached textures still in use
 *  by a live mesh must not be evicted this way — PlanetRenderer disposes its
 *  own geometries/materials but leaves shared textures cached. */
export function clearTextureCache(): void {
  for (const [, tex] of textureCache) tex.dispose();
  textureCache.clear();
}
