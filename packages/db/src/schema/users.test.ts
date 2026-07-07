/**
 * F1-02 — users table test suite (RED phase)
 *
 * Tests for the `users` table (Better Auth compatible).
 * Per MEP Phase 1 F1-02 + PAD §7.2 USER entity.
 */

import { describe, it, expect } from 'vitest';
import { users } from './users';

describe('F1-02: users table', () => {
  it('has the correct table name', () => {
    expect(users[Symbol.for('drizzle:Name')]).toBe('users');
  });

  it('has email column that is text, notNull, and unique', () => {
    const emailColumn = users.email;
    expect(emailColumn).toBeDefined();
    expect(emailColumn.getSQLType()).toBe('text');
    expect(emailColumn.notNull).toBe(true);
    expect(emailColumn.isUnique).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    const idColumn = users.id;
    expect(idColumn).toBeDefined();
    expect(idColumn.getSQLType()).toBe('uuid');
    expect(idColumn.primary).toBe(true);
    // defaultRandom — Drizzle sets .hasDefault true and defaultFn
    expect(idColumn.hasDefault).toBe(true);
  });

  it('has createdAt timestamp with default now()', () => {
    expect(users.createdAt).toBeDefined();
    expect(users.createdAt.getSQLType()).toBe('timestamp');
    expect(users.createdAt.hasDefault).toBe(true);
  });

  it('has emailVerified boolean (Better Auth requirement — Phase 2 Cycle 0)', () => {
    expect(users.emailVerified).toBeDefined();
    expect(users.emailVerified.getSQLType()).toBe('boolean');
    // emailVerified defaults to false (Better Auth convention)
    expect(users.emailVerified.hasDefault).toBe(true);
    expect(users.emailVerified.notNull).toBe(true);
  });
});
