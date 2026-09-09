// Tests for the time controls overlay (happy-dom, no WebGL).
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'vitest';
import { TimeControls } from './TimeControls';

afterEach(() => {
  document.body.replaceChildren();
});

describe('TimeControls', () => {
  it('toggles pause label through the callback', () => {
    let paused = false;
    const ui = new TimeControls({
      onTogglePause: () => (paused = !paused),
      onCycleScale: () => 1,
    });
    document.body.append(ui.element);
    const btn = ui.element.querySelector('.time-play') as HTMLButtonElement;
    assert.equal(btn.textContent, 'Pause');
    btn.click();
    assert.equal(btn.textContent, 'Play');
    btn.click();
    assert.equal(btn.textContent, 'Pause');
  });

  it('updates the speed label from the callback', () => {
    const scales = [4, 16];
    const ui = new TimeControls({
      onTogglePause: () => false,
      onCycleScale: () => scales.shift() ?? 1,
    });
    document.body.append(ui.element);
    const btn = ui.element.querySelector('.time-speed') as HTMLButtonElement;
    btn.click();
    assert.equal(btn.textContent, '4×');
    btn.click();
    assert.equal(btn.textContent, '16×');
  });

  it('formats the elapsed readout from seconds to days', () => {
    const ui = new TimeControls({ onTogglePause: () => false, onCycleScale: () => 1 });
    document.body.append(ui.element);
    ui.setElapsed(45);
    assert.equal(ui.element.querySelector('.time-readout')?.textContent, 'T+45s');
    ui.setElapsed(150);
    assert.equal(ui.element.querySelector('.time-readout')?.textContent, 'T+2m');
    ui.setElapsed(90000);
    assert.equal(ui.element.querySelector('.time-readout')?.textContent, 'T+1d');
  });
});
