-- Fix circular RLS dependency introduced in 20260606000000.
-- The ltp_units and ltp_unit_standards policies joined long_term_plans,
-- which has its own RLS that rejoins ltp_units → infinite recursion → 500.
--
-- Solution: a SECURITY DEFINER helper that resolves admin access without
-- triggering cross-table RLS, then simpler policies that call it.

-- Drop the circular policies first
DROP POLICY IF EXISTS admin_read_school_units ON ltp_units;
DROP POLICY IF EXISTS admin_read_school_unit_standards ON ltp_unit_standards;
DROP POLICY IF EXISTS admin_read_school_members ON ltp_members;

-- Helper: resolves whether the current user is an admin for the school
-- that owns a given plan. SECURITY DEFINER runs as postgres → no RLS applied
-- inside the function, breaking the circular dependency.
CREATE OR REPLACE FUNCTION admin_can_access_plan(plan_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM long_term_plans ltp
    JOIN profiles p ON p.id = auth.uid()
    WHERE ltp.id = plan_id
      AND p.role = 'admin'
      AND p.school_id = ltp.school_id
  );
$$;

-- ltp_units: use the helper to avoid joining long_term_plans directly
-- (which would trigger long_term_plans RLS and loop)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ltp_units' AND policyname = 'admin_read_school_units'
  ) THEN
    CREATE POLICY admin_read_school_units ON ltp_units FOR SELECT
      USING (admin_can_access_plan(ltp_units.ltp_id));
  END IF;
END $$;

-- ltp_unit_standards: same pattern via the helper
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ltp_unit_standards' AND policyname = 'admin_read_school_unit_standards'
  ) THEN
    CREATE POLICY admin_read_school_unit_standards ON ltp_unit_standards FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM ltp_units u
          WHERE u.id = ltp_unit_standards.unit_id
            AND admin_can_access_plan(u.ltp_id)
        )
      );
  END IF;
END $$;

-- ltp_members: same pattern via the helper
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ltp_members' AND policyname = 'admin_read_school_members'
  ) THEN
    CREATE POLICY admin_read_school_members ON ltp_members FOR SELECT
      USING (admin_can_access_plan(ltp_members.plan_id));
  END IF;
END $$;
