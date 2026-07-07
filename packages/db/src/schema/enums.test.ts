/**
 * F1-01 — Enums test suite (RED phase)
 *
 * Tests for the 8 PostgreSQL enums defined in packages/db/src/schema/enums.ts.
 * Per MEP Phase 1 F1-01 + PAD §7.2.
 *
 * These are structural unit tests — they verify enum names, values, and
 * PostgreSQL snake_case naming convention without requiring a live database.
 */

import { describe, it, expect } from 'vitest';
import {
  classLevelEnum,
  sessionStatusEnum,
  enrollmentStatusEnum,
  waitlistStatusEnum,
  subscriptionStatusEnum,
  billingIntervalEnum,
  studioRoleEnum,
  paymentStatusEnum,
} from './enums';

describe('F1-01: PostgreSQL Enums', () => {
  describe('classLevelEnum', () => {
    it('has the correct enum values matching PAD §7.2', () => {
      expect(classLevelEnum.enumValues).toEqual([
        'all',
        'beginner',
        'intermediate',
        'advanced',
      ]);
    });

    it('uses snake_case PostgreSQL naming convention', () => {
      // Drizzle pgEnum first arg is the PostgreSQL type name
      // We verify via the enumName property (Drizzle exposes this)
      expect(classLevelEnum.enumName).toBe('class_level');
    });
  });

  describe('all 8 enums are declared and exported', () => {
    it('exports sessionStatusEnum with correct values', () => {
      expect(sessionStatusEnum.enumValues).toEqual([
        'scheduled',
        'cancelled',
        'completed',
        'in_progress',
      ]);
      expect(sessionStatusEnum.enumName).toBe('session_status');
    });

    it('exports enrollmentStatusEnum with correct values', () => {
      expect(enrollmentStatusEnum.enumValues).toEqual([
        'confirmed',
        'cancelled',
        'attended',
        'no_show',
      ]);
      expect(enrollmentStatusEnum.enumName).toBe('enrollment_status');
    });

    it('exports waitlistStatusEnum with correct values', () => {
      expect(waitlistStatusEnum.enumValues).toEqual([
        'waiting',
        'offered',
        'accepted',
        'expired',
        'removed',
      ]);
      expect(waitlistStatusEnum.enumName).toBe('waitlist_status');
    });

    it('exports subscriptionStatusEnum with correct values', () => {
      expect(subscriptionStatusEnum.enumValues).toEqual([
        'active',
        'paused',
        'cancelled',
        'past_due',
        'trialing',
        'incomplete',
      ]);
      expect(subscriptionStatusEnum.enumName).toBe('subscription_status');
    });

    it('exports billingIntervalEnum with correct values', () => {
      expect(billingIntervalEnum.enumValues).toEqual(['month', 'year']);
      expect(billingIntervalEnum.enumName).toBe('billing_interval');
    });

    it('exports studioRoleEnum with correct values', () => {
      expect(studioRoleEnum.enumValues).toEqual([
        'member',
        'instructor',
        'staff',
        'manager',
        'owner',
      ]);
      expect(studioRoleEnum.enumName).toBe('studio_role');
    });

    it('exports paymentStatusEnum with correct values', () => {
      expect(paymentStatusEnum.enumValues).toEqual([
        'pending',
        'processed',
        'failed',
        'ignored',
      ]);
      expect(paymentStatusEnum.enumName).toBe('payment_status');
    });
  });

  describe('enum names use PostgreSQL snake_case convention', () => {
    it('all 8 enum names use snake_case (no camelCase)', () => {
      const enumNames = [
        classLevelEnum.enumName,
        sessionStatusEnum.enumName,
        enrollmentStatusEnum.enumName,
        waitlistStatusEnum.enumName,
        subscriptionStatusEnum.enumName,
        billingIntervalEnum.enumName,
        studioRoleEnum.enumName,
        paymentStatusEnum.enumName,
      ];

      // Each enum name should be lowercase with underscores only
      for (const name of enumNames) {
        expect(name).toMatch(/^[a-z]+(_[a-z]+)*$/);
      }

      // Exactly 8 distinct enum names
      expect(new Set(enumNames).size).toBe(8);
    });
  });
});
