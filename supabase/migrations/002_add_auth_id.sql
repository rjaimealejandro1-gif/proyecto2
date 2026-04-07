-- =============================================
-- FIX: Add auth_id column for Supabase Auth UUID mapping
-- =============================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
