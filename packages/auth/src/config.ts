/**
 * F2-01 — Better Auth v1.6.23 server configuration
 *
 * Features:
 * - Drizzle adapter (uses our `users`, `session`, `account`, `verification` tables)
 * - Google OAuth provider (social-providers)
 * - Magic Link plugin (for passwordless email sign-in)
 * - customSession plugin (enriches session with memberId + roles)
 * - `user.modelName: 'users'` to use our plural table name
 *
 * Per SKILL §3.4: uses process.env directly (not Zod env module) for
 * infrastructure client compatibility in build/test contexts.
 *
 * Source: MEP Phase 2 F2-01, guide_auth-v5_vs_better-auth.md,
 *         SKILL §5.6 Auth Patterns, ADR-008.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { google } from 'better-auth/social-providers';
import { magicLink } from 'better-auth/plugins/magic-link';
import { customSession } from 'better-auth/plugins/custom-session';
import { eq, desc } from 'drizzle-orm';
import { db } from '@stillwater/db';
import {
  members,
  memberSubscriptions,
  membershipPlans,
  roleAssignments,
} from '@stillwater/db';
import { resend } from './resend-client';

// Use process.env directly (not Zod env module) per SKILL §3.4
// C4 fix: NO placeholder fallback for BETTER_AUTH_SECRET. If unset in
// production, the app MUST fail fast rather than silently using a
// publicly-known, version-controlled secret that allows session forgery.
// Build/test contexts (NEXT_PHASE=phase-production-build or NODE_ENV=test)
// are exempt — no actual signing happens there, but Better Auth still
// requires a non-undefined secret at init. We use a random placeholder
// that Better Auth accepts (not a known-default string).
const isBuildContext =
  process.env['NEXT_PHASE'] === 'phase-production-build' ||
  process.env['NODE_ENV'] === 'test';

const secret = process.env['BETTER_AUTH_SECRET'];
if (!secret && !isBuildContext) {
  throw new Error(
    'BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` ' +
      'and add it to apps/web/.env.local. Without it, session cookies cannot be signed.',
  );
}
// During build/test, use a random 32-byte base64 string so Better Auth
// doesn't throw "You are using the default secret". This secret is NEVER
// used for actual signing (build context doesn't execute auth flows).
const effectiveSecret = secret ?? cryptoRandomSecret();
const baseURL = process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000';
const googleClientId = process.env['GOOGLE_CLIENT_ID'] ?? 'placeholder.apps.googleusercontent.com';
const googleClientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? 'placeholder';
const emailFrom = process.env['EMAIL_FROM'] ?? 'hello@stillwater.studio';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Use our plural table names (Phase 1 created 'users'; Better Auth default is 'user')
    schema: {
      user: {
        modelName: 'users',
      },
      session: {
        modelName: 'session',
      },
      account: {
        modelName: 'account',
      },
      verification: {
        modelName: 'verification',
      },
    },
  }),
  secret: effectiveSecret,
  baseURL,
  emailAndPassword: { enabled: false },
  // Rate limiting for auth mutations (P0-4 fix).
  // Better Auth has built-in rate limiting that uses the database (not Redis)
  // to track request counts per IP + email. This prevents credential-stuffing
  // and magic-link email-bombing attacks.
  // Per SKILL §15.7.4: signIn 10/15min, magicLink 5/15min.
  rateLimit: {
    window: 15 * 60, // 15 minutes (in seconds)
    max: 10, // 10 requests per window per IP
    // Custom limits per path (overrides the global max)
    customRules: {
      '/api/auth/sign-in/social': { window: 15 * 60, max: 10 },
      '/api/auth/magic-link': { window: 15 * 60, max: 5 },
      '/api/auth/callback/*': { window: 15 * 60, max: 15 },
    },
  },
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      scope: ['email', 'profile'], // OAuth scope minimization (SKILL §5.6.1)
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: 'Sign in to Stillwater Yoga',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1C1915;">Sign in to Stillwater</h1>
              <p style="color: #3D3832; font-size: 16px; line-height: 1.65;">
                Click the link below to sign in to your Stillwater Yoga account.
                This link expires in 10 minutes.
              </p>
              <a href="${url}"
                 style="display: inline-block; background: #C4856A; color: #F5F0E8;
                        padding: 12px 24px; text-decoration: none; font-weight: 500;
                        margin: 16px 0;">
                Sign in to Stillwater
              </a>
              <p style="color: #8C7B6E; font-size: 14px;">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      },
      expiresIn: 10 * 60, // 10 minutes (SKILL §5.6.1)
    }),
    // Custom session plugin — enriches session with memberId + roles + activeSubscription
    customSession(
      async (sessionData) => {
        const user = sessionData.user;
        // Look up the member record and roles for this user
        const member = await db.query.members.findFirst({
          where: eq(members.userId, user.id),
        });

        if (!member) {
          // Cookied user with no member record — no roles, no subscription.
          // Previously returned roles: ['member'] which was semantically wrong
          // (granted booking privileges to potentially-unauthenticated users).
          // Routers check memberId (null → FORBIDDEN), not roles, so this is
          // a correctness fix, not a security fix.
          return {
            ...sessionData,
            user: {
              ...user,
              memberId: null,
              roles: [] as const,
              activeSubscription: null,
            },
          };
        }

        // Fetch role assignments
        const roleAssignmentsList = await db.query.roleAssignments.findMany({
          where: eq(roleAssignments.memberId, member.id),
        });

        // Fetch the member's most recent subscription with plan details.
        // Ordered by createdAt desc so the "current" subscription is first.
        // The status filter is applied in JS below (activeStatuses.includes)
        // because the DB query fetches the most recent regardless of status,
        // then we check if it's in an access-granting state.
        const subscription = await db.query.memberSubscriptions.findFirst({
          where: eq(memberSubscriptions.memberId, member.id),
          with: { plan: true },
          orderBy: desc(memberSubscriptions.createdAt),
        });

        // Build ActiveSubscriptionSummary only if there's a subscription
        // in a status that grants access (active, trialing, past_due, paused).
        const activeStatuses = ['active', 'trialing', 'past_due', 'paused'] as const;
        const activeSubscription =
          subscription && activeStatuses.includes(subscription.status as typeof activeStatuses[number])
            ? {
                planName: subscription.plan.name,
                status: subscription.status as typeof activeStatuses[number],
                currentPeriodEnd: subscription.currentPeriodEnd ?? new Date(0),
                creditsRemaining: subscription.creditsRemaining ?? 0,
              }
            : null;

        return {
          ...sessionData,
          user: {
            ...user,
            memberId: member.id,
            roles: roleAssignmentsList.map((ra) => ra.role),
            activeSubscription,
          },
        };
      },
    ),
  ],
});

export type Session = typeof auth.$Infer.Session;

/**
 * Generates a random 32-byte base64 secret for build/test contexts.
 * Better Auth rejects undefined secrets and known-default strings;
 * a random string passes validation and is never used for actual signing.
 */
function cryptoRandomSecret(): string {
  const { randomBytes } = require('node:crypto') as { randomBytes: (n: number) => Buffer };
  return randomBytes(32).toString('base64');
}
