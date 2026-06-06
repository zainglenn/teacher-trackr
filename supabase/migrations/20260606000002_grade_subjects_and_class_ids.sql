-- grade_subjects: explicit mapping of which subjects are offered in each grade
-- Replaces the implicit link that was created only when a teacher was assigned.
CREATE TABLE IF NOT EXISTS grade_subjects (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_level_id  uuid        NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  subject_id      uuid        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, grade_level_id, subject_id)
);

ALTER TABLE grade_subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grade_subjects' AND policyname = 'admin_manage_grade_subjects') THEN
    CREATE POLICY admin_manage_grade_subjects ON grade_subjects FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','platform_admin') AND school_id = grade_subjects.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grade_subjects' AND policyname = 'school_read_grade_subjects') THEN
    CREATE POLICY school_read_grade_subjects ON grade_subjects FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND school_id = grade_subjects.school_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grade_subjects_grade ON grade_subjects(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_grade_subjects_school ON grade_subjects(school_id);

-- Add class_ids to class_assignments so admin can specify exactly which classes
-- a teacher covers for a given subject+grade combination.
ALTER TABLE class_assignments
  ADD COLUMN IF NOT EXISTS class_ids uuid[] NOT NULL DEFAULT '{}';
