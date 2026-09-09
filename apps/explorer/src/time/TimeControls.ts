// Time controls overlay: play/pause, speed steps, elapsed readout.
// Framework-free DOM; tested under happy-dom.
export const TIME_SCALES = [1, 4, 16, 64];

export interface TimeControlsCallbacks {
  onTogglePause: () => boolean;
  onCycleScale: () => number;
}

function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const units: Array<[string, number]> = [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]];
  for (const [suffix, size] of units) {
    if (total >= size || suffix === 's') {
      const value = suffix === 's' ? total : Math.floor(total / size);
      return `T+${value}${suffix}`;
    }
  }
  return 'T+0s';
}

export class TimeControls {
  readonly element: HTMLDivElement;
  private playBtn: HTMLButtonElement;
  private speedBtn: HTMLButtonElement;
  private readout: HTMLSpanElement;

  constructor(callbacks: TimeControlsCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'time-controls';
    this.playBtn = document.createElement('button');
    this.playBtn.className = 'time-play';
    this.playBtn.textContent = 'Pause';
    this.playBtn.setAttribute('aria-label', 'Play or pause world time');
    this.playBtn.addEventListener('click', () => {
      const paused = callbacks.onTogglePause();
      this.setPaused(paused);
    });
    this.speedBtn = document.createElement('button');
    this.speedBtn.className = 'time-speed';
    this.speedBtn.textContent = '1×';
    this.speedBtn.setAttribute('aria-label', 'Cycle time speed');
    this.speedBtn.addEventListener('click', () => {
      this.setScale(callbacks.onCycleScale());
    });
    this.readout = document.createElement('span');
    this.readout.className = 'time-readout';
    this.readout.textContent = 'T+0s';
    this.element.append(this.playBtn, this.speedBtn, this.readout);
  }

  setPaused(paused: boolean): void {
    this.playBtn.textContent = paused ? 'Play' : 'Pause';
  }

  setScale(scale: number): void {
    this.speedBtn.textContent = `${scale}×`;
  }

  setElapsed(seconds: number): void {
    this.readout.textContent = formatElapsed(seconds);
  }

  dispose(): void {
    this.element.remove();
  }
}
