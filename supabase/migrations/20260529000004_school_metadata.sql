ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS city        text,
  ADD COLUMN IF NOT EXISTS country     text,
  ADD COLUMN IF NOT EXISTS curriculum  text;
