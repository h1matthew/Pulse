-- Migration: Drop unused foreign key constraints
-- Created: 2026-02-03
-- Description: Remove FK constraints that cause unindexed FK warnings
-- These are audit columns (created_by) and rarely-used references that
-- don't need database-level enforcement. App handles integrity at application layer.

ALTER TABLE content_blocks DROP CONSTRAINT IF EXISTS content_blocks_video_composition_id_fkey;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_created_by_fkey;
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_created_by_fkey;
ALTER TABLE video_compositions DROP CONSTRAINT IF EXISTS video_compositions_created_by_fkey;
