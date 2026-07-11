/**
 * Type augmentation for @testing-library/jest-dom matchers.
 *
 * The runtime import lives in test/setup.ts (loaded by vitest before tests).
 * This triple-slash reference ensures `tsc --noEmit` also recognises the
 * augmented matchers (toBeInTheDocument, toHaveAttribute, etc.) so test
 * files pass type-checking without individually referencing the types module.
 */
/// <reference types="@testing-library/jest-dom/vitest" />
