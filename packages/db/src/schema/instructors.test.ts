/**
 * F1-04 — instructors table test suite (RED phase)
 *
 * Tests for the `instructors` table.
 * Per MEP Phase 1 F1-04 + PAD §7.2 INSTRUCTOR entity.
 */

import { describe, it, expect } from 'vitest';
import { instructors } from './instructors';

describe('F1-04: instructors table', () => {
  it('has the correct table name', () => {
    expect(instructors[Symbol.for('drizzle:Name')]).toBe('instructors');
  });

  it('has slug column that is unique and notNull', () => {
    expect(instructors.slug).toBeDefined();
    expect(instructors.slug.getSQLType()).toBe('text');
    expect(instructors.slug.notNull).toBe(true);
    expect(instructors.slug.isUnique).toBe(true);
  });

  it('has specialties column as text array', () => {
    expect(instructors.specialties).toBeDefined();
    // text[] in Drizzle — .array() wraps the base type as PgArray
    expect(instructors.specialties.columnType).toBe('PgArray');
    // getSQLType returns the PostgreSQL wire format 'text[]'
    expect(instructors.specialties.getSQLType()).toBe('text[]');
  });

  it('has isActive boolean defaulting to true', () => {
    expect(instructors.isActive).toBeDefined();
    expect(instructors.isActive.getSQLType()).toBe('boolean');
    expect(instructors.isActive.hasDefault).toBe(true);
  });

  it('has userId column as uuid notNull (FK to users.id verified in migration)', () => {
    expect(instructors.userId).toBeDefined();
    expect(instructors.userId.getSQLType()).toBe('uuid');
    expect(instructors.userId.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(instructors.id).toBeDefined();
    expect(instructors.id.getSQLType()).toBe('uuid');
    expect(instructors.id.primary).toBe(true);
    expect(instructors.id.hasDefault).toBe(true);
  });

  it('has all PAD §7.2 INSTRUCTOR columns', () => {
    const expectedColumns = [
      'id',
      'userId',
      'slug',
      'bio',
      'specialties',
      'imageKey',
      'isActive',
      'sortOrder',
    ];

    for (const col of expectedColumns) {
      expect(instructors[col]).toBeDefined(`Column ${col} should exist on instructors table`);
    }
  });
});
