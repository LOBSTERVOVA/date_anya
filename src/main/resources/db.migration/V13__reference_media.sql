CREATE TABLE IF NOT EXISTS reference_media (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_uuid UUID NOT NULL REFERENCES reference_info(uuid) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    storage_path TEXT NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reference_media_ref ON reference_media(reference_uuid);
