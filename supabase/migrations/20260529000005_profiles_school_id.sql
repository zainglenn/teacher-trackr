-- Add school_id to profiles for multi-tenant scoping
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
