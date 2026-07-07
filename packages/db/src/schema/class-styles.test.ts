/**
 * F1-05 — class_styles table test suite (RED phase)
 *
 * Tests for the `class_styles` table — taxonomy of class types.
 * Per MEP Phase 1 F1-05 + PAD §7.2 CLASS_STYLE entity.
 */

import { describe, it, expect } from 'vitest';
import { classStyles } from './class-styles';

describe('F1-05: class_styles table', () => {
  it('has the correct table name', () => {
    expect(classStyles[Symbol.for('drizzle:Name')]).toBe('class_styles');
  });

  it('has name column that is notNull text', () => {
    expect(classStyles.name).toBeDefined();
    expect(classStyles.name.getSQLType()).toBe('text');
    expect(classStyles.name.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(classStyles.id).toBeDefined();
    expect(classStyles.id.getSQLType()).toBe('uuid');
    expect(classStyles.id.primary).toBe(true);
    expect(classStyles.id.hasDefault).toBe(true);
  });

  it('has description and color columns', () => {
    expect(classStyles.description).toBeDefined();
    expect(classStyles.description.getSQLType()).toBe('text');
    expect(classStyles.color).toBeDefined();
    expect(classStyles.color.getSQLType()).toBe('text');
  });
});
