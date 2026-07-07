/**
 * Cycle 0 — Better Auth schema tables test suite (RED phase)
 *
 * Tests for the Better Auth-required tables: session, account, verification.
 * Also verifies the users.emailVerified type change from timestamp to boolean.
 *
 * Better Auth v1.6.23 expects these tables with specific field names:
 *   - session: id, token (unique), expiresAt, userId (FK), ipAddress, userAgent, createdAt, updatedAt
 *   - account: id, accountId, providerId, userId (FK), refreshToken, accessToken, idToken,
 *              accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt
 *   - verification: id, value, expiresAt, createdAt, updatedAt
 *
 * Per MEP Phase 2 Cycle 0 + guide_auth-v5_vs_better-auth.md "Database Schema Differences".
 */

import { describe, it, expect } from 'vitest';
import { session, account, verification, users } from './auth-tables';

describe('Cycle 0: Better Auth session table', () => {
  it('has the correct table name', () => {
    expect(session[Symbol.for('drizzle:Name')]).toBe('session');
  });

  it('has token column that is unique and notNull', () => {
    expect(session.token).toBeDefined();
    expect(session.token.getSQLType()).toBe('text');
    expect(session.token.notNull).toBe(true);
    expect(session.token.isUnique).toBe(true);
  });

  it('has expiresAt column as timestamp notNull', () => {
    expect(session.expiresAt).toBeDefined();
    expect(session.expiresAt.getSQLType()).toBe('timestamp');
    expect(session.expiresAt.notNull).toBe(true);
  });

  it('has userId column as uuid notNull (FK to users.id)', () => {
    expect(session.userId).toBeDefined();
    expect(session.userId.getSQLType()).toBe('uuid');
    expect(session.userId.notNull).toBe(true);
  });

  it('has ipAddress and userAgent columns (nullable, for session tracking)', () => {
    expect(session.ipAddress).toBeDefined();
    expect(session.ipAddress.getSQLType()).toBe('text');
    expect(session.ipAddress.notNull).toBeFalsy();

    expect(session.userAgent).toBeDefined();
    expect(session.userAgent.getSQLType()).toBe('text');
    expect(session.userAgent.notNull).toBeFalsy();
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(session.id).toBeDefined();
    expect(session.id.getSQLType()).toBe('uuid');
    expect(session.id.primary).toBe(true);
    expect(session.id.hasDefault).toBe(true);
  });
});

describe('Cycle 0: Better Auth account table', () => {
  it('has the correct table name', () => {
    expect(account[Symbol.for('drizzle:Name')]).toBe('account');
  });

  it('has accountId and providerId columns as text notNull', () => {
    expect(account.accountId).toBeDefined();
    expect(account.accountId.getSQLType()).toBe('text');
    expect(account.accountId.notNull).toBe(true);

    expect(account.providerId).toBeDefined();
    expect(account.providerId.getSQLType()).toBe('text');
    expect(account.providerId.notNull).toBe(true);
  });

  it('has userId column as uuid notNull (FK to users.id)', () => {
    expect(account.userId).toBeDefined();
    expect(account.userId.getSQLType()).toBe('uuid');
    expect(account.userId.notNull).toBe(true);
  });

  it('has refreshToken and accessToken columns (nullable, for OAuth tokens)', () => {
    expect(account.refreshToken).toBeDefined();
    expect(account.refreshToken.getSQLType()).toBe('text');
    expect(account.refreshToken.notNull).toBeFalsy();

    expect(account.accessToken).toBeDefined();
    expect(account.accessToken.getSQLType()).toBe('text');
    expect(account.accessToken.notNull).toBeFalsy();
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(account.id).toBeDefined();
    expect(account.id.getSQLType()).toBe('uuid');
    expect(account.id.primary).toBe(true);
    expect(account.id.hasDefault).toBe(true);
  });
});

describe('Cycle 0: Better Auth verification table', () => {
  it('has the correct table name', () => {
    expect(verification[Symbol.for('drizzle:Name')]).toBe('verification');
  });

  it('has value column as text notNull', () => {
    expect(verification.value).toBeDefined();
    expect(verification.value.getSQLType()).toBe('text');
    expect(verification.value.notNull).toBe(true);
  });

  it('has expiresAt column as timestamp notNull', () => {
    expect(verification.expiresAt).toBeDefined();
    expect(verification.expiresAt.getSQLType()).toBe('timestamp');
    expect(verification.expiresAt.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(verification.id).toBeDefined();
    expect(verification.id.getSQLType()).toBe('uuid');
    expect(verification.id.primary).toBe(true);
    expect(verification.id.hasDefault).toBe(true);
  });
});

describe('Cycle 0: users.emailVerified type fix (Better Auth compatibility)', () => {
  it('users.emailVerified is boolean (NOT timestamp) — Better Auth requirement', () => {
    expect(users.emailVerified).toBeDefined();
    expect(users.emailVerified.getSQLType()).toBe('boolean');
    // Better Auth expects emailVerified to default to false
    expect(users.emailVerified.hasDefault).toBe(true);
  });
});
