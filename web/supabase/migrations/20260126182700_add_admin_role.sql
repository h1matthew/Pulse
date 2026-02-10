-- Migration: Add admin role to profiles
-- Run this against your existing Supabase database

-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Note: The questions table was removed in migration 20260124000000_add_new_features.sql
-- This migration now only adds the is_admin column which is used by the community flashcards feature
