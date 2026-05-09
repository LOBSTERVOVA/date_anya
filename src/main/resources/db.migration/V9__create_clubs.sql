CREATE TABLE IF NOT EXISTS clubs (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SCIENCE_CLUB' CHECK (type IN ('SPORTS_CLUB', 'SCIENCE_CLUB')),
    avatar VARCHAR(500),
    description TEXT,
    room_uuids UUID[] DEFAULT '{}',
    department_uuid UUID NOT NULL REFERENCES departments(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_schedules (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_uuid UUID NOT NULL REFERENCES clubs(uuid) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);
