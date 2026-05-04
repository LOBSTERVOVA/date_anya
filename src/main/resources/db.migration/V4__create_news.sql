CREATE TABLE IF NOT EXISTS news (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    html_content TEXT,
    type TEXT NOT NULL DEFAULT 'OTHER',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
