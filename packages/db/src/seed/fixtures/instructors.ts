/**
 * F1-18 — Instructor fixtures
 *
 * 3 demo instructors matching the mockup: Mei Tanaka, James Harlow, Aiko Mori.
 * Each instructor is linked to a member record (instructors are members too).
 * Source: MASTER_EXECUTION_PLAN.md F1-18, static_landing_page_mockup.html.
 */

import type { InferInsertModel } from 'drizzle-orm';
import { instructors } from '../../schema';

type NewInstructor = InferInsertModel<typeof instructors>;

export interface DemoInstructor extends NewInstructor {
  /** The memberId this instructor is linked to */
  memberId: string;
}

export const demoInstructors: DemoInstructor[] = [
  {
    id: '00000000-0000-4000-b000-000000000001',
    userId: '00000000-0000-4000-a000-000000000002', // Mei Tanaka's user
    memberId: '00000000-0000-4000-a000-000000000012',
    slug: 'mei-tanaka',
    bio: 'E-RYT 500. Mei brings 15 years of practice to every class, weaving breath and movement into a meditation in motion. Her Vinyasa sequences are challenging yet accessible, always returning to the foundation of mindful awareness.',
    specialties: ['Vinyasa', 'Ashtanga', 'Pranayama'],
    imageKey: 'instructors/mei-tanaka-portrait',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: '00000000-0000-4000-b000-000000000002',
    userId: '00000000-0000-4000-a000-000000000003', // James Harlow's user
    memberId: '00000000-0000-4000-a000-000000000013',
    slug: 'james-harlow',
    bio: 'RYT 500. James found yoga through injury recovery and now teaches with a focus on alignment and sustainability. His Ashtanga classes honor tradition while his Yin classes invite deep release.',
    specialties: ['Ashtanga', 'Yin', 'Alignment'],
    imageKey: 'instructors/james-harlow-portrait',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: '00000000-0000-4000-b000-000000000003',
    userId: '00000000-0000-4000-a000-000000000004', // Aiko Mori's user
    memberId: '00000000-0000-4000-a000-000000000014',
    slug: 'aiko-mori',
    bio: 'RYT 200. Aiko teaches restorative and meditative practices as an act of radical care. Her classes are an invitation to slow down, listen, and return to the body\'s wisdom.',
    specialties: ['Yin', 'Meditation', 'Restorative'],
    imageKey: 'instructors/aiko-mori-portrait',
    isActive: true,
    sortOrder: 3,
  },
];
