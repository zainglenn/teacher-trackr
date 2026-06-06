-- Classes belong to a grade, not a teacher.
-- A grade has class groups (e.g. Grade 6A, 6B, 6C, 6D) that are independent
-- of which teacher delivers which subject to them.

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS grade_level_id uuid REFERENCES grade_levels(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS school_id_col uuid REFERENCES schools(id) ON DELETE CASCADE;

-- Rename school_id_col → school_id if the column didn't exist yet
-- (classes table may not have had school_id before)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='school_id_col') THEN
    ALTER TABLE classes RENAME COLUMN school_id_col TO school_id;
  END IF;
END $$;

-- Make teacher_id nullable (classes no longer require a teacher owner)
ALTER TABLE classes ALTER COLUMN teacher_id DROP NOT NULL;

-- Index for grade-level lookups
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- RLS: admins manage classes; anyone in the school can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'admin_manage_classes') THEN
    CREATE POLICY admin_manage_classes ON classes FOR ALL
      USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid()
          AND role IN ('admin', 'platform_admin')
          AND school_id = classes.school_id
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'school_read_classes') THEN
    CREATE POLICY school_read_classes ON classes FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND school_id = classes.school_id
      ));
  END IF;
END $$;
