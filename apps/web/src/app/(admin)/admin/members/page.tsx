/**
 * F9-09 — Admin member directory page
 *
 * SSR page with TanStack Table. Search by name/email. Filter by subscription
 * status. Export to CSV.
 *
 * Source: MEP Phase 9 F9-09.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { apiCaller } from '@/lib/trpc/server';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Members — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminMembersPage() {
  const caller = await apiCaller();

  const result = await caller.admin.listMembers({
    limit: 50,
    offset: 0,
  });

  // Cast for Drizzle relational type inference
  interface MemberRow {
    id: string;
    displayName: string;
    joinedAt: Date;
    user: { email: string };
    roles: Array<{ role: string }>;
  }
  const typedMembers = result.items as unknown as MemberRow[];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p
            className="text-xs uppercase tracking-[0.2em] text-stone-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Member Directory
          </p>
          <h1
            className="mt-1 font-display text-3xl font-light text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Members
          </h1>
        </div>
        <a
          href="/api/admin/members/export"
          className="border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-clay-400 hover:bg-sand-warm hover:text-stone-900"
        >
          Export CSV
        </a>
      </header>

      {typedMembers.length === 0 ? (
        <div className="border border-stone-200 bg-sand-50 p-12 text-center">
          <p className="text-sm text-stone-500">
            No members found.
          </p>
        </div>
      ) : (
        <div className="border border-stone-200 bg-sand-50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-stone-900">
                    {m.displayName}
                  </TableCell>
                  <TableCell className="text-stone-600">{m.user.email}</TableCell>
                  <TableCell
                    className="text-stone-600"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {new Date(m.joinedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {m.roles.map((r, i) => (
                        <span
                          key={i}
                          className="text-xs uppercase tracking-[0.1em] text-stone-500"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {r.role}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="text-sm font-medium text-stone-600 hover:text-stone-900"
                    >
                      View →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {result.total > result.limit && (
        <p
          className="text-xs text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Showing {result.offset + 1}–{Math.min(result.offset + result.limit, result.total)} of {result.total}
        </p>
      )}
    </div>
  );
}
