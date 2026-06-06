-- Convert standard_sets to platform-level. Schools subscribe via school_curricula.

-- Add text label columns (replacing school-scoped FK columns)
ALTER TABLE public.standard_sets
  ADD COLUMN IF NOT EXISTS subject_label TEXT,
  ADD COLUMN IF NOT EXISTS grade_label TEXT;

-- Backfill labels from existing FK data before dropping columns
UPDATE public.standard_sets
SET
  subject_label = s.name,
  grade_label   = gl.name
FROM public.subjects s,
     public.grade_levels gl
WHERE public.standard_sets.subject_id = s.id
  AND public.standard_sets.grade_level_id = gl.id
  AND public.standard_sets.subject_label IS NULL;

-- Drop school-scoped columns
ALTER TABLE public.standard_sets
  DROP COLUMN IF EXISTS school_id,
  DROP COLUMN IF EXISTS subject_id,
  DROP COLUMN IF EXISTS grade_level_id;

-- School-to-curriculum assignment junction
CREATE TABLE IF NOT EXISTS public.school_curricula (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  standard_set_id  UUID NOT NULL REFERENCES public.standard_sets(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade_level_id   UUID NOT NULL REFERENCES public.grade_levels(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, subject_id, grade_level_id)
);

ALTER TABLE public.school_curricula ENABLE ROW LEVEL SECURITY;

-- standard_sets: readable by all authenticated; writable by platform_admin only
DROP POLICY IF EXISTS "Standards readable by all" ON public.standard_sets;
CREATE POLICY "standard_sets: read by authenticated" ON public.standard_sets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "standard_sets: write by platform_admin" ON public.standard_sets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin'));

-- standards: writable by platform_admin
CREATE POLICY "standards: write by platform_admin" ON public.standards
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin'));

-- school_curricula: school admin full access; all school members can read
CREATE POLICY "school_curricula: admin rw" ON public.school_curricula
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND school_id = school_curricula.school_id AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND school_id = school_curricula.school_id AND role = 'admin'));
CREATE POLICY "school_curricula: members read" ON public.school_curricula
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND school_id = school_curricula.school_id));
