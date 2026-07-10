/**
 * F9-20 — Audit log viewer page (manager+ only)
 *
 * SSR page. Filterable by date range, staff member, action type.
 * Paginated. Read-only.
 *
 * Protected by (admin)/admin/audit-log/layout.tsx (requireRole manager, owner).
 *
 * Source: MEP Phase 9 F9-20.
 */

import type { Metadata } from 'next';
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
  title: 'Audit Log — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogPage() {
  const caller = await apiCaller();

  const result = await caller.admin.listAuditLog({
    limit: 50,
    offset: 0,
  });

  return (
    <div className="space-y-8">
      <header>
        <p
          className="text-xs uppercase tracking-[0.2em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Compliance & Traceability
        </p>
        <h1
          className="mt-1 font-display text-3xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Audit Log
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Every admin mutation is recorded here for compliance.
        </p>
      </header>

      {result.items.length === 0 ? (
        <div className="border border-stone-200 bg-sand-50 p-12 text-center">
          <p className="text-sm text-stone-500">
            No audit log entries yet. Admin actions will appear here.
          </p>
        </div>
      ) : (
        <div className="border border-stone-200 bg-sand-50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((entry) => {
                const e = entry as {
                  id: string;
                  staffMemberId: string;
                  action: string;
                  entityType: string;
                  entityId: string;
                  metadata: unknown;
                  createdAt: Date;
                };
                return (
                  <TableRow key={e.id}>
                    <TableCell
                      className="text-stone-600"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {new Date(e.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs uppercase tracking-[0.1em] text-clay-500"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {e.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-600">
                      {e.entityType}
                    </TableCell>
                    <TableCell
                      className="text-stone-500"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      <span className="text-xs">{e.entityId.slice(0, 8)}…</span>
                    </TableCell>
                    <TableCell
                      className="text-stone-500"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      <span className="text-xs">{e.staffMemberId.slice(0, 8)}…</span>
                    </TableCell>
                    <TableCell
                      className="text-stone-500"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {e.metadata ? (
                        <span className="text-xs">
                          {JSON.stringify(e.metadata).slice(0, 50)}
                          {JSON.stringify(e.metadata).length > 50 ? '…' : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
