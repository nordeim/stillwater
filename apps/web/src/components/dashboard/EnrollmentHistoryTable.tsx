'use client';

import { exportToCSV } from '@/lib/export/csv';

interface HistoryEntry {
  id: string;
  status: string;
  enrolledAt: Date;
  cancelledAt: Date | null;
  session: { startsAt: Date; class: { name: string } };
}

export function EnrollmentHistoryTable({ entries }: { entries: HistoryEntry[] }) {
  const handleExportCSV = () => {
    const csvData = entries.map((e) => ({
      Class: e.session.class.name,
      Date: new Date(e.session.startsAt).toLocaleDateString('en-US'),
      Status: e.status,
      Enrolled: new Date(e.enrolledAt).toLocaleDateString('en-US'),
      Cancelled: e.cancelledAt ? new Date(e.cancelledAt).toLocaleDateString('en-US') : '',
    }));
    exportToCSV(csvData, 'enrollment-history');
  };

  if (entries.length === 0) {
    return (
      <div className="border border-stone-200 bg-sand-50 p-8 text-center">
        <p className="text-stone-600">No enrollment history yet.</p>
        <a
          href="/schedule"
          className="mt-4 inline-block text-sm font-medium text-clay-500 underline-offset-4 hover:underline"
        >
          Book a class →
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleExportCSV}
          className="min-h-[44px] border border-stone-400 px-4 py-2 text-xs font-medium text-stone-900 transition-colors hover:bg-sand-warm"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-300">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Class
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Enrolled
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-stone-200">
                <td className="px-4 py-3 text-sm text-stone-900">
                  {entry.session.class.name}
                </td>
                <td className="px-4 py-3 text-sm text-stone-600">
                  {new Date(entry.session.startsAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium capitalize ${
                      entry.status === 'confirmed'
                        ? 'bg-success/10 text-success'
                        : entry.status === 'cancelled'
                          ? 'bg-error/10 text-error'
                          : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-stone-500">
                  {new Date(entry.enrolledAt).toLocaleDateString('en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
