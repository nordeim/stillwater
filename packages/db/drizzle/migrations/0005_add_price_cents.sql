-- Migration 0005: Add price_cents column to membership_plans
-- R2 fix (2026-07-14): The membership_plans table had NO price column.
-- The pricing page could only show classCreditsPerCycle (null for
-- Unlimited/Drop-in), causing 2/3 plans to show no price.
--
-- This migration adds a NOT NULL price_cents column with default 0.
-- The seed fixtures are updated with real prices:
--   Pay As You Go: 2800  ($28.00 per class)
--   Unlimited:     14900 ($149.00 per month)
--   10 Classes:    22000 ($220.00 per pack)
--
-- Source: static_landing_page_mockup.html pricing section.

ALTER TABLE "membership_plans"
  ADD COLUMN "price_cents" integer NOT NULL DEFAULT 0;
