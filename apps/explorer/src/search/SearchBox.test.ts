// Tests for the search box overlay (happy-dom, no WebGL).
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'vitest';
import { SearchBox } from './SearchBox';
import type { SearchEntry } from './searchIndex';

const ENTRIES: SearchEntry[] = [
  { kind: 'system', id: 'sys-1', name: 'Emberwatch', detail: '2 planets · G star', systemId: 'sys-1', keywords: '' },
  { kind: 'planet', id: 'plnt-1', name: 'Rustfall', detail: 'desert planet · Emberwatch', systemId: 'sys-1', planetId: 'plnt-1', keywords: '' },
];

function setup() {
  const selected: SearchEntry[] = [];
  const box = new SearchBox({
    onQuery: (q) => ENTRIES.filter((e) => e.name.toLowerCase().includes(q.toLowerCase())),
    onSelect: (e) => selected.push(e),
  });
  document.body.append(box.element);
  const input = box.element.querySelector('input')!;
  return { box, input, selected };
}

afterEach(() => {
  document.body.replaceChildren();
});

function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(input: HTMLInputElement, code: string): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
}

describe('SearchBox', () => {
  it('renders ranked matches as the user types', () => {
    const { input } = setup();
    type(input, 'ember');
    const items = document.querySelectorAll('.search-item');
    assert.equal(items.length, 1);
    const first = items[0];
    assert.ok(first);
    assert.match(first.textContent ?? '', /Emberwatch/);
    assert.match(first.textContent ?? '', /2 planets/);
  });

  it('selects with Enter and reports the entry', () => {
    const { input, selected } = setup();
    type(input, 'rust');
    key(input, 'Enter');
    assert.deepEqual(selected.map((s) => s.name), ['Rustfall']);
  });

  it('moves the active row with arrow keys', () => {
    const { input, selected } = setup();
    type(input, 'a');
    assert.equal(document.querySelectorAll('.search-item').length, 2);
    key(input, 'ArrowDown');
    key(input, 'Enter');
    assert.deepEqual(selected.map((s) => s.name), ['Rustfall']);
  });

  it('shows a no-matches note instead of an empty list', () => {
    const { input } = setup();
    type(input, 'zzz');
    assert.equal(document.querySelectorAll('.search-item').length, 0);
    assert.match(document.getElementById('search-results')?.textContent ?? '', /No matches/);
  });

  it('clears on Escape', () => {
    const { box, input } = setup();
    void box;
    type(input, 'ember');
    assert.equal(document.querySelectorAll('.search-item').length, 1);
    key(input, 'Escape');
    assert.equal(document.querySelectorAll('.search-item').length, 0);
    assert.equal(input.value, '');
  });
});
