/**
 * F1-14b — Drizzle Relational Query Builder (RQB) relations
 *
 * Defines all foreign-key relationships for Drizzle's v1 Relational Query API.
 * Without these, any `db.query.*.findFirst({ with: { ... } })` call throws
 * `Cannot read properties of undefined (reading 'referencedTable')` at runtime.
 *
 * The `relations()` function from `drizzle-orm` tells Drizzle how tables connect,
 * enabling nested `with: { relation: true }` queries to resolve at both the
 * TypeScript type level AND at runtime.
 *
 * Tables WITHOUT foreign keys (rooms, classStyles, membershipPlans) only need
 * inverse `many()` relations if other tables reference them.
 *
 * Source: Drizzle RQB docs (https://orm.drizzle.team/docs/rqb),
 *         ADR-003 (Drizzle over Prisma).
 *
 * Verification: every FK declared in `*.ts` schema files has a corresponding
 * `one()` relation here, and every parent table referenced by FK has a `many()`.
 */

import { relations } from 'drizzle-orm';
import {
  users,
  members,
  instructors,
  classStyles,
  classes,
  rooms,
  classSessions,
  enrollments,
  waitlistEntries,
  membershipPlans,
  memberSubscriptions,
  classPackages,
  paymentEvents,
  roleAssignments,
  auditLog,
} from './index';

// ─── Identity ────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  // A user has at most one member profile
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
  // A user has at most one instructor profile
  instructor: one(instructors, {
    fields: [users.id],
    references: [instructors.userId],
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  // Inverse of members.userId → users.id
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  // A member has many enrollments
  enrollments: many(enrollments),
  // A member has many waitlist entries
  waitlistEntries: many(waitlistEntries),
  // A member has many subscriptions
  subscriptions: many(memberSubscriptions),
  // A member has many credit packages
  classPackages: many(classPackages),
  // A member has many payment events
  paymentEvents: many(paymentEvents),
  // A member has many role assignments.
  // UI code uses `with: { roles: true }` and `member.roles.map(...)` — the
  // `roles` alias below is the ONLY relation name exposed to consumers.
  // (Previously a duplicate `roleAssignments: many()` existed alongside
  // this alias, which created an ambiguous relation graph in Drizzle RQB
  // and could throw "conflict in relations definitions" at runtime.
  // Removed because zero consumers use `with: { roleAssignments: true }`.)
  roles: many(roleAssignments),
  // A member (as staff) has many audit log entries
  auditLogs: many(auditLog),
}));

export const instructorsRelations = relations(instructors, ({ one, many }) => ({
  // Inverse of instructors.userId → users.id
  user: one(users, {
    fields: [instructors.userId],
    references: [users.id],
  }),
  // An instructor has many sessions
  sessions: many(classSessions),
}));

// ─── Class Catalog ───────────────────────────────────────────────────

export const classStylesRelations = relations(classStyles, ({ many }) => ({
  // Inverse of classes.styleId → classStyles.id
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  // Inverse of classes.styleId → classStyles.id
  style: one(classStyles, {
    fields: [classes.styleId],
    references: [classStyles.id],
  }),
  // A class has many sessions
  sessions: many(classSessions),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  // Inverse of classSessions.roomId → rooms.id
  sessions: many(classSessions),
}));

// ─── Booking ─────────────────────────────────────────────────────────

export const classSessionsRelations = relations(
  classSessions,
  ({ one, many }) => ({
    // Inverse of classSessions.classId → classes.id
    class: one(classes, {
      fields: [classSessions.classId],
      references: [classes.id],
    }),
    // Inverse of classSessions.instructorId → instructors.id
    instructor: one(instructors, {
      fields: [classSessions.instructorId],
      references: [instructors.id],
    }),
    // Inverse of classSessions.roomId → rooms.id (nullable)
    room: one(rooms, {
      fields: [classSessions.roomId],
      references: [rooms.id],
    }),
    // A session has many enrollments
    enrollments: many(enrollments),
    // A session has many waitlist entries
    waitlistEntries: many(waitlistEntries),
  }),
);

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  // Inverse of enrollments.sessionId → classSessions.id
  session: one(classSessions, {
    fields: [enrollments.sessionId],
    references: [classSessions.id],
  }),
  // Inverse of enrollments.memberId → members.id
  member: one(members, {
    fields: [enrollments.memberId],
    references: [members.id],
  }),
}));

export const waitlistEntriesRelations = relations(
  waitlistEntries,
  ({ one }) => ({
    // Inverse of waitlistEntries.sessionId → classSessions.id
    session: one(classSessions, {
      fields: [waitlistEntries.sessionId],
      references: [classSessions.id],
    }),
    // Inverse of waitlistEntries.memberId → members.id
    member: one(members, {
      fields: [waitlistEntries.memberId],
      references: [members.id],
    }),
  }),
);

// ─── Billing ─────────────────────────────────────────────────────────

export const membershipPlansRelations = relations(
  membershipPlans,
  ({ many }) => ({
    // Inverse of memberSubscriptions.planId → membershipPlans.id
    subscriptions: many(memberSubscriptions),
  }),
);

export const memberSubscriptionsRelations = relations(
  memberSubscriptions,
  ({ one }) => ({
    // Inverse of memberSubscriptions.memberId → members.id
    member: one(members, {
      fields: [memberSubscriptions.memberId],
      references: [members.id],
    }),
    // Inverse of memberSubscriptions.planId → membershipPlans.id
    plan: one(membershipPlans, {
      fields: [memberSubscriptions.planId],
      references: [membershipPlans.id],
    }),
  }),
);

export const classPackagesRelations = relations(classPackages, ({ one }) => ({
  // Inverse of classPackages.memberId → members.id
  member: one(members, {
    fields: [classPackages.memberId],
    references: [members.id],
  }),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  // Inverse of paymentEvents.memberId → members.id (nullable — set null on member delete)
  member: one(members, {
    fields: [paymentEvents.memberId],
    references: [members.id],
  }),
}));

// ─── RBAC ────────────────────────────────────────────────────────────

export const roleAssignmentsRelations = relations(roleAssignments, ({ one }) => ({
  // Inverse of roleAssignments.memberId → members.id
  member: one(members, {
    fields: [roleAssignments.memberId],
    references: [members.id],
  }),
}));

// ─── Audit (Phase 9) ─────────────────────────────────────────────────

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  // Inverse of auditLog.staffMemberId → members.id
  staffMember: one(members, {
    fields: [auditLog.staffMemberId],
    references: [members.id],
  }),
}));
