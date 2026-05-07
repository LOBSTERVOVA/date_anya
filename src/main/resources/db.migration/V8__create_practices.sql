-- Таблица практик
CREATE TABLE IF NOT EXISTS practices (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_uuid UUID NOT NULL REFERENCES groups(uuid) ON DELETE CASCADE,
    title TEXT,
    practice_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    prohibit_pairs BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practices_group_uuid ON practices(group_uuid);
CREATE INDEX IF NOT EXISTS idx_practices_dates ON practices(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_practices_type ON practices(practice_type);
