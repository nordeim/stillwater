/**
 * F9-05 — Single class editor page
 *
 * SSR page. Loads class by ID, renders ClassForm for editing.
 * Also shows sessions list for this class + "Schedule new session" CTA.
 *
 * Source: MEP Phase 9 F9-05.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiCaller } from '@/lib/trpc/server';
import { ClassForm } from '@/components/admin/ClassForm';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Edit Class — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminClassEditPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await apiCaller();

  // Fetch all classes and find by ID (classes router doesn't have getById yet)
  const classesResult = await caller.admin.listClasses({
    limit: 500,
    offset: 0,
  });
  const cls = classesResult.items.find((c) => c.id === id);

  if (!cls) {
    notFound();
  }

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
          Edit: {cls.title}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Edit form */}
        <section className="border border-stone-200 bg-sand-50 p-6">
          <h2
            className="mb-6 font-display text-xl font-light text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Class Details
          </h2>
          <ClassForm
            classId={cls.id}
            initialData={{
              title: cls.title,
              slug: cls.slug,
              description: cls.description ?? undefined,
              level: cls.level,
              durationMinutes: cls.durationMinutes,
              maxCapacity: cls.maxCapacity,
              imageKey: cls.imageKey ?? undefined,
              metaTitle: cls.metaTitle ?? undefined,
              metaDescription: cls.metaDescription ?? undefined,
            }}
            onSuccess={() => {
              // Form handles toast; page stays for continued editing
            }}
          />
        </section>

        {/* Sessions list */}
        <section className="border border-stone-200 bg-sand-50 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2
              className="font-display text-xl font-light text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Scheduled Sessions
            </h2>
            <Link href="/admin/schedule">
              <Button variant="outline" size="sm">
                Schedule New
              </Button>
            </Link>
          </div>
          <p className="text-sm text-stone-500">
            Sessions for this class are managed in the Schedule calendar.
          </p>
        </section>
      </div>
    </div>
  );
}
