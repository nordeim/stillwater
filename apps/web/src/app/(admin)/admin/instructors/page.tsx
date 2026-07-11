/**
 * F9-08 — Admin instructor management page
 *
 * SSR page. Lists instructors sorted by sortOrder. Create / Edit / Deactivate.
 * Reorder via drag-and-drop (Phase 10 — for now, list view with edit links).
 *
 * Source: MEP Phase 9 F9-08.
 */

import Link from 'next/link';

import type { Metadata } from 'next';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Instructors — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminInstructorsPage() {
  const caller = await apiCaller();

  const instructors = await caller.instructors.list();

  // Cast for Drizzle relational type inference (SKILL §9.9 Gotcha 27)
  interface Instructor {
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    published: boolean;
    sortOrder: number;
  }
  const typedInstructors = instructors as unknown as Instructor[];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p
            className="text-xs uppercase tracking-[0.2em] text-stone-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Instructor Management
          </p>
          <h1
            className="mt-1 font-display text-3xl font-light text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Instructors
          </h1>
        </div>
        <Button>Add Instructor</Button>
      </header>

      {typedInstructors.length === 0 ? (
        <div className="border border-stone-200 bg-sand-50 p-12 text-center">
          <p className="text-sm text-stone-500">
            No instructors found. Add your first instructor to get started.
          </p>
        </div>
      ) : (
        <div className="border border-stone-200 bg-sand-50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedInstructors.map((ins) => (
                <TableRow key={ins.id}>
                  <TableCell className="font-medium text-stone-900">
                    {ins.name}
                  </TableCell>
                  <TableCell
                    className="text-stone-600"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {ins.slug}
                  </TableCell>
                  <TableCell
                    className="text-stone-600"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {ins.sortOrder}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        ins.published
                          ? 'text-xs uppercase tracking-[0.1em] text-clay-500'
                          : 'text-xs uppercase tracking-[0.1em] text-stone-400'
                      }
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {ins.published ? 'Published' : 'Hidden'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/instructors/${ins.id}`}
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
    </div>
  );
}
