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
import { db } from '@stillwater/db';
import { resend } from './resend-client';

// Use process.env directly (not Zod env module) per SKILL §3.4
const secret = process.env['BETTER_AUTH_SECRET'] ?? 'placeholder-secret-at-least-32-characters-long';
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
  secret,
  baseURL,
  emailAndPassword: { enabled: false },
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
    // Custom session plugin — enriches session with memberId + roles
    customSession(
      async (sessionData) => {
        const user = sessionData.user;
        // Look up the member record and roles for this user
        const member = await db.query.members.findFirst({
          where: (m, { eq }) => eq(m.userId, user.id),
        });

        if (!member) {
          return {
            ...sessionData,
            user: {
              ...user,
              memberId: null,
              roles: ['member'] as const,
              activeSubscription: null,
            },
          };
        }

        // Fetch role assignments
        const roleAssignments = await db.query.roleAssignments.findMany({
          where: (ra, { eq }) => eq(ra.memberId, member.id),
        });

        return {
          ...sessionData,
          user: {
            ...user,
            memberId: member.id,
            roles: roleAssignments.map((ra) => ra.role),
            activeSubscription: null, // Phase 7: populate from member_subscriptions
          },
        };
      },
    ),
  ],
});

export type Session = typeof auth.$Infer.Session;
