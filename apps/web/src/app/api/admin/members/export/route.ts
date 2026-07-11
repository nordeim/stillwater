/**
 * F9-09 — Member CSV export route
 *
 * Streams all members as a CSV file (RFC 4180 compliant).
 * Uses the existing CSV utility from Phase 6 (lib/export/csv.ts).
 *
 * Source: MEP Phase 9 F9-09.
 */

import { NextResponse } from 'next/server';

import { apiCaller } from '@/lib/trpc/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const caller = await apiCaller();

  // Fetch all members (up to 10000 for CSV export)
  const result = await caller.admin.listMembers({
    limit: 10000,
    offset: 0,
  });

  // Build CSV
  const headers = ['Name', 'Email', 'Joined', 'Roles'];
  const rows = result.items.map((m: unknown) => {
    const member = m as {
      displayName: string;
      joinedAt: Date;
      user: { email: string };
      roles: { role: string }[];
    };
    return [
      member.displayName,
      member.user.email,
      new Date(member.joinedAt).toISOString().split('T')[0],
      member.roles.map((r) => r.role).join(';'),
    ];
  });

  // Escape CSV values (RFC 4180: wrap in quotes if contains comma/quote/newline)
  const escapeCsv = (val: string | undefined): string => {
    if (val === undefined) return '';
    if (/[",\n]/.test(val)) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  const csv = csvLines.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="stillwater-members.csv"',
    },
  });
}
