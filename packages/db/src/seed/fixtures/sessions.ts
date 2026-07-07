/**
 * F1-20 — Session fixtures
 *
 * 7 days of sessions (one per day for the current week).
 * Mix of all 4 class types, with one full session for waitlist demo.
 *
 * Source: MASTER_EXECUTION_PLAN.md F1-20.
 */

import type { InferInsertModel } from 'drizzle-orm';
import { classSessions, rooms } from '../../schema';

type NewRoom = InferInsertModel<typeof rooms>;
type NewSession = InferInsertModel<typeof classSessions>;

export const demoRooms: NewRoom[] = [
  {
    id: '00000000-0000-4000-e000-000000000001',
    name: 'Main Studio',
    capacity: 14,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-e000-000000000002',
    name: 'Quiet Room',
    capacity: 8,
    isActive: true,
  },
];

/**
 * Generate 7 days of sessions starting from tomorrow.
 * Each session is at 7:00 AM, with one session per day.
 * The 3rd session (Ashtanga) is marked as having capacity 0 remaining
 * for waitlist demo (achieved by setting overrideCapacity low).
 */
export function generateDemoSessions(): NewSession[] {
  const sessions: NewSession[] = [];
  const instructorIds = [
    '00000000-0000-4000-b000-000000000001', // Mei Tanaka
    '00000000-0000-4000-b000-000000000002', // James Harlow
    '00000000-0000-4000-b000-000000000003', // Aiko Mori
  ];
  const classConfigs: Array<{
    classId: string;
    durationMin: number;
    instructorIndex: number;
    roomId: string;
    overrideCapacity?: number; // for waitlist demo
  }> = [
    {
      classId: '00000000-0000-4000-d000-000000000001', // Morning Vinyasa Flow
      durationMin: 60,
      instructorIndex: 0, // Mei
      roomId: '00000000-0000-4000-e000-000000000001', // Main Studio
    },
    {
      classId: '00000000-0000-4000-d000-000000000002', // Ashtanga Primary Series
      durationMin: 90,
      instructorIndex: 1, // James
      roomId: '00000000-0000-4000-e000-000000000001',
      overrideCapacity: 0, // FULL — for waitlist demo
    },
    {
      classId: '00000000-0000-4000-d000-000000000003', // Yin & Meditation
      durationMin: 75,
      instructorIndex: 2, // Aiko
      roomId: '00000000-0000-4000-e000-000000000002', // Quiet Room
    },
    {
      classId: '00000000-0000-4000-d000-000000000004', // Restorative Yoga
      durationMin: 60,
      instructorIndex: 2, // Aiko
      roomId: '00000000-0000-4000-e000-000000000002',
    },
    {
      classId: '00000000-0000-4000-d000-000000000001', // Morning Vinyasa Flow
      durationMin: 60,
      instructorIndex: 0, // Mei
      roomId: '00000000-0000-4000-e000-000000000001',
    },
    {
      classId: '00000000-0000-4000-d000-000000000002', // Ashtanga Primary Series
      durationMin: 90,
      instructorIndex: 1, // James
      roomId: '00000000-0000-4000-e000-000000000001',
    },
    {
      classId: '00000000-0000-4000-d000-000000000003', // Yin & Meditation
      durationMin: 75,
      instructorIndex: 2, // Aiko
      roomId: '00000000-0000-4000-e000-000000000002',
    },
  ];

  const now = new Date();
  // Start from tomorrow at 7:00 AM
  const startDate = new Date(now);
  startDate.setDate(now.getDate() + 1);
  startDate.setHours(7, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const config = classConfigs[i]!;
    const startsAt = new Date(startDate);
    startsAt.setDate(startDate.getDate() + i);
    const endsAt = new Date(startsAt.getTime() + config.durationMin * 60 * 1000);

    sessions.push({
      id: `00000000-0000-4000-f000-00000000000${i + 1}`,
      classId: config.classId,
      instructorId: instructorIds[config.instructorIndex]!,
      roomId: config.roomId,
      startsAt,
      endsAt,
      status: 'scheduled',
      overrideCapacity: config.overrideCapacity ?? null,
      isVirtual: false,
    });
  }

  return sessions;
}

export const demoSessions: NewSession[] = generateDemoSessions();
