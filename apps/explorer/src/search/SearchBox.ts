// Search box overlay: input + ranked dropdown wired to a query callback.
// Framework-free DOM; tested under happy-dom.
import type { SearchEntry } from './searchIndex';

export interface SearchBoxCallbacks {
  onQuery: (query: string) => SearchEntry[];
  onSelect: (entry: SearchEntry) => void;
}

export class SearchBox {
  readonly element: HTMLDivElement;
  private input: HTMLInputElement;
  private resultsEl: HTMLDivElement;
  private results: SearchEntry[] = [];
  private activeIndex = -1;
  private callbacks: SearchBoxCallbacks;
  private onDocumentClick: (event: MouseEvent) => void;

  constructor(callbacks: SearchBoxCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('div');
    this.element.id = 'search';
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Search the galaxy  ( / )';
    this.input.setAttribute('aria-label', 'Search systems and planets');
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.resultsEl = document.createElement('div');
    this.resultsEl.id = 'search-results';
    this.resultsEl.hidden = true;
    this.element.append(this.input, this.resultsEl);

    this.input.addEventListener('input', () => this.refresh());
    this.input.addEventListener('keydown', (e) => this.onInputKey(e));
    // mousedown fires before input blur, so selection survives focus loss.
    this.resultsEl.addEventListener('mousedown', (e) => {
      const item = (e.target as HTMLElement).closest('[data-index]');
      if (item) {
        e.preventDefault();
        this.select(Number(item.getAttribute('data-index')));
      }
    });
    this.onDocumentClick = (e) => {
      if (!this.element.contains(e.target as Node)) this.hideResults();
    };
    document.addEventListener('click', this.onDocumentClick);
  }

  focus(): void {
    this.input.focus();
    this.input.select();
  }

  dispose(): void {
    document.removeEventListener('click', this.onDocumentClick);
    this.element.remove();
  }

  private refresh(): void {
    this.results = this.callbacks.onQuery(this.input.value);
    this.activeIndex = this.results.length > 0 ? 0 : -1;
    this.render();
  }

  private render(): void {
    this.resultsEl.replaceChildren();
    if (this.results.length === 0) {
      this.resultsEl.hidden = this.input.value.trim().length === 0;
      if (!this.resultsEl.hidden) {
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.textContent = 'No matches';
        this.resultsEl.append(empty);
      }
      return;
    }
    this.resultsEl.hidden = false;
    this.results.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'search-item' + (index === this.activeIndex ? ' active' : '');
      item.setAttribute('data-index', String(index));
      const badge = document.createElement('span');
      badge.className = `search-kind search-kind-${entry.kind}`;
      badge.textContent = entry.kind;
      const name = document.createElement('span');
      name.className = 'search-name';
      name.textContent = entry.name;
      const detail = document.createElement('div');
      detail.className = 'search-detail';
      detail.textContent = entry.detail;
      const text = document.createElement('div');
      text.append(name, detail);
      item.append(badge, text);
      this.resultsEl.append(item);
    });
  }

  private hideResults(): void {
    this.resultsEl.hidden = true;
    this.activeIndex = -1;
  }

  private select(index: number): void {
    const entry = this.results[index];
    if (!entry) return;
    this.hideResults();
    this.input.blur();
    this.callbacks.onSelect(entry);
  }

  private onInputKey(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.results.length > 0) {
          this.activeIndex = (this.activeIndex + 1) % this.results.length;
          this.render();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.results.length > 0) {
          this.activeIndex = (this.activeIndex - 1 + this.results.length) % this.results.length;
          this.render();
        }
        break;
      case 'Enter':
        if (this.activeIndex >= 0) this.select(this.activeIndex);
        break;
      case 'Escape':
        this.input.value = '';
        this.results = [];
        this.activeIndex = -1;
        this.render();
        this.input.blur();
        break;
    }
  }
}
