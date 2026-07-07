CREATE TYPE "public"."billing_interval" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."class_level" AS ENUM('all', 'beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('confirmed', 'cancelled', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'cancelled', 'completed', 'in_progress');--> statement-breakpoint
CREATE TYPE "public"."studio_role" AS ENUM('member', 'instructor', 'staff', 'manager', 'owner');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'cancelled', 'past_due', 'trialing', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'offered', 'accepted', 'expired', 'removed');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"email_verified" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"phone" text,
	"date_of_birth" date,
	"emergency_contact" text,
	"emergency_phone" text,
	"notes" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"stripe_customer_id" text,
	CONSTRAINT "members_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "instructors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"bio" text,
	"specialties" text[],
	"image_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "instructors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "class_styles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"style_id" uuid,
	"level" "class_level" NOT NULL,
	"duration_minutes" integer NOT NULL,
	"max_capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"image_key" text,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"room_id" uuid,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"cancel_reason" text,
	"override_capacity" integer,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"stream_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'confirmed' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"cancelled_at" timestamp,
	"checked_in_at" timestamp,
	"cancellation_reason" text,
	"package_credit_id" uuid
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp,
	"expires_at" timestamp,
	"status" "waitlist_status" DEFAULT 'waiting' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"paused_at" timestamp,
	"pause_resumes_at" timestamp,
	"credits_remaining" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"interval" "billing_interval" NOT NULL,
	"class_credits_per_cycle" integer,
	"guest_passes_per_cycle" integer DEFAULT 0,
	"allows_virtual" boolean DEFAULT true NOT NULL,
	"allows_in_person" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "membership_plans_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "class_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"total_credits" integer NOT NULL,
	"used_credits" integer DEFAULT 0 NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"stripe_payment_intent_id" text
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"role" "studio_role" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_style_id_class_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."class_styles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_packages" ADD CONSTRAINT "class_packages_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_members_stripe_customer_id" ON "members" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_starts_at_status" ON "class_sessions" USING btree ("starts_at","status") WHERE "class_sessions"."status" = 'scheduled';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_enrollments_session_member" ON "enrollments" USING btree ("session_id","member_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_session_status" ON "enrollments" USING btree ("session_id","status") WHERE "enrollments"."status" = 'confirmed';--> statement-breakpoint
CREATE INDEX "idx_waitlist_session_position" ON "waitlist_entries" USING btree ("session_id","position") WHERE "waitlist_entries"."status" = 'waiting';--> statement-breakpoint
CREATE INDEX "idx_subscriptions_member_status" ON "member_subscriptions" USING btree ("member_id","status") WHERE "member_subscriptions"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_events_stripe_id" ON "payment_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_assignments_member_role" ON "role_assignments" USING btree ("member_id","role");