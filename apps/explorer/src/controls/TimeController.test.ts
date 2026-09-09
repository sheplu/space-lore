// Unit tests for the time controller (pure logic, no DOM).
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { TimeController } from './TimeController';

describe('TimeController', () => {
  it('passes through real time at 1x', () => {
    const tc = new TimeController();
    tc.update(0.5);
    assert.equal(tc.deltaTime, 0.5);
    assert.equal(tc.elapsedTime, 0.5);
  });

  it('scales delta time', () => {
    const tc = new TimeController();
    tc.setTimeScale(4);
    tc.update(0.5);
    assert.equal(tc.deltaTime, 2);
    assert.equal(tc.elapsedTime, 2);
  });

  it('freezes time while paused', () => {
    const tc = new TimeController();
    tc.update(1);
    tc.paused = true;
    tc.update(1);
    assert.equal(tc.deltaTime, 0);
    assert.equal(tc.elapsedTime, 1);
  });

  it('clamps negative and non-finite input to zero', () => {
    const tc = new TimeController();
    tc.update(-1);
    assert.equal(tc.deltaTime, 0);
    tc.update(Number.NaN);
    assert.equal(tc.deltaTime, 0);
  });

  it('clamps the scale at zero', () => {
    const tc = new TimeController();
    tc.setTimeScale(-5);
    assert.equal(tc.timeScale, 0);
    tc.update(1);
    assert.equal(tc.deltaTime, 0);
  });

  it('resets both clocks', () => {
    const tc = new TimeController();
    tc.update(3);
    tc.reset();
    assert.equal(tc.deltaTime, 0);
    assert.equal(tc.elapsedTime, 0);
  });
});
