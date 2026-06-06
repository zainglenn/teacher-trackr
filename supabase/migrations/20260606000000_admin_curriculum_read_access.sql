-- Allow school admins to read all curriculum data in their school.
-- Without these policies, the AdminView (Curriculum Audit) shows an empty list
-- because the admin role has no SELECT permission on these tables.

-- long_term_plans: admin can read all plans in their school
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'long_term_plans' AND policyname = 'admin_read_school_plans'
  ) THEN
    CREATE POLICY admin_read_school_plans ON long_term_plans FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role = 'admin'
            AND school_id = long_term_plans.school_id
        )
      );
  END IF;
END $$;

-- ltp_units: admin can read all units in their school (via plan)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ltp_units' AND policyname = 'admin_read_school_units'
  ) THEN
    CREATE POLICY admin_read_school_units ON ltp_units FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM long_term_plans ltp
          JOIN profiles p ON p.id = auth.uid()
          WHERE ltp.id = ltp_units.ltp_id
            AND p.role = 'admin'
            AND p.school_id = ltp.school_id
        )
      );
  END IF;
END $$;

-- ltp_unit_standards: admin can read all mapped standards in their school
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ltp_unit_standards' AND policyname = 'admin_read_school_unit_standards'
  ) THEN
    CREATE POLICY admin_read_school_unit_standards ON ltp_unit_standards FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM ltp_units u
          JOIN long_term_plans ltp ON ltp.id = u.ltp_id
          JOIN profiles p ON p.id = auth.uid()
          WHERE u.id = ltp_unit_standards.unit_id
            AND p.role = 'admin'
            AND p.school_id = ltp.school_id
        )
      );
  END IF;
END $$;

-- ltp_members: admin can read plan memberships in their school
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ltp_members' AND policyname = 'admin_read_school_members'
  ) THEN
    CREATE POLICY admin_read_school_members ON ltp_members FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM long_term_plans ltp
          JOIN profiles p ON p.id = auth.uid()
          WHERE ltp.id = ltp_members.plan_id
            AND p.role = 'admin'
            AND p.school_id = ltp.school_id
        )
      );
  END IF;
END $$;
