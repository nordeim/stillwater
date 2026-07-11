/**
 * F9-14 — RevenueChart: MRR chart using Recharts
 *
 * Client Component. Receives data array of { month, mrr } and renders
 * a line chart. Anti-generic: custom Stillwater tokens (stone/clay palette,
 * no default Recharts styling).
 *
 * Source: MEP Phase 9 F9-14, PAD §11 (Editorial Calm design system).
 */

'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface RevenueChartProps {
  data: { month: string; mrr: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-stone-200 bg-sand-50 p-12 text-center">
        <p className="text-sm text-stone-500">
          No revenue data for the selected period.
        </p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full border border-stone-200 bg-sand-50 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="1 0"
            stroke="#D4CFC9"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            stroke="#8C7B6E"
            tick={{
              fill: '#8C7B6E',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
            }}
            tickLine={false}
            axisLine={{ stroke: '#D4CFC9' }}
          />
          <YAxis
            stroke="#8C7B6E"
            tick={{
              fill: '#8C7B6E',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
            }}
            tickLine={false}
            axisLine={{ stroke: '#D4CFC9' }}
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#F5F0E8',
              border: '1px solid #D4CFC9',
              borderRadius: '0',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#3D3832' }}
            itemStyle={{ color: '#9E5E44' }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'MRR']}
          />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke="#9E5E44"
            strokeWidth={2}
            dot={{ fill: '#9E5E44', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
