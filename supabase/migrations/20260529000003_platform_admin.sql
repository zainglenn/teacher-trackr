-- Add is_active to schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add platform_admin to profiles role check
-- First drop the existing check constraint if any, then re-add with new value
DO $$ BEGIN
  -- Update any existing check constraint on role
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('teacher', 'hod', 'admin', 'platform_admin'));

CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);

-- Add school metadata columns
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS city        text,
  ADD COLUMN IF NOT EXISTS country     text,
  ADD COLUMN IF NOT EXISTS curriculum  text;
