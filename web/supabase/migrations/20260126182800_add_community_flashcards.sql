-- Migration: Add Community Flashcards with Admin Review System
-- Description: Allows AI-generated flashcards to be shared with all users after admin approval
-- NOTE: This migration had issues with incomplete table creation.
-- The fix migration (20260126183000) will drop and recreate everything properly.

-- Enable pg_trgm extension for text similarity (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add admin flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- The rest of this migration is superseded by 20260126183000_fix_community_flashcards.sql
-- which properly drops and recreates the community_flashcards table.
-- Leaving this file mostly intact for migration history, but the actual implementation
-- is in the fix migration.
