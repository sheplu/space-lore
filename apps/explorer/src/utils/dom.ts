// True when a keyboard event originates from an editable element.
// Camera and explorer shortcuts must ignore keystrokes typed into inputs
// (e.g. WASD while using the search box).
export function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable === true;
}
