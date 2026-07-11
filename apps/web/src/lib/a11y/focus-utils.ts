/**
 * F11-12 — Focus management utilities
 *
 * trapFocus: traps Tab key within a container (for custom modals —
 *   Radix Dialog has this built-in, but custom modal patterns may need it).
 * restoreFocus: restores focus to a previously focused element.
 *
 * Source: MEP Phase 11 F11-12, PAD §22 (keyboard navigation).
 */

/**
 * Trap focus within a container element.
 * Returns a cleanup function that removes the event listeners.
 *
 * @example
 * const cleanup = trapFocus(dialogElement);
 * // ... later
 * cleanup();
 */
export function trapFocus(container: HTMLElement): () => void {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeydown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeydown);
  };
}

/**
 * Restore focus to a previously focused element.
 * Used when closing a modal to return focus to the trigger button.
 *
 * @example
 * const trigger = document.activeElement as HTMLElement;
 * openModal();
 * // ... on close:
 * restoreFocus(trigger);
 */
export function restoreFocus(element: HTMLElement): void {
  // Small delay to ensure the element is visible/interactive
  requestAnimationFrame(() => {
    element.focus();
  });
}
