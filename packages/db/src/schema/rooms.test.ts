/**
 * F1-07 — rooms table test suite (RED phase)
 *
 * Tests for the `rooms` table — physical studio rooms.
 * Per MEP Phase 1 F1-07 + PAD §7.2 ROOM entity.
 */

import { describe, it, expect } from 'vitest';
import { rooms } from './rooms';

describe('F1-07: rooms table', () => {
  it('has the correct table name', () => {
    expect(rooms[Symbol.for('drizzle:Name')]).toBe('rooms');
  });

  it('has capacity column as integer notNull', () => {
    expect(rooms.capacity).toBeDefined();
    expect(rooms.capacity.getSQLType()).toBe('integer');
    expect(rooms.capacity.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(rooms.id).toBeDefined();
    expect(rooms.id.getSQLType()).toBe('uuid');
    expect(rooms.id.primary).toBe(true);
    expect(rooms.id.hasDefault).toBe(true);
  });

  it('has name and isActive columns', () => {
    expect(rooms.name).toBeDefined();
    expect(rooms.name.getSQLType()).toBe('text');
    expect(rooms.name.notNull).toBe(true);
    expect(rooms.isActive).toBeDefined();
    expect(rooms.isActive.getSQLType()).toBe('boolean');
  });
});
