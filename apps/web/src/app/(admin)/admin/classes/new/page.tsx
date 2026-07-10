/**
 * F9-05 — Create new class page
 *
 * Renders ClassForm in create mode.
 *
 * Source: MEP Phase 9 F9-05.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ClassForm } from '@/components/admin/ClassForm';

export const metadata: Metadata = {
  title: 'Create Class — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminClassNewPage() {
  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin/classes"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Back to Classes
        </Link>
        <h1
          className="mt-2 font-display text-3xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Create New Class
        </h1>
      </header>

      <section className="max-w-2xl border border-stone-200 bg-sand-50 p-6">
        <ClassForm
          onSuccess={() => {
            // Redirect handled by parent window
          }}
          onCancel={() => {
            window.history.back();
          }}
        />
      </section>
    </div>
  );
}
