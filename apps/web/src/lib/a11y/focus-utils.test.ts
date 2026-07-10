// @vitest-environment jsdom
/**
 * F11-12 — Focus utils test suite
 *
 * Source: MEP Phase 11 F11-12.
 */

import { describe, it, expect, vi } from 'vitest';
import { trapFocus, restoreFocus } from './focus-utils';

describe('F11-12: Focus management utilities', () => {
  it('trapFocus returns a cleanup function', () => {
    const div = document.createElement('div');
    const cleanup = trapFocus(div);

    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('trapFocus adds keydown listener', () => {
    const div = document.createElement('div');
    const addSpy = vi.spyOn(div, 'addEventListener');

    const cleanup = trapFocus(div);
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    cleanup();
    addSpy.mockRestore();
  });

  it('cleanup removes the keydown listener', () => {
    const div = document.createElement('div');
    const removeSpy = vi.spyOn(div, 'removeEventListener');

    const cleanup = trapFocus(div);
    cleanup();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('restoreFocus calls focus on the element', () => {
    const element = document.createElement('button');
    const focusSpy = vi.spyOn(element, 'focus');

    // Mock requestAnimationFrame to call immediately
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    restoreFocus(element);
    expect(focusSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
