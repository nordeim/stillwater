/**
 * F1-03 — members table test suite (RED phase)
 *
 * Tests for the `members` table — adds `stripeCustomerId` column (D6 fix).
 * Per MEP Phase 1 F1-03 + PAD §7.2 MEMBER entity + D6.
 *
 * Note: Drizzle 0.45 stores FK config at table level (accessible via
 * getTableConfig in the generated migration SQL). Unit tests verify
 * column structure; FK cascade behavior is verified by migration SQL
 * in Cycle 8.
 */

import { describe, it, expect } from 'vitest';
import { members } from './members';

describe('F1-03: members table', () => {
  it('has the correct table name', () => {
    expect(members[Symbol.for('drizzle:Name')]).toBe('members');
  });

  it('has stripeCustomerId column that is unique (D6 fix)', () => {
    expect(members.stripeCustomerId).toBeDefined();
    expect(members.stripeCustomerId.getSQLType()).toBe('text');
    expect(members.stripeCustomerId.isUnique).toBe(true);
    // stripeCustomerId is nullable (members may not have a Stripe customer yet)
    expect(members.stripeCustomerId.notNull).toBeFalsy();
  });

  it('has userId column as uuid notNull (FK to users.id with cascade verified in migration)', () => {
    expect(members.userId).toBeDefined();
    expect(members.userId.getSQLType()).toBe('uuid');
    expect(members.userId.notNull).toBe(true);
    // FK cascade (onDelete: 'cascade') is verified via migration SQL in Cycle 8
  });

  it('has joinedAt timestamp defaulting to now()', () => {
    expect(members.joinedAt).toBeDefined();
    expect(members.joinedAt.getSQLType()).toBe('timestamp');
    expect(members.joinedAt.hasDefault).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(members.id).toBeDefined();
    expect(members.id.getSQLType()).toBe('uuid');
    expect(members.id.primary).toBe(true);
    expect(members.id.hasDefault).toBe(true);
  });

  it('has all PAD §7.2 MEMBER columns + D6 stripeCustomerId', () => {
    const expectedColumns = [
      'id',
      'userId',
      'displayName',
      'phone',
      'dateOfBirth',
      'emergencyContact',
      'emergencyPhone',
      'notes',
      'joinedAt',
      'createdAt',
      'stripeCustomerId', // D6 addition
    ];

    for (const col of expectedColumns) {
      expect(members[col]).toBeDefined(`Column ${col} should exist on members table`);
    }
  });
});
