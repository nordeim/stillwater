/**
 * F1-19 — Class fixtures
 *
 * 4 demo classes matching the mockup:
 *   1. Morning Vinyasa Flow (60min, all levels)
 *   2. Ashtanga Primary Series (90min, intermediate)
 *   3. Yin & Meditation (75min, all levels)
 *   4. Restorative Yoga (60min, beginner)
 *
 * Source: MASTER_EXECUTION_PLAN.md F1-19, static_landing_page_mockup.html.
 */

import type { InferInsertModel } from 'drizzle-orm';
import { classes, classStyles } from '../../schema';

type NewClassStyle = InferInsertModel<typeof classStyles>;
type NewClass = InferInsertModel<typeof classes>;

export const demoClassStyles: NewClassStyle[] = [
  {
    id: '00000000-0000-4000-c000-000000000001',
    name: 'Vinyasa',
    description: 'Flowing sequences linking breath to movement.',
    color: '#7B9EA8',
  },
  {
    id: '00000000-0000-4000-c000-000000000002',
    name: 'Ashtanga',
    description: 'A rigorous, structured practice following the traditional series.',
    color: '#9E5E44',
  },
  {
    id: '00000000-0000-4000-c000-000000000003',
    name: 'Yin',
    description: 'Long-held passive stretches targeting deep connective tissue.',
    color: '#5D8A99',
  },
  {
    id: '00000000-0000-4000-c000-000000000004',
    name: 'Restorative',
    description: 'Gentle, supported poses for deep relaxation and healing.',
    color: '#C4856A',
  },
];

export const demoClasses: NewClass[] = [
  {
    id: '00000000-0000-4000-d000-000000000001',
    slug: 'morning-vinyasa-flow',
    title: 'Morning Vinyasa Flow',
    description:
      'Begin your day with breath-synchronized movement. This all-levels Vinyasa class warms the body, focuses the mind, and sets an intentional tone for the hours ahead. Expect sun salutations, standing sequences, and a grounding closing.',
    styleId: '00000000-0000-4000-c000-000000000001', // Vinyasa
    level: 'all',
    durationMinutes: 60,
    maxCapacity: 12,
    isActive: true,
    imageKey: 'classes/morning-vinyasa',
    metaTitle: 'Morning Vinyasa Flow — Stillwater Yoga',
    metaDescription:
      'Start your day with an all-levels Vinyasa flow class in Southeast Portland. Breath, movement, intention.',
  },
  {
    id: '00000000-0000-4000-d000-000000000002',
    slug: 'ashtanga-primary-series',
    title: 'Ashtanga Primary Series',
    description:
      'The traditional First Series as taught by Sri K. Pattabhi Jois. A fixed sequence of postures building heat, strength, and flexibility. Prior yoga experience recommended — this is a physically demanding practice.',
    styleId: '00000000-0000-4000-c000-000000000002', // Ashtanga
    level: 'intermediate',
    durationMinutes: 90,
    maxCapacity: 10,
    isActive: true,
    imageKey: 'classes/ashtanga-primary',
    metaTitle: 'Ashtanga Primary Series — Stillwater Yoga',
    metaDescription:
      'Traditional Ashtanga First Series in Portland. A rigorous, structured practice for experienced students.',
  },
  {
    id: '00000000-0000-4000-d000-000000000003',
    slug: 'yin-and-meditation',
    title: 'Yin & Meditation',
    description:
      'A slow, contemplative practice. Long-held passive stretches (3-5 minutes per pose) target deep connective tissue, preparing body and mind for a guided meditation. All levels welcome — this is an introspective, not athletic, practice.',
    styleId: '00000000-0000-4000-c000-000000000003', // Yin
    level: 'all',
    durationMinutes: 75,
    maxCapacity: 14,
    isActive: true,
    imageKey: 'classes/yin-meditation',
    metaTitle: 'Yin & Meditation — Stillwater Yoga',
    metaDescription:
      'Slow down with Yin Yoga and guided meditation in Portland. Deep stretches, mindful presence.',
  },
  {
    id: '00000000-0000-4000-d000-000000000004',
    slug: 'restorative-yoga',
    title: 'Restorative Yoga',
    description:
      'Complete relaxation through fully supported poses. Bolsters, blankets, and blocks cradle the body so you can release completely. Ideal for stress relief, recovery, injury, or simply being cared for. No experience necessary.',
    styleId: '00000000-0000-4000-c000-000000000004', // Restorative
    level: 'beginner',
    durationMinutes: 60,
    maxCapacity: 10,
    isActive: true,
    imageKey: 'classes/restorative',
    metaTitle: 'Restorative Yoga — Stillwater Yoga',
    metaDescription:
      'Gentle, supported restorative yoga in Portland. Deep relaxation with bolsters, blankets, and breath.',
  },
];
