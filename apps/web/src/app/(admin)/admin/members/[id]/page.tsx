/**
 * F9-10 — Single member detail page
 *
 * SSR page. Shows profile, attendance history, payment history.
 * Role assignment (owner only) via MemberRoleEditor component.
 *
 * Source: MEP Phase 9 F9-10.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { MemberRoleEditor } from '@/components/admin/MemberRoleEditor';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { getSession } from '@/lib/auth';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Member Detail — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminMemberDetailPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await apiCaller();

  const detail = await caller.admin.getMemberDetail({ memberId: id });

  if (!detail) {
    notFound();
  }

  // Check if current user is owner (for role editor visibility)
  const session = await getSession();
  const isOwner = (session?.user.roles as string[] | undefined)?.includes('owner') ?? false;

  const { member, enrollmentHistory, paymentHistory } = detail as {
    member: {
      id: string;
      displayName: string;
      joinedAt: Date;
      phone: string | null;
      user: { email: string };
      roles: { role: string }[];
    };
    enrollmentHistory: unknown[];
    paymentHistory: unknown[];
  };

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin/members"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Back to Members
        </Link>
        <h1
          className="mt-2 font-display text-3xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {member.displayName}
        </h1>
        <p
          className="mt-1 text-sm text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {member.user.email}
        </p>
      </header>

      {/* Profile overview */}
      <section className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-3">
        <div className="bg-sand-50 p-4">
          <p
            className="text-xs uppercase tracking-[0.1em] text-stone-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Joined
          </p>
          <p className="mt-1 text-sm text-stone-900">
            {new Date(member.joinedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="bg-sand-50 p-4">
          <p
            className="text-xs uppercase tracking-[0.1em] text-stone-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Phone
          </p>
          <p className="mt-1 text-sm text-stone-900">{member.phone ?? '—'}</p>
        </div>
        <div className="bg-sand-50 p-4">
          <p
            className="text-xs uppercase tracking-[0.1em] text-stone-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Roles
          </p>
          <p className="mt-1 text-sm text-stone-900">
            {member.roles.map((r: { role: string }) => r.role).join(', ') || 'member'}
          </p>
        </div>
      </section>

      {/* Role editor (owner only) */}
      {isOwner && (
        <section className="border border-stone-200 bg-sand-50 p-6">
          <h2
            className="mb-4 font-display text-xl font-light text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Role Assignment
          </h2>
          <MemberRoleEditor
            memberId={member.id}
            currentRoles={member.roles.map((r: { role: string }) => r.role)}
          />
        </section>
      )}

      {/* Attendance history */}
      <section>
        <h2
          className="mb-4 font-display text-xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Attendance History
        </h2>
        {enrollmentHistory.length === 0 ? (
          <p className="text-sm text-stone-500">No attendance records.</p>
        ) : (
          <div className="border border-stone-200 bg-sand-50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollmentHistory.slice(0, 20).map((e: unknown) => {
                  const entry = e as {
                    id: string;
                    status: string;
                    enrolledAt: Date;
                    session: { startsAt: Date; class: { title: string } };
                  };
                  return (
                    <TableRow key={entry.id}>
                      <TableCell
                        className="text-stone-600"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {new Date(entry.session.startsAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-stone-900">
                        {entry.session.class.title}
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs uppercase tracking-[0.1em] text-stone-500"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {entry.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Payment history */}
      <section>
        <h2
          className="mb-4 font-display text-xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Payment History
        </h2>
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-stone-500">No payment records.</p>
        ) : (
          <div className="border border-stone-200 bg-sand-50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.slice(0, 20).map((p: unknown) => {
                  // V19-5 fix: payment_events has no top-level amountCents column.
                  // The amount lives in the Stripe payload jsonb at payload.amount_received
                  // (in cents). Extract it safely with optional chaining + nullish coalescing.
                  const payment = p as {
                    id: string;
                    type: string;
                    payload: Record<string, unknown> | null;
                    status: string;
                    createdAt: Date;
                  };
                  const amountCents =
                    (payment.payload?.amount_received as number | undefined) ?? 0;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell
                        className="text-stone-600"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {new Date(payment.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-stone-900">{payment.type}</TableCell>
                      <TableCell
                        className="text-stone-600"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        ${(amountCents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs uppercase tracking-[0.1em] text-stone-500"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {payment.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
