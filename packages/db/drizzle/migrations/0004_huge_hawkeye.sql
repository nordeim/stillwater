-- C1 fix: Add dedup columns for cron-triggered reminder emails.
-- These columns track when a reminder was last sent for an enrollment,
-- preventing duplicate emails when the cron fires multiple times within
-- the reminder window (e.g., 2h window / 15min cadence = 8 captures).
ALTER TABLE "enrollments" ADD COLUMN "reminder_24h_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "reminder_1h_sent_at" timestamp;
