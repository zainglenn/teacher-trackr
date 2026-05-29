-- Fix class_lesson_deliveries: add teacher_id + school_id, create policies
ALTER TABLE class_lesson_deliveries
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS school_id  uuid REFERENCES schools(id);

-- Drop the old class_id-based unique constraint if it exists
DO $$ BEGIN
  ALTER TABLE class_lesson_deliveries DROP CONSTRAINT IF EXISTS class_lesson_deliveries_class_id_unit_id_week_number_key;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add new unique constraint on (unit_id, week_number, teacher_id)
DO $$ BEGIN
  ALTER TABLE class_lesson_deliveries
    ADD CONSTRAINT class_lesson_deliveries_unit_teacher_week_key
    UNIQUE (unit_id, week_number, teacher_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- RLS policies
ALTER TABLE class_lesson_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'class_lesson_deliveries' AND policyname = 'teachers_manage_own_deliveries'
  ) THEN
    CREATE POLICY teachers_manage_own_deliveries ON class_lesson_deliveries
      FOR ALL USING (teacher_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'class_lesson_deliveries' AND policyname = 'hod_admin_read_deliveries'
  ) THEN
    CREATE POLICY hod_admin_read_deliveries ON class_lesson_deliveries
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('hod', 'admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deliveries_unit    ON class_lesson_deliveries(unit_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_teacher ON class_lesson_deliveries(teacher_id);
