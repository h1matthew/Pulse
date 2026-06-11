-- ============================================================================
-- Migration: Receipt-verified check-ins
-- Created: 2026-06-10
-- Author: Pulse
--
-- Check-ins now require a scanned receipt verified against the business
-- (Gemini vision). Store the proof reference and verification outcome so
-- mission progress is backed by evidence.
-- ============================================================================

ALTER TABLE business_check_ins
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS verified_by_receipt BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS receipt_merchant TEXT;

COMMENT ON COLUMN business_check_ins.receipt_url IS
  'Storage path of the uploaded receipt image (private receipts bucket)';
COMMENT ON COLUMN business_check_ins.verified_by_receipt IS
  'True when AI verification matched the receipt to this business';
COMMENT ON COLUMN business_check_ins.receipt_merchant IS
  'Merchant name extracted from the receipt during verification';
