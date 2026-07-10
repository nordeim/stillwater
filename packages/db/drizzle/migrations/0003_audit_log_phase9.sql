-- F9-19: audit_log table (Phase 9)
-- Records every admin mutation for compliance and traceability.
-- Source: MEP Phase 9 F9-19, PAD §9 (RBAC audit requirement).

CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "staff_member_id" uuid NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- FK to members (CASCADE — if staff member deleted, logs remain accessible via metadata)
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_staff_member_id_members_id_fk"
  FOREIGN KEY ("staff_member_id") REFERENCES "public"."members"("id")
  ON DELETE cascade ON UPDATE no action;

-- Indexes for audit log viewer queries (F9-20)
CREATE INDEX "idx_audit_log_staff_created" ON "audit_log" USING btree ("staff_member_id","created_at");
CREATE INDEX "idx_audit_log_action" ON "audit_log" USING btree ("action");
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");
