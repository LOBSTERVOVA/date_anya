ALTER TABLE news
    ADD COLUMN IF NOT EXISTS main_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS gallery_photos TEXT[];
