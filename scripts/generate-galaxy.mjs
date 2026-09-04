#!/usr/bin/env node
/**
 * Standalone galaxy generation pipeline script
 * Run with: node scripts/generate-galaxy.mjs [options]
 * 
 * This is a programmatic version of the /generate-galaxy skill
 * for CI/CD or direct CLI usage.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

const DEFAULT_CONFIG = {
  type: 'spiral',
  diameterLy: 80000,
  thicknessLy: 1200,
  estimatedStarCount: 200000000000,
  systems: 20,
  systemsPerQuadrant: [2, 8, 8, 2],
  nebulae: 8,
  clusters: 5,
  snrs: 5,
  anomalies: 5,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    
    switch (arg) {
      case '--type': config.type = next; i++; break;
      case '--diameter': config.diameterLy = parseInt(next); i++; break;
      case '--thickness': config.thicknessLy = parseInt(next); i++; break;
      case '--stars': config.estimatedStarCount = parseInt(next); i++; break;
      case '--systems': config.systems = parseInt(next); i++; break;
      case '--core': config.systemsPerQuadrant[0] = parseInt(next); i++; break;
      case '--inner': config.systemsPerQuadrant[1] = parseInt(next); i++; break;
      case '--outer': config.systemsPerQuadrant[2] = parseInt(next); i++; break;
      case '--halo': config.systemsPerQuadrant[3] = parseInt(next); i++; break;
      case '--nebulae': config.nebulae = parseInt(next); i++; break;
      case '--clusters': config.clusters = parseInt(next); i++; break;
      case '--snrs': config.snrs = parseInt(next); i++; break;
      case '--anomalies': config.anomalies = parseInt(next); i++; break;
      case '--seed': config.seed = next; i++; break;
      case '--help':
        console.log(`
Usage: node generate-galaxy.mjs [options]

Options:
  --type <type>           Galaxy type: spiral|barred-spiral|elliptical|irregular (default: spiral)
  --diameter <ly>         Galaxy diameter in light-years (default: 80000)
  --thickness <ly>        Disk thickness (default: 1200)
  --stars <count>         Estimated star count (default: 200000000000)
  --systems <count>       Number of star systems (default: 20)
  --core <count>          Systems in core quadrant (default: 2)
  --inner <count>         Systems in inner-arm quadrant (default: 8)
  --outer <count>         Systems in outer-arm quadrant (default: 8)
  --halo <count>          Systems in halo quadrant (default: 2)
  --nebulae <count>       Number of nebulae (default: 8)
  --clusters <count>      Number of star clusters (default: 5)
  --snrs <count>          Number of supernova remnants (default: 5)
  --anomalies <count>     Number of anomalies (default: 5)
  --seed <string>         Seed for reproducibility
  --help                  Show this help
        `);
        process.exit(0);
    }
  }
  
  return config;
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

async function runCli(command, cwd) {
  const result = await runCommand('npm', ['run', command, ...process.argv.slice(2)], cwd);
  if (result.code !== 0) {
    throw new Error(`Command failed: ${command}\n${result.stderr}`);
  }
  return result.stdout;
}

async function generateGalaxy(config) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'space-lore-gen-'));
  console.log(`Working in: ${tempRoot}`);
  
  try {
    // Step 1: Create galaxy
    console.log('\n=== Step 1: Creating Galaxy ===');
    const galaxyArgs = [
      'run', '--', '/galaxy',
      `type:${config.type}`,
      `diameter:${config.diameterLy}`,
      `thickness:${config.thicknessLy}`,
      `stars:${config.estimatedStarCount}`
    ];
    if (config.seed) galaxyArgs.push(`seed:${config.seed}`);
    await runCommand('npx', ['opencode', 'run', '--', ...galaxyArgs], REPO_ROOT);
    
    // Find created galaxy directory
    const contentDir = join(REPO_ROOT, 'content');
    const galaxies = existsSync(contentDir) ? 
      readdirSync(contentDir).filter(d => d.startsWith('gal-')) : [];
    if (galaxies.length === 0) throw new Error('No galaxy created');
    const galaxyDir = galaxies.sort().pop(); // Get latest
    console.log(`Created galaxy: ${galaxyDir}`);
    
    // Step 2: Create quadrants
    console.log('\n=== Step 2: Creating Quadrants ===');
    await runCli('opencode run -- /quadrant', REPO_ROOT);
    
    // Step 3: Generate star systems per quadrant
    console.log('\n=== Step 3: Generating Star Systems ===');
    const quadrantNames = ['core', 'inner-arm', 'outer-arm', 'halo'];
    for (let i = 0; i < 4; i++) {
      const count = config.systemsPerQuadrant[i];
      if (count === 0) continue;
      console.log(`  Generating ${count} systems in ${quadrantNames[i]}...`);
      for (let j = 0; j < count; j++) {
        const stars = Math.random() < 0.7 ? 1 : (Math.random() < 0.75 ? 2 : 3);
        const planets = Math.floor(Math.random() * 6) + 1;
        const asteroids = Math.floor(Math.random() * 8);
        const belts = Math.floor(Math.random() * 3);
        const comets = Math.floor(Math.random() * 4);
        const dwarfs = Math.floor(Math.random() * 3);
        
        await runCommand('npx', ['opencode', 'run', '--', '/star-system', 
          `stars:${stars}`,
          `planets:${planets}`,
          `asteroids:${asteroids}`,
          `belts:${belts}`,
          `comets:${comets}`,
          `dwarfPlanets:${dwarfs}`
        ], REPO_ROOT);
      }
    }
    
    // Step 4: Generate nebulae
    console.log('\n=== Step 4: Generating Nebulae ===');
    for (let i = 0; i < config.nebulae; i++) {
      await runCommand('npx', ['opencode', 'run', '--', '/nebula'], REPO_ROOT);
    }
    
    // Step 5: Generate clusters
    console.log('\n=== Step 5: Generating Star Clusters ===');
    for (let i = 0; i < config.clusters; i++) {
      await runCommand('npx', ['opencode', 'run', '--', '/cluster'], REPO_ROOT);
    }
    
    // Step 6: Generate SNRs
    console.log('\n=== Step 6: Generating Supernova Remnants ===');
    for (let i = 0; i < config.snrs; i++) {
      await runCommand('npx', ['opencode', 'run', '--', '/snr'], REPO_ROOT);
    }
    
    // Step 7: Generate anomalies
    console.log('\n=== Step 7: Generating Anomalies ===');
    for (let i = 0; i < config.anomalies; i++) {
      await runCommand('npx', ['opencode', 'run', '--', '/anomaly'], REPO_ROOT);
    }
    
    // Step 8: Final validation
    console.log('\n=== Step 8: Final Validation ===');
    const validation = await runCli('validate', REPO_ROOT);
    console.log(validation);
    
    console.log('\n=== Galaxy Generation Complete ===');
    console.log(`Output in: ${contentDir}`);
    
  } finally {
    // Cleanup temp dir if needed
    // rmSync(tempRoot, { recursive: true, force: true });
  }
}

// Main
const config = parseArgs();
generateGalaxy(config).catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});