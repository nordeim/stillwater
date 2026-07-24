/**
 * F9-07 — ScheduleCalendar: week view with drag-and-drop
 *
 * Client Component. Uses @dnd-kit/core for drag-to-reschedule.
 * Click empty slot → create session dialog (SessionForm).
 * Click existing session → edit dialog.
 * Drag session → updates startsAt + endsAt.
 *
 * Anti-generic: NO default calendar styling. Editorial Calm — 1px rule lines,
 * Warm Mineral palette, JetBrains Mono for time labels.
 *
 * Source: MEP Phase 9 F9-07, PAD §11 (Editorial Calm design system).
 */

'use client';

import { useState, useMemo } from 'react';

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';

import { SessionForm } from './SessionForm';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc/client';


interface ScheduleSession {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  overrideCapacity: number | null;
  isVirtual: boolean;
  class?: { id: string; title: string; level: string };
  instructor?: { id: string; slug: string; user?: { name: string | null } | null };
  room?: { id: string; name: string } | null;
}

interface ScheduleCalendarProps {
  weekStart: Date;
  sessions: ScheduleSession[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(displayHour)}:00 ${period}`;
}

export function ScheduleCalendar({ weekStart, sessions }: ScheduleCalendarProps) {
  const [selectedSession, setSelectedSession] = useState<ScheduleSession | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDateTime, setCreateDateTime] = useState<Date | null>(null);

  const weekStartNormalized = useMemo(() => startOfWeek(weekStart), [weekStart]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // WCAG 2.2 §2.5.7: keyboard alternative for drag-and-drop
    useSensor(KeyboardSensor, {}),
  );

  // v9 V9-4 fix: Wire drag-to-reschedule to the new sessions.update procedure.
  // Previously this was a TODO stub that only showed a toast.
  const updateSession = trpc.sessions.update.useMutation({
    onSuccess: () => toast.success('Session rescheduled'),
    onError: (e) => toast.error(e.message || 'Failed to reschedule session'),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const sessionId = active.id as string;
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Parse the drop target: "day-hour" format (e.g., "2-14" = Tuesday 2pm)
    const [dayStr, hourStr] = (over.id as string).split('-');
    const dayOffset = parseInt(dayStr ?? '0', 10);
    const hour = parseInt(hourStr ?? '0', 10);

    const newStart = new Date(weekStartNormalized);
    newStart.setDate(newStart.getDate() + dayOffset);
    newStart.setHours(hour, 0, 0, 0);

    // Calculate new end time from original duration (preserves class length)
    const durationMs = new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    // v9 V9-4: Call sessions.update with the new start + end times
    updateSession.mutate({
      sessionId,
      startsAt: newStart,
      endsAt: newEnd,
    });
  };

  const handleSlotClick = (dayOffset: number, hour: number) => {
    const dt = new Date(weekStartNormalized);
    dt.setDate(dt.getDate() + dayOffset);
    dt.setHours(hour, 0, 0, 0);
    setCreateDateTime(dt);
    setCreateDialogOpen(true);
  };

  // Group sessions by day + hour
  const sessionGrid = useMemo(() => {
    const grid: Record<string, ScheduleSession> = {};
    for (const session of sessions) {
      const start = new Date(session.startsAt);
      const dayDiff = Math.floor(
        (start.getTime() - weekStartNormalized.getTime()) / (24 * 60 * 60 * 1000)
      );
      const hour = start.getHours();
      if (dayDiff >= 0 && dayDiff < 7) {
        grid[`${String(dayDiff)}-${String(hour)}`] = session;
      }
    }
    return grid;
  }, [sessions, weekStartNormalized]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="border border-stone-200 bg-sand-50">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-stone-200">
          <div className="border-r border-stone-200 p-2" />
          {DAYS.map((day, i) => {
            const date = new Date(weekStartNormalized);
            date.setDate(date.getDate() + i);
            return (
              <div
                key={day}
                className="border-r border-stone-200 p-2 text-center"
              >
                <p
                  className="text-xs uppercase tracking-[0.1em] text-stone-500"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {day}
                </p>
                <p
                  className="text-sm font-medium text-stone-900"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-stone-200"
            >
              <div
                className="border-r border-stone-200 p-2 text-xs text-stone-500"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {formatHour(hour)}
              </div>
              {DAYS.map((_, dayOffset) => {
                const slotKey = `${String(dayOffset)}-${String(hour)}`;
                const session = sessionGrid[slotKey];
                return (
                  <div
                    key={slotKey}
                    id={slotKey}
                    className="min-h-[48px] border-r border-stone-200 p-1"
                    onClick={() => { if (!session) handleSlotClick(dayOffset, hour); }}
                    role={session ? undefined : 'button'}
                    aria-label={session ? undefined : `Create session on ${DAYS[dayOffset] ?? ''} at ${formatHour(hour)}`}
                  >
                    {session ? (
                      <div
                        className="cursor-grab border-l-2 border-clay-400 bg-sand-warm p-1.5"
                        draggable
                      >
                        <p className="truncate text-xs font-medium text-stone-900">
                          {session.class?.title ?? 'Untitled'}
                        </p>
                        <p className="text-xs text-stone-500">
                          {session.instructor?.user?.name ?? session.instructor?.slug ?? 'TBA'}
                        </p>
                      </div>
                    ) : (
                      <div className="h-full w-full cursor-pointer transition-colors hover:bg-sand-warm/50" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Create session dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
          </DialogHeader>
          {createDateTime && (
            <p className="text-sm text-stone-500">
              {createDateTime.toLocaleString('en-US', {
                weekday: 'long',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
          )}
          <SessionForm
            {...(createDateTime
              ? { initialData: { startsAt: createDateTime.toISOString().slice(0, 16) } }
              : {})}
            onSuccess={() => { setCreateDialogOpen(false); }}
            onCancel={() => { setCreateDialogOpen(false); }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit session dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => { if (!open) setSelectedSession(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-stone-500">Class:</span>{' '}
                {selectedSession.class?.title ?? 'Untitled'}
              </p>
              <p>
                <span className="text-stone-500">Instructor:</span>{' '}
                {selectedSession.instructor?.user?.name ?? selectedSession.instructor?.slug ?? 'TBA'}
              </p>
              <p>
                <span className="text-stone-500">Starts:</span>{' '}
                {new Date(selectedSession.startsAt).toLocaleString()}
              </p>
              <p>
                <span className="text-stone-500">Status:</span>{' '}
                <span
                  className="text-xs uppercase tracking-[0.1em]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {selectedSession.status}
                </span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
