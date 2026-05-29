-- 1. Priority flag on unit standards
ALTER TABLE ltp_unit_standards
  ADD COLUMN IF NOT EXISTS is_priority boolean NOT NULL DEFAULT false;

-- 2. Standards-to-task mapping on units
ALTER TABLE ltp_units
  ADD COLUMN IF NOT EXISTS standard_assessments jsonb;

-- 3. Structured anchor text metadata on units
ALTER TABLE ltp_units
  ADD COLUMN IF NOT EXISTS anchor_text_details jsonb;
