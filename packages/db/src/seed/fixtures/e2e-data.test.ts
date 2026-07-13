/**
 * E2E Seed Data — UUID validation tests
 *
 * TDD RED phase: validates that all E2E seed UUIDs conform to the
 * PostgreSQL uuid type format (8-4-4-4-12 = 36 chars).
 *
 * Source: pnpm_log_2.txt error: "invalid input syntax for type uuid"
 */

import { describe, it, expect } from 'vitest';
import {
  e2eMembers,
  e2eSessions,
  e2eEnrollments,
  e2eWaitlistEntries,
} from './e2e-data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('E2E seed data — UUID validation', () => {
  describe('e2eMembers', () => {
    it('all user IDs are valid UUIDs', () => {
      for (const m of e2eMembers) {
        expect(m.user.id).toMatch(UUID_REGEX);
      }
    });

    it('all member IDs are valid UUIDs', () => {
      for (const m of e2eMembers) {
        expect(m.member.id).toMatch(UUID_REGEX);
      }
    });
  });

  describe('e2eSessions', () => {
    it('generates at least 30 sessions', () => {
      expect(e2eSessions.length).toBeGreaterThanOrEqual(30);
    });

    it('all session IDs are valid 36-char UUIDs', () => {
      for (const s of e2eSessions) {
        expect(s.id).toMatch(UUID_REGEX);
        expect(s.id?.length).toBe(36);
      }
    });

    it('all session IDs are unique', () => {
      const ids = e2eSessions.map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('all classId references are valid UUIDs', () => {
      for (const s of e2eSessions) {
        expect(s.classId).toMatch(UUID_REGEX);
      }
    });

    it('all instructorId references are valid UUIDs', () => {
      for (const s of e2eSessions) {
        expect(s.instructorId).toMatch(UUID_REGEX);
      }
    });

    it('all roomId references are valid UUIDs', () => {
      for (const s of e2eSessions) {
        expect(s.roomId).toMatch(UUID_REGEX);
      }
    });
  });

  describe('e2eEnrollments', () => {
    it('all enrollment IDs are valid UUIDs', () => {
      for (const e of e2eEnrollments) {
        expect(e.id).toMatch(UUID_REGEX);
      }
    });

    it('all sessionId references point to actual E2E or base sessions', () => {
      // Enrollments may reference either E2E sessions or base demo sessions.
      // E2E session IDs start with 00000000-0000-4eee-f000-
      // Base session IDs start with 00000000-0000-4000-f000-
      for (const e of e2eEnrollments) {
        expect(e.sessionId).toMatch(UUID_REGEX);
        const isE2E = e2eSessions.some((s) => s.id === e.sessionId);
        const isBase = e.sessionId.startsWith('00000000-0000-4000-f000-');
        expect(isE2E || isBase).toBe(true);
      }
    });

    it('all memberId references are valid UUIDs', () => {
      for (const e of e2eEnrollments) {
        expect(e.memberId).toMatch(UUID_REGEX);
      }
    });
  });

  describe('e2eWaitlistEntries', () => {
    it('all waitlist entry IDs are valid UUIDs', () => {
      for (const w of e2eWaitlistEntries) {
        expect(w.id).toMatch(UUID_REGEX);
      }
    });

    it('all sessionId references point to actual E2E sessions', () => {
      for (const w of e2eWaitlistEntries) {
        expect(w.sessionId).toMatch(UUID_REGEX);
        const exists = e2eSessions.some((s) => s.id === w.sessionId);
        expect(exists).toBe(true);
      }
    });

    it('all memberId references are valid UUIDs', () => {
      for (const w of e2eWaitlistEntries) {
        expect(w.memberId).toMatch(UUID_REGEX);
      }
    });
  });
});
