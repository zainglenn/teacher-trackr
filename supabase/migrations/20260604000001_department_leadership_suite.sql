-- ─────────────────────────────────────────────────────────────────────────────
-- Department Leadership Suite
-- Clusters: Analytics, Coaching, Interventions, Department Collaboration,
--           School-Wide Initiatives
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Cluster 2: Coaching ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS observations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hod_id        uuid        NOT NULL REFERENCES profiles(id),
  teacher_id    uuid        NOT NULL REFERENCES profiles(id),
  school_id     uuid        NOT NULL REFERENCES schools(id),
  date          date        NOT NULL DEFAULT CURRENT_DATE,
  focus_area    text        NOT NULL, -- 'literacy'|'differentiation'|'assessment'|'classroom_management'|'other'
  notes         text,
  next_steps    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'observations' AND policyname = 'hod_manage_observations') THEN
    CREATE POLICY hod_manage_observations ON observations FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hod' AND school_id = observations.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'observations' AND policyname = 'teacher_read_own_observations') THEN
    CREATE POLICY teacher_read_own_observations ON observations FOR SELECT
      USING (teacher_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'observations' AND policyname = 'admin_read_observations') THEN
    CREATE POLICY admin_read_observations ON observations FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = observations.school_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_observations_teacher ON observations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_observations_school ON observations(school_id);


CREATE TABLE IF NOT EXISTS coaching_cycles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hod_id           uuid        NOT NULL REFERENCES profiles(id),
  teacher_id       uuid        NOT NULL REFERENCES profiles(id),
  school_id        uuid        NOT NULL REFERENCES schools(id),
  steps_completed  text[]      NOT NULL DEFAULT '{}', -- subset of: 'observe','debrief','model','reflect'
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

ALTER TABLE coaching_cycles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coaching_cycles' AND policyname = 'hod_manage_coaching_cycles') THEN
    CREATE POLICY hod_manage_coaching_cycles ON coaching_cycles FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hod' AND school_id = coaching_cycles.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coaching_cycles' AND policyname = 'teacher_read_own_cycles') THEN
    CREATE POLICY teacher_read_own_cycles ON coaching_cycles FOR SELECT
      USING (teacher_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coaching_cycles_teacher ON coaching_cycles(teacher_id);
CREATE INDEX IF NOT EXISTS idx_coaching_cycles_school ON coaching_cycles(school_id);


CREATE TABLE IF NOT EXISTS mentoring_pairs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hod_id           uuid        NOT NULL REFERENCES profiles(id),
  mentor_id        uuid        NOT NULL REFERENCES profiles(id),
  mentee_id        uuid        NOT NULL REFERENCES profiles(id),
  school_id        uuid        NOT NULL REFERENCES schools(id),
  check_in_cadence text        NOT NULL DEFAULT 'fortnightly', -- 'weekly'|'fortnightly'|'monthly'
  last_checkin_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, mentee_id, school_id)
);

ALTER TABLE mentoring_pairs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentoring_pairs' AND policyname = 'hod_manage_mentoring_pairs') THEN
    CREATE POLICY hod_manage_mentoring_pairs ON mentoring_pairs FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hod' AND school_id = mentoring_pairs.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentoring_pairs' AND policyname = 'teacher_read_own_pair') THEN
    CREATE POLICY teacher_read_own_pair ON mentoring_pairs FOR SELECT
      USING (mentor_id = auth.uid() OR mentee_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mentoring_pairs_school ON mentoring_pairs(school_id);


CREATE TABLE IF NOT EXISTS pd_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid        NOT NULL REFERENCES profiles(id),
  school_id   uuid        NOT NULL REFERENCES schools(id),
  pd_type     text        NOT NULL, -- 'conference'|'workshop'|'peer_obs'|'online'|'other'
  focus_area  text,
  attended_date date      NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pd_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pd_entries' AND policyname = 'teacher_manage_own_pd') THEN
    CREATE POLICY teacher_manage_own_pd ON pd_entries FOR ALL
      USING (teacher_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pd_entries' AND policyname = 'hod_read_dept_pd') THEN
    CREATE POLICY hod_read_dept_pd ON pd_entries FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hod', 'admin') AND school_id = pd_entries.school_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pd_entries_teacher ON pd_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pd_entries_school ON pd_entries(school_id);


-- ── Cluster 1: Analytics ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS benchmark_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hod_id          uuid        NOT NULL REFERENCES profiles(id),
  school_id       uuid        NOT NULL REFERENCES schools(id),
  subject_id      uuid        REFERENCES subjects(id),
  grade_level_id  uuid        REFERENCES grade_levels(id),
  snapshot_date   date        NOT NULL DEFAULT CURRENT_DATE,
  strand_averages jsonb       NOT NULL DEFAULT '{}', -- { "RL": 72.5, "RI": 65.0, ... }
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE benchmark_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'benchmark_snapshots' AND policyname = 'hod_manage_snapshots') THEN
    CREATE POLICY hod_manage_snapshots ON benchmark_snapshots FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hod' AND school_id = benchmark_snapshots.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'benchmark_snapshots' AND policyname = 'admin_read_snapshots') THEN
    CREATE POLICY admin_read_snapshots ON benchmark_snapshots FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = benchmark_snapshots.school_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_snapshots_school ON benchmark_snapshots(school_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_context ON benchmark_snapshots(school_id, subject_id, grade_level_id);


-- ── Cluster 3: Interventions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interventions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     uuid        NOT NULL REFERENCES profiles(id),
  school_id      uuid        NOT NULL REFERENCES schools(id),
  strand_codes   text[]      NOT NULL DEFAULT '{}', -- e.g. ['RL', 'W']
  student_ids    uuid[]      NOT NULL DEFAULT '{}',
  strategy       text        NOT NULL,
  start_date     date        NOT NULL DEFAULT CURRENT_DATE,
  end_date       date,
  outcome_notes  text,
  status         text        NOT NULL DEFAULT 'active', -- 'active'|'monitoring'|'concluded'
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'interventions' AND policyname = 'teacher_manage_own_interventions') THEN
    CREATE POLICY teacher_manage_own_interventions ON interventions FOR ALL
      USING (teacher_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'interventions' AND policyname = 'hod_read_dept_interventions') THEN
    CREATE POLICY hod_read_dept_interventions ON interventions FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hod', 'admin') AND school_id = interventions.school_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interventions_teacher ON interventions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_interventions_school ON interventions(school_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(school_id, status);


-- ── Cluster 4: Department Collaboration ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_notes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hod_id        uuid        NOT NULL REFERENCES profiles(id),
  school_id     uuid        NOT NULL REFERENCES schools(id),
  meeting_date  date        NOT NULL DEFAULT CURRENT_DATE,
  agenda        text,
  notes         text,
  attendee_ids  uuid[]      NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_notes' AND policyname = 'hod_manage_meeting_notes') THEN
    CREATE POLICY hod_manage_meeting_notes ON meeting_notes FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hod' AND school_id = meeting_notes.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_notes' AND policyname = 'dept_read_meeting_notes') THEN
    CREATE POLICY dept_read_meeting_notes ON meeting_notes FOR SELECT
      USING (
        auth.uid() = ANY(attendee_ids)
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin') AND school_id = meeting_notes.school_id)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meeting_notes_school ON meeting_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_date ON meeting_notes(school_id, meeting_date DESC);


CREATE TABLE IF NOT EXISTS action_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_note_id  uuid        NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  assignee_id      uuid        NOT NULL REFERENCES profiles(id),
  description      text        NOT NULL,
  due_date         date,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'action_items' AND policyname = 'hod_manage_action_items') THEN
    CREATE POLICY hod_manage_action_items ON action_items FOR ALL
      USING (EXISTS (
        SELECT 1 FROM meeting_notes mn
        JOIN profiles p ON p.id = auth.uid()
        WHERE mn.id = action_items.meeting_note_id AND p.role = 'hod' AND p.school_id = mn.school_id
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'action_items' AND policyname = 'assignee_read_update_own') THEN
    CREATE POLICY assignee_read_update_own ON action_items FOR ALL
      USING (assignee_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meeting_note_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON action_items(assignee_id);


CREATE TABLE IF NOT EXISTS recognitions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hod_id      uuid        NOT NULL REFERENCES profiles(id),
  teacher_id  uuid        NOT NULL REFERENCES profiles(id),
  school_id   uuid        NOT NULL REFERENCES schools(id),
  unit_id     uuid        REFERENCES ltp_units(id) ON DELETE SET NULL,
  note        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recognitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recognitions' AND policyname = 'hod_manage_recognitions') THEN
    CREATE POLICY hod_manage_recognitions ON recognitions FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hod' AND school_id = recognitions.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recognitions' AND policyname = 'teacher_read_own_recognitions') THEN
    CREATE POLICY teacher_read_own_recognitions ON recognitions FOR SELECT
      USING (teacher_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recognitions' AND policyname = 'admin_read_recognitions') THEN
    CREATE POLICY admin_read_recognitions ON recognitions FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = recognitions.school_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recognitions_teacher ON recognitions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_school ON recognitions(school_id);


-- ── Cluster 5: Initiatives ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS initiatives (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid        NOT NULL REFERENCES profiles(id),
  school_id        uuid        NOT NULL REFERENCES schools(id),
  name             text        NOT NULL,
  description      text,
  subject_ids      uuid[]      NOT NULL DEFAULT '{}',
  grade_level_ids  uuid[]      NOT NULL DEFAULT '{}',
  metric_label     text,
  status           text        NOT NULL DEFAULT 'active', -- 'active'|'completed'
  start_date       date,
  end_date         date,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiatives' AND policyname = 'admin_manage_initiatives') THEN
    CREATE POLICY admin_manage_initiatives ON initiatives FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = initiatives.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiatives' AND policyname = 'hod_read_initiatives') THEN
    CREATE POLICY hod_read_initiatives ON initiatives FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hod' AND school_id = initiatives.school_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiatives' AND policyname = 'teacher_read_initiatives') THEN
    CREATE POLICY teacher_read_initiatives ON initiatives FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND school_id = initiatives.school_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_initiatives_school ON initiatives(school_id);


CREATE TABLE IF NOT EXISTS initiative_participants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id   uuid        NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  teacher_id      uuid        NOT NULL REFERENCES profiles(id),
  class_id        uuid        REFERENCES classes(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (initiative_id, teacher_id)
);

ALTER TABLE initiative_participants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiative_participants' AND policyname = 'admin_manage_participants') THEN
    CREATE POLICY admin_manage_participants ON initiative_participants FOR ALL
      USING (EXISTS (
        SELECT 1 FROM initiatives i
        JOIN profiles p ON p.id = auth.uid()
        WHERE i.id = initiative_participants.initiative_id AND p.role = 'admin' AND p.school_id = i.school_id
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiative_participants' AND policyname = 'hod_manage_own_participants') THEN
    CREATE POLICY hod_manage_own_participants ON initiative_participants FOR ALL
      USING (teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM initiatives i
        JOIN profiles p ON p.id = auth.uid()
        WHERE i.id = initiative_participants.initiative_id AND p.role = 'hod' AND p.school_id = i.school_id
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiative_participants' AND policyname = 'school_read_participants') THEN
    CREATE POLICY school_read_participants ON initiative_participants FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM initiatives i
        JOIN profiles p ON p.id = auth.uid()
        WHERE i.id = initiative_participants.initiative_id AND p.school_id = i.school_id
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_participants_initiative ON initiative_participants(initiative_id);


CREATE TABLE IF NOT EXISTS initiative_progress (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id   uuid        NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  recorded_by     uuid        NOT NULL REFERENCES profiles(id),
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  metric_value    numeric     NOT NULL,
  notes           text
);

ALTER TABLE initiative_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiative_progress' AND policyname = 'admin_hod_manage_progress') THEN
    CREATE POLICY admin_hod_manage_progress ON initiative_progress FOR ALL
      USING (EXISTS (
        SELECT 1 FROM initiatives i
        JOIN profiles p ON p.id = auth.uid()
        WHERE i.id = initiative_progress.initiative_id AND p.role IN ('admin', 'hod') AND p.school_id = i.school_id
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'initiative_progress' AND policyname = 'school_read_progress') THEN
    CREATE POLICY school_read_progress ON initiative_progress FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM initiatives i
        JOIN profiles p ON p.id = auth.uid()
        WHERE i.id = initiative_progress.initiative_id AND p.school_id = i.school_id
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_initiative_progress_initiative ON initiative_progress(initiative_id);
