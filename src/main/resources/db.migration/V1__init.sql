-- Расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Таблица отделов
CREATE TABLE departments (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица аудиторий
CREATE TABLE rooms (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Таблица преподавателей
CREATE TABLE lecturers (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,
    avatar VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    patronymic VARCHAR(255),
    birth_date DATE,
    academic_title VARCHAR(50),
    is_head BOOLEAN DEFAULT FALSE,
    closest_lesson DATE,
    description TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    office_room VARCHAR(100),
    academic_degree VARCHAR(255),
    is_lab_head BOOLEAN DEFAULT FALSE,
    department_uuid UUID REFERENCES departments(uuid) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Таблица предметов
CREATE TABLE subjects (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department_external_id VARCHAR(255),
    department_uuid UUID REFERENCES departments(uuid) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Таблица групп
CREATE TABLE groups (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255),
    group_name VARCHAR(100) NOT NULL,
    faculty VARCHAR(255),
    course INTEGER NOT NULL CHECK (course BETWEEN 1 AND 6),
    education_form VARCHAR(50),
    direction TEXT,
    specialization TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Таблица видов спорта для групп (связь many-to-many)
CREATE TABLE group_sports (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_uuid UUID NOT NULL REFERENCES groups(uuid) ON DELETE CASCADE,
    sport_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_uuid, sport_name)
);

-- 7. Таблица пар (занятий)
CREATE TABLE pairs (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_uuid UUID REFERENCES subjects(uuid) ON DELETE CASCADE,
    pair_order INTEGER NOT NULL CHECK (pair_order BETWEEN 1 AND 8),
    date DATE NOT NULL,
    room_uuid UUID REFERENCES rooms(uuid) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Таблица связи пар и групп (many-to-many)
CREATE TABLE pair_groups (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_uuid UUID NOT NULL REFERENCES pairs(uuid) ON DELETE CASCADE,
    group_uuid UUID NOT NULL REFERENCES groups(uuid) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pair_uuid, group_uuid)
);

-- 9. Таблица связи пар и преподавателей (many-to-many)
CREATE TABLE pair_lecturers (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_uuid UUID NOT NULL REFERENCES pairs(uuid) ON DELETE CASCADE,
    lecturer_uuid UUID NOT NULL REFERENCES lecturers(uuid) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pair_uuid, lecturer_uuid)
);

-- 10. Таблица учебных планов
CREATE TABLE plans (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_uuid UUID NOT NULL REFERENCES groups(uuid) ON DELETE CASCADE,
    subject_uuid UUID NOT NULL REFERENCES subjects(uuid) ON DELETE CASCADE,
    term INTEGER NOT NULL CHECK (term BETWEEN 1 AND 12),
    lesson_type VARCHAR(50) NOT NULL,
    hours INTEGER NOT NULL CHECK (hours > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_uuid, subject_uuid, term, lesson_type)
);

-- 11. Таблица справочной информации
CREATE TABLE reference_info (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme VARCHAR(255) NOT NULL,
    importance_level INTEGER DEFAULT 0 CHECK (importance_level BETWEEN 0 AND 10),
    title VARCHAR(500) NOT NULL,
    html_text TEXT NOT NULL,
    annotation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Таблица для MonthDayRange (встроенного типа)
CREATE TABLE month_day_ranges (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
    start_day INTEGER NOT NULL CHECK (start_day BETWEEN 1 AND 31),
    end_month INTEGER CHECK (end_month IS NULL OR (end_month BETWEEN 1 AND 12)),
    end_day INTEGER CHECK (end_day IS NULL OR (end_day BETWEEN 1 AND 31)),
    reference_uuid UUID REFERENCES reference_info(uuid) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Таблица для DateRange (встроенного типа)
CREATE TABLE date_ranges (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date DATE NOT NULL,
    end_date DATE,
    parent_table VARCHAR(100) NOT NULL,
    parent_uuid UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Связь отделов и аудиторий (many-to-many)
CREATE TABLE department_rooms (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_uuid UUID NOT NULL REFERENCES departments(uuid) ON DELETE CASCADE,
    room_uuid UUID NOT NULL REFERENCES rooms(uuid) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_uuid, room_uuid)
);

-- 15. Связь справочной информации и пар (для actualDates)
CREATE TABLE reference_info_pairs (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_uuid UUID NOT NULL REFERENCES reference_info(uuid) ON DELETE CASCADE,
    pair_uuid UUID NOT NULL REFERENCES pairs(uuid) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reference_uuid, pair_uuid)
);

-- Индексы для ускорения запросов

-- Для поиска по внешним ID
CREATE INDEX idx_departments_external_id ON departments(external_id);
CREATE INDEX idx_lecturers_external_id ON lecturers(external_id);
CREATE INDEX idx_subjects_external_id ON subjects(external_id);
CREATE INDEX idx_groups_external_id ON groups(external_id);

-- Для связей
CREATE INDEX idx_lecturers_department ON lecturers(department_uuid);
CREATE INDEX idx_subjects_department ON subjects(department_uuid);
CREATE INDEX idx_group_sports_group ON group_sports(group_uuid);
CREATE INDEX idx_pairs_subject ON pairs(subject_uuid);
CREATE INDEX idx_pairs_room ON pairs(room_uuid);
CREATE INDEX idx_pairs_date ON pairs(date);
CREATE INDEX idx_pair_groups_pair ON pair_groups(pair_uuid);
CREATE INDEX idx_pair_groups_group ON pair_groups(group_uuid);
CREATE INDEX idx_pair_lecturers_pair ON pair_lecturers(pair_uuid);
CREATE INDEX idx_pair_lecturers_lecturer ON pair_lecturers(lecturer_uuid);
CREATE INDEX idx_plans_group ON plans(group_uuid);
CREATE INDEX idx_plans_subject ON plans(subject_uuid);
CREATE INDEX idx_department_rooms_department ON department_rooms(department_uuid);
CREATE INDEX idx_department_rooms_room ON department_rooms(room_uuid);
CREATE INDEX idx_month_day_ranges_reference ON month_day_ranges(reference_uuid);
CREATE INDEX idx_date_ranges_parent ON date_ranges(parent_table, parent_uuid);
CREATE INDEX idx_reference_info_pairs_reference ON reference_info_pairs(reference_uuid);
CREATE INDEX idx_reference_info_pairs_pair ON reference_info_pairs(pair_uuid);

-- Индекс для полнотекстового поиска
-- CREATE INDEX idx_reference_info_search ON reference_info USING gin(
--     to_tsvector('russian',
--     COALESCE(theme, '') || ' ' ||
--     COALESCE(title, '') || ' ' ||
--     COALESCE(annotation, '') || ' ' ||
--     COALESCE(html_text, '')
--     )
--     );

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reference_info_updated_at
    BEFORE UPDATE ON reference_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();