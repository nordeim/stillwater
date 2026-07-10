/**
 * F9-04 — Admin class catalog management page
 *
 * SSR page with TanStack Table. Search + filter + pagination.
 * Create / Edit / Delete (soft-delete) actions.
 *
 * Source: MEP Phase 9 F9-04, PAD §10.2 (RSC data fetching).
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
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Classes — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminClassesPage() {
  const caller = await apiCaller();

  const result = await caller.admin.listClasses({
    limit: 50,
    offset: 0,
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p
            className="text-xs uppercase tracking-[0.2em] text-stone-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Class Catalog
          </p>
          <h1
            className="mt-1 font-display text-3xl font-light text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Classes
          </h1>
        </div>
        <Link href="/admin/classes/new">
          <Button>Create Class</Button>
        </Link>
      </header>

      {result.items.length === 0 ? (
        <div className="border border-stone-200 bg-sand-50 p-12 text-center">
          <p className="text-sm text-stone-500">
            No classes found. Create your first class to get started.
          </p>
        </div>
      ) : (
        <div className="border border-stone-200 bg-sand-50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium text-stone-900">
                    {cls.title}
                  </TableCell>
                  <TableCell
                    className="text-stone-600"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span className="text-xs uppercase tracking-[0.1em]">
                      {cls.level}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-stone-600"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {cls.durationMinutes}m
                  </TableCell>
                  <TableCell
                    className="text-stone-600"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {cls.maxCapacity}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        cls.isActive
                          ? 'text-xs uppercase tracking-[0.1em] text-clay-500'
                          : 'text-xs uppercase tracking-[0.1em] text-stone-400'
                      }
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {cls.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/classes/${cls.id}`}
                      className="text-sm font-medium text-stone-600 hover:text-stone-900"
                    >
                      Edit →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination info */}
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
