/**
 * F9-12 — Studio settings page (owner only)
 *
 * SSR page. Studio name, address, phone, hours, pricing, role assignments,
 * feature flags.
 *
 * Protected by (admin)/admin/settings/layout.tsx (requireRole owner).
 *
 * Source: MEP Phase 9 F9-12.
 */

import type { Metadata } from 'next';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Settings — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const caller = await apiCaller();

  // Fetch members with roles for the role assignment section
  const membersResult = await caller.admin.listMembers({
    limit: 100,
    offset: 0,
  });

  return (
    <div className="space-y-8">
      <header>
        <p
          className="text-xs uppercase tracking-[0.2em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Studio Configuration
        </p>
        <h1
          className="mt-1 font-display text-3xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Settings
        </h1>
      </header>

      {/* Studio info (placeholder — Phase 10 will add site_settings table) */}
      <section className="border border-stone-200 bg-sand-50 p-6">
        <h2
          className="mb-4 font-display text-xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Studio Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p
              className="text-xs uppercase tracking-[0.1em] text-stone-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Studio Name
            </p>
            <p className="mt-1 text-sm text-stone-900">Stillwater Yoga Studio</p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-[0.1em] text-stone-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Location
            </p>
            <p className="mt-1 text-sm text-stone-900">Southeast Portland, OR</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-stone-500">
          Full studio settings editing requires a site_settings table (Phase 10 enhancement).
        </p>
      </section>

      {/* Role assignments overview */}
      <section className="border border-stone-200 bg-sand-50 p-6">
        <h2
          className="mb-4 font-display text-xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Role Assignments
        </h2>
        <p className="mb-4 text-sm text-stone-500">
          Manage role assignments from individual member detail pages.
          Members with elevated roles:
        </p>
        <ul className="space-y-2">
          {membersResult.items
            .filter((m: unknown) => {
              const member = m as { roles: Array<{ role: string }> };
              return member.roles.some(
                (r: { role: string }) =>
                  r.role === 'staff' || r.role === 'manager' || r.role === 'owner',
              );
            })
            .map((m: unknown) => {
              const member = m as {
                id: string;
                displayName: string;
                user: { email: string };
                roles: Array<{ role: string }>;
              };
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between border-b border-stone-200 pb-2"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {member.displayName}
                    </p>
                    <p className="text-xs text-stone-500">{member.user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {member.roles.map((r: { role: string }, i: number) => (
                      <span
                        key={i}
                        className="text-xs uppercase tracking-[0.1em] text-stone-600"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {r.role}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
        </ul>
        {membersResult.items.filter((m: unknown) => {
          const member = m as { roles: Array<{ role: string }> };
          return member.roles.some(
            (r: { role: string }) =>
              r.role === 'staff' || r.role === 'manager' || r.role === 'owner',
          );
        }).length === 0 && (
          <p className="text-sm text-stone-500">
            No staff/manager/owner roles assigned yet.
          </p>
        )}
      </section>

      {/* Feature flags (placeholder) */}
      <section className="border border-stone-200 bg-sand-50 p-6">
        <h2
          className="mb-4 font-display text-xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Feature Flags
        </h2>
        <p className="text-sm text-stone-500">
          Feature flag management requires PostHog integration (Phase 10).
          The `nextgen_booking` flag (Q10 resolution) will be configurable here.
        </p>
      </section>
    </div>
  );
}
