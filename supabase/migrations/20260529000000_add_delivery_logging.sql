-- Teacher delivery logging
CREATE TABLE IF NOT EXISTS class_lesson_deliveries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         uuid        NOT NULL REFERENCES ltp_units(id) ON DELETE CASCADE,
  week_number     integer     NOT NULL,
  teacher_id      uuid        NOT NULL REFERENCES profiles(id),
  delivered_at    timestamptz NOT NULL DEFAULT now(),
  notes           text,
  school_id       uuid        REFERENCES schools(id),
  UNIQUE (unit_id, week_number, teacher_id)
);

ALTER TABLE class_lesson_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'class_lesson_deliveries' AND policyname = 'teachers_manage_own_deliveries'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_lesson_deliveries' AND column_name = 'teacher_id'
  ) THEN
    EXECUTE 'CREATE POLICY teachers_manage_own_deliveries ON class_lesson_deliveries FOR ALL USING (teacher_id = auth.uid())';
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

CREATE INDEX IF NOT EXISTS idx_deliveries_unit ON class_lesson_deliveries(unit_id);
