/**
 * F1-08 — class_sessions table test suite (RED phase)
 *
 * Tests for the `class_sessions` table — specific scheduled occurrences.
 * Per MEP Phase 1 F1-08 + PAD §7.2 CLASS_SESSION entity + PAD §7.3 critical index.
 */

import { describe, it, expect } from 'vitest';
import { classSessions } from './sessions';

describe('F1-08: class_sessions table', () => {
  it('has the correct table name', () => {
    expect(classSessions[Symbol.for('drizzle:Name')]).toBe('class_sessions');
  });

  it('has startsAt and endsAt columns that are notNull timestamps', () => {
    expect(classSessions.startsAt).toBeDefined();
    expect(classSessions.startsAt.getSQLType()).toBe('timestamp');
    expect(classSessions.startsAt.notNull).toBe(true);

    expect(classSessions.endsAt).toBeDefined();
    expect(classSessions.endsAt.getSQLType()).toBe('timestamp');
    expect(classSessions.endsAt.notNull).toBe(true);
  });

  it('has status column using sessionStatusEnum defaulting to scheduled', () => {
    expect(classSessions.status).toBeDefined();
    expect(classSessions.status.enumValues).toEqual([
      'scheduled',
      'cancelled',
      'completed',
      'in_progress',
    ]);
    expect(classSessions.status.hasDefault).toBe(true);
  });

  it('has isVirtual boolean defaulting to false', () => {
    expect(classSessions.isVirtual).toBeDefined();
    expect(classSessions.isVirtual.getSQLType()).toBe('boolean');
    expect(classSessions.isVirtual.hasDefault).toBe(true);
  });

  it('has classId, instructorId columns as uuid notNull (FKs verified in migration)', () => {
    expect(classSessions.classId).toBeDefined();
    expect(classSessions.classId.getSQLType()).toBe('uuid');
    expect(classSessions.classId.notNull).toBe(true);

    expect(classSessions.instructorId).toBeDefined();
    expect(classSessions.instructorId.getSQLType()).toBe('uuid');
    expect(classSessions.instructorId.notNull).toBe(true);
  });

  it('has roomId column as uuid nullable (FK to rooms)', () => {
    expect(classSessions.roomId).toBeDefined();
    expect(classSessions.roomId.getSQLType()).toBe('uuid');
    // roomId is nullable — a session may not have a room assigned (virtual classes)
    expect(classSessions.roomId.notNull).toBeFalsy();
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(classSessions.id).toBeDefined();
    expect(classSessions.id.getSQLType()).toBe('uuid');
    expect(classSessions.id.primary).toBe(true);
    expect(classSessions.id.hasDefault).toBe(true);
  });

  it('has all PAD §7.2 CLASS_SESSION columns', () => {
    const expectedColumns = [
      'id',
      'classId',
      'instructorId',
      'roomId',
      'startsAt',
      'endsAt',
      'status',
      'cancelReason',
      'overrideCapacity',
      'isVirtual',
      'streamUrl',
      'createdAt',
    ];

    for (const col of expectedColumns) {
      expect(classSessions[col]).toBeDefined(`Column ${col} should exist on class_sessions table`);
    }
  });
});
