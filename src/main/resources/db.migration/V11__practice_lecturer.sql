ALTER TABLE practices ADD COLUMN IF NOT EXISTS lecturer_uuid UUID REFERENCES lecturers(uuid);
CREATE INDEX IF NOT EXISTS idx_practices_lecturer_uuid ON practices(lecturer_uuid);
