/**
 * F9-02 — AdminShell: sidebar + topbar for the admin surface
 *
 * Server Component. Receives the authenticated session from the layout
 * and renders the admin navigation shell with role-based link visibility.
 *
 * Anti-generic: NO drop shadows, NO rounded corners, single 1px rule lines
 * as depth signals. Warm Mineral palette. JetBrains Mono for data labels.
 *
 * Source: MEP Phase 9 F9-02, PAD §10.1 (component hierarchy),
 *         PAD §11 (Editorial Calm design system).
 */

import Link from 'next/link';

import type { StudioRole } from '@stillwater/auth';

import { SignOutButton } from '@/components/auth/SignOutButton';

interface AdminShellProps {
  children: React.ReactNode;
  session: {
    user: {
      id: string;
      email: string;
      name: string | null;
      memberId: string | null;
      roles: StudioRole[];
    };
  };
}

interface NavItem {
  href: string;
  label: string;
  minRole: StudioRole; // minimum role required to see this link
}

// Role hierarchy: owner > manager > staff (for visibility checks)
const ROLE_LEVEL: Record<StudioRole, number> = {
  member: 0,
  instructor: 0,
  staff: 1,
  manager: 2,
  owner: 3,
};

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', minRole: 'staff' },
  { href: '/admin/classes', label: 'Classes', minRole: 'staff' },
  { href: '/admin/schedule', label: 'Schedule', minRole: 'staff' },
  { href: '/admin/instructors', label: 'Instructors', minRole: 'staff' },
  { href: '/admin/members', label: 'Members', minRole: 'staff' },
  { href: '/admin/audit-log', label: 'Audit Log', minRole: 'manager' },
  { href: '/admin/revenue', label: 'Revenue', minRole: 'manager' },
  { href: '/admin/settings', label: 'Settings', minRole: 'owner' },
];

function canSeeLink(userRoles: StudioRole[], minRole: StudioRole): boolean {
  const minLevel = ROLE_LEVEL[minRole];
  return userRoles.some((role) => ROLE_LEVEL[role] >= minLevel);
}

export function AdminShell({ children, session }: AdminShellProps) {
  const { user } = session;
  const displayName = user.name ?? user.email;
  const primaryRole = user.roles[0] ?? 'staff';

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Topbar — single 1px rule, no shadow */}
      <header className="flex items-center justify-between border-b border-stone-200 bg-sand-50 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/admin"
            className="font-display text-xl font-light tracking-tight text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Stillwater <span className="text-stone-400">Admin</span>
          </Link>
        </div>

        {/* User badge + sign-out — flush right */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-stone-900">{displayName}</p>
            <p
              className="text-xs uppercase tracking-[0.1em] text-stone-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {primaryRole}
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — 240px fixed, 1px right rule */}
        <aside className="w-60 shrink-0 border-r border-stone-200 bg-sand-50">
          <nav
            role="navigation"
            aria-label="Admin navigation"
            className="flex flex-col gap-0 p-4"
          >
            {NAV_ITEMS.filter((item) => canSeeLink(user.roles, item.minRole)).map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-l-2 border-transparent px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-clay-400 hover:bg-sand-warm hover:text-stone-900"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="min-w-0 flex-1 bg-sand-50">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
