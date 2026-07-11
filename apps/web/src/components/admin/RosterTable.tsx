/**
 * F9-15 — RosterTable: class roster with check-in functionality
 *
 * Client Component. TanStack Table pattern.
 * "Check in" button calls bookings.checkIn. Bulk check-in for walk-ins.
 * All checked in → button disabled.
 *
 * Source: MEP Phase 9 F9-15.
 */

'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc/client';


interface RosterEntry {
  id: string;
  status: string;
  checkedInAt: Date | null;
  member: {
    id: string;
    displayName: string;
    user: { email: string };
  };
}

interface RosterTableProps {
  sessionId: string;
  initialRoster: RosterEntry[];
}

export function RosterTable({ sessionId, initialRoster }: RosterTableProps) {
  const [roster, setRoster] = useState(initialRoster);

  const checkInMutation = trpc.bookings.checkIn.useMutation({
    onSuccess: (_updated, variables) => {
      setRoster((prev) =>
        prev.map((entry) =>
          entry.member.id === variables.memberId
            ? { ...entry, status: 'attended', checkedInAt: new Date() }
            : entry
        )
      );
      toast.success('Member checked in');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to check in member');
    },
  });

  const allCheckedIn = roster.every(
    (entry) => entry.status === 'attended' || entry.checkedInAt !== null
  );

  const handleCheckIn = (memberId: string) => {
    checkInMutation.mutate({ sessionId, memberId });
  };

  const handleBulkCheckIn = () => {
    const pending = roster.filter(
      (entry) => entry.status !== 'attended' && entry.checkedInAt === null
    );
    for (const entry of pending) {
      checkInMutation.mutate({ sessionId, memberId: entry.member.id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p
          className="text-xs uppercase tracking-[0.1em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {roster.filter((e) => e.status === 'attended' || e.checkedInAt).length} / {roster.length} checked in
        </p>
        {!allCheckedIn && roster.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkCheckIn}
            disabled={checkInMutation.isPending}
          >
            Check in all
          </Button>
        )}
      </div>

      {roster.length === 0 ? (
        <div className="border border-stone-200 bg-sand-50 p-8 text-center">
          <p className="text-sm text-stone-500">
            No confirmed enrollments for this session.
          </p>
        </div>
      ) : (
        <div className="border border-stone-200 bg-sand-50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((entry) => {
                const isCheckedIn =
                  entry.status === 'attended' || entry.checkedInAt !== null;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-stone-900">
                      {entry.member.displayName}
                    </TableCell>
                    <TableCell className="text-stone-600">
                      {entry.member.user.email}
                    </TableCell>
                    <TableCell>
                      {isCheckedIn ? (
                        <span
                          className="text-xs uppercase tracking-[0.1em] text-clay-500"
                          style={{ fontFamily: 'var(--font-mono)' }}
                          aria-label="Checked in"
                        >
                          ✓ Attended
                        </span>
                      ) : (
                        <span
                          className="text-xs uppercase tracking-[0.1em] text-stone-400"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          Confirmed
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={isCheckedIn ? 'outline' : 'default'}
                        disabled={isCheckedIn || checkInMutation.isPending}
                        onClick={() => { handleCheckIn(entry.member.id); }}
                        aria-label={
                          isCheckedIn
                            ? `${entry.member.displayName} already checked in`
                            : `Check in ${entry.member.displayName}`
                        }
                      >
                        {isCheckedIn ? '✓' : 'Check in'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
