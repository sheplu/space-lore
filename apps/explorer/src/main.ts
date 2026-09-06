// Main entry point for the Galaxy Explorer
import { GalaxyExplorer } from '@/core/GalaxyExplorer';

const canvas = document.createElement('canvas');
canvas.id = 'gl-canvas';
document.getElementById('app')!.appendChild(canvas);

const errorEl = document.getElementById('errorEl');

function showError(message: string) {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

async function main() {
  try {
    const explorer = new GalaxyExplorer({
      canvas: document.getElementById('gl-canvas') as HTMLCanvasElement,
      contentRoot: '/content',
      enableWebGPU: true,
      debug: true,
    });
    
    await explorer.initialize();
    
    // Hide loading screen
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
    
    console.log('Galaxy Explorer initialized successfully');
  } catch (err) {
    console.error('Failed to initialize Galaxy Explorer:', err);
    showError(`Failed to initialize: ${err instanceof Error ? err.message : String(err)}`);
  }
}

main();