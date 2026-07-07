/**
 * F1-06 — classes table test suite (RED phase)
 *
 * Tests for the `classes` table — class templates.
 * Per MEP Phase 1 F1-06 + PAD §7.2 CLASS entity.
 */

import { describe, it, expect } from 'vitest';
import { classes } from './classes';

describe('F1-06: classes table', () => {
  it('has the correct table name', () => {
    expect(classes[Symbol.for('drizzle:Name')]).toBe('classes');
  });

  it('has level column using classLevelEnum', () => {
    expect(classes.level).toBeDefined();
    // pgEnum columns have enumValues array
    expect(classes.level.enumValues).toEqual([
      'all',
      'beginner',
      'intermediate',
      'advanced',
    ]);
  });

  it('has slug column that is unique and notNull', () => {
    expect(classes.slug).toBeDefined();
    expect(classes.slug.getSQLType()).toBe('text');
    expect(classes.slug.notNull).toBe(true);
    expect(classes.slug.isUnique).toBe(true);
  });

  it('has maxCapacity column as integer notNull', () => {
    expect(classes.maxCapacity).toBeDefined();
    expect(classes.maxCapacity.getSQLType()).toBe('integer');
    expect(classes.maxCapacity.notNull).toBe(true);
  });

  it('has styleId column as uuid (FK to class_styles.id verified in migration)', () => {
    expect(classes.styleId).toBeDefined();
    expect(classes.styleId.getSQLType()).toBe('uuid');
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(classes.id).toBeDefined();
    expect(classes.id.getSQLType()).toBe('uuid');
    expect(classes.id.primary).toBe(true);
    expect(classes.id.hasDefault).toBe(true);
  });

  it('has durationMinutes column as integer notNull', () => {
    expect(classes.durationMinutes).toBeDefined();
    expect(classes.durationMinutes.getSQLType()).toBe('integer');
    expect(classes.durationMinutes.notNull).toBe(true);
  });
});
