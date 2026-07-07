/**
 * F1-10 — waitlist_entries table test suite (RED phase)
 *
 * Tests for the `waitlist_entries` table — ordered queue for full sessions.
 * Per MEP Phase 1 F1-10 + PAD §7.2 WAITLIST_ENTRY entity + PAD §7.3 critical index.
 */

import { describe, it, expect } from 'vitest';
import { waitlistEntries } from './waitlist';

describe('F1-10: waitlist_entries table', () => {
  it('has the correct table name', () => {
    expect(waitlistEntries[Symbol.for('drizzle:Name')]).toBe('waitlist_entries');
  });

  it('has position column as integer notNull', () => {
    expect(waitlistEntries.position).toBeDefined();
    expect(waitlistEntries.position.getSQLType()).toBe('integer');
    expect(waitlistEntries.position.notNull).toBe(true);
  });

  it('has status column using waitlistStatusEnum defaulting to waiting', () => {
    expect(waitlistEntries.status).toBeDefined();
    expect(waitlistEntries.status.enumValues).toEqual([
      'waiting',
      'offered',
      'accepted',
      'expired',
      'removed',
    ]);
    expect(waitlistEntries.status.hasDefault).toBe(true);
  });

  it('has sessionId and memberId columns as uuid notNull', () => {
    expect(waitlistEntries.sessionId).toBeDefined();
    expect(waitlistEntries.sessionId.getSQLType()).toBe('uuid');
    expect(waitlistEntries.sessionId.notNull).toBe(true);

    expect(waitlistEntries.memberId).toBeDefined();
    expect(waitlistEntries.memberId.getSQLType()).toBe('uuid');
    expect(waitlistEntries.memberId.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(waitlistEntries.id).toBeDefined();
    expect(waitlistEntries.id.getSQLType()).toBe('uuid');
    expect(waitlistEntries.id.primary).toBe(true);
    expect(waitlistEntries.id.hasDefault).toBe(true);
  });

  it('has all PAD §7.2 WAITLIST_ENTRY columns', () => {
    const expectedColumns = [
      'id',
      'sessionId',
      'memberId',
      'position',
      'joinedAt',
      'notifiedAt',
      'expiresAt',
      'status',
    ];

    for (const col of expectedColumns) {
      expect(waitlistEntries[col]).toBeDefined(`Column ${col} should exist on waitlist_entries table`);
    }
  });
});
