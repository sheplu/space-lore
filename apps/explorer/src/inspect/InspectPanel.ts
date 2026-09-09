// Inspect panel: lore side-card for the selected entity.
// Framework-free DOM; tested under happy-dom.
import type { InspectModel } from './inspectContent';

export interface InspectPanelCallbacks {
  onPrimary: () => void;
  onClose: () => void;
}

export class InspectPanel {
  readonly element: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private badgeEl: HTMLSpanElement;
  private descEl: HTMLDivElement;
  private tagsEl: HTMLDivElement;
  private statsEl: HTMLDivElement;
  private primaryBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private open = false;

  constructor(callbacks: InspectPanelCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'inspect-panel';
    this.element.hidden = true;

    this.badgeEl = document.createElement('span');
    this.badgeEl.className = 'inspect-badge';
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'inspect-title';
    const head = document.createElement('div');
    head.className = 'inspect-head';
    head.append(this.badgeEl, this.titleEl);

    this.descEl = document.createElement('div');
    this.descEl.className = 'inspect-desc';
    this.tagsEl = document.createElement('div');
    this.tagsEl.className = 'inspect-tags';
    this.statsEl = document.createElement('div');
    this.statsEl.className = 'inspect-stats';

    this.primaryBtn = document.createElement('button');
    this.primaryBtn.className = 'inspect-primary';
    this.primaryBtn.addEventListener('click', () => callbacks.onPrimary());
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'inspect-close';
    this.closeBtn.textContent = 'Close (Esc)';
    this.closeBtn.addEventListener('click', () => callbacks.onClose());
    const actions = document.createElement('div');
    actions.className = 'inspect-actions';
    actions.append(this.primaryBtn, this.closeBtn);

    this.element.append(head, this.descEl, this.tagsEl, this.statsEl, actions);
  }

  isOpen(): boolean {
    return this.open;
  }

  show(model: InspectModel): void {
    this.titleEl.textContent = model.title;
    this.badgeEl.textContent = model.badge;
    this.descEl.textContent = model.description;
    this.tagsEl.replaceChildren();
    for (const tag of model.tags) {
      const chip = document.createElement('span');
      chip.className = 'inspect-tag';
      chip.textContent = tag;
      this.tagsEl.append(chip);
    }
    this.statsEl.replaceChildren();
    for (const stat of model.stats) {
      const row = document.createElement('div');
      row.className = 'inspect-stat';
      const label = document.createElement('span');
      label.className = 'inspect-stat-label';
      label.textContent = stat.label;
      const value = document.createElement('span');
      value.className = 'inspect-stat-value';
      value.textContent = stat.value;
      row.append(label, value);
      this.statsEl.append(row);
    }
    if (model.action === 'none') {
      this.primaryBtn.hidden = true;
    } else {
      this.primaryBtn.hidden = false;
      this.primaryBtn.textContent = `${model.actionLabel} (Enter)`;
    }
    this.element.hidden = false;
    this.open = true;
  }

  hide(): void {
    this.element.hidden = true;
    this.open = false;
  }

  dispose(): void {
    this.element.remove();
  }
}
