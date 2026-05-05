-- Приводим схему БД в соответствие с моделями (UUID[] вместо join-таблиц)

-- ========= groups: добавляем kind_of_sport TEXT[] и pair_uuids UUID[] =========
ALTER TABLE groups ADD COLUMN IF NOT EXISTS kind_of_sport TEXT[];
ALTER TABLE groups ADD COLUMN IF NOT EXISTS pair_uuids UUID[];

-- Переносим данные из group_sports в groups.kind_of_sport
UPDATE groups g SET kind_of_sport = sub.sports
FROM (
    SELECT gs.group_uuid, array_agg(gs.sport_name) AS sports
    FROM group_sports gs
    GROUP BY gs.group_uuid
) sub
WHERE g.uuid = sub.group_uuid;

DROP TABLE IF EXISTS group_sports;

-- ========= pairs: добавляем group_uuids UUID[] и lecturer_uuids UUID[] =========
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS group_uuids UUID[];
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS lecturer_uuids UUID[];

-- Переносим данные из pair_groups в pairs.group_uuids
UPDATE pairs p SET group_uuids = sub.groups
FROM (
    SELECT pg.pair_uuid, array_agg(pg.group_uuid) AS groups
    FROM pair_groups pg
    GROUP BY pg.pair_uuid
) sub
WHERE p.uuid = sub.pair_uuid;

DROP TABLE IF EXISTS pair_groups;

-- Переносим данные из pair_lecturers в pairs.lecturer_uuids
UPDATE pairs p SET lecturer_uuids = sub.lecturers
FROM (
    SELECT pl.pair_uuid, array_agg(pl.lecturer_uuid) AS lecturers
    FROM pair_lecturers pl
    GROUP BY pl.pair_uuid
) sub
WHERE p.uuid = sub.pair_uuid;

DROP TABLE IF EXISTS pair_lecturers;

-- ========= departments: добавляем room_uuids UUID[], lecturer_uuids UUID[], subject_uuids UUID[] =========
ALTER TABLE departments ADD COLUMN IF NOT EXISTS room_uuids UUID[];
ALTER TABLE departments ADD COLUMN IF NOT EXISTS lecturer_uuids UUID[];
ALTER TABLE departments ADD COLUMN IF NOT EXISTS subject_uuids UUID[];

-- Переносим данные из department_rooms в departments.room_uuids
UPDATE departments d SET room_uuids = sub.rooms
FROM (
    SELECT dr.department_uuid, array_agg(dr.room_uuid) AS rooms
    FROM department_rooms dr
    GROUP BY dr.department_uuid
) sub
WHERE d.uuid = sub.department_uuid;

DROP TABLE IF EXISTS department_rooms;

-- ========= lecturers: добавляем pair_uuids UUID[] =========
ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS pair_uuids UUID[];

-- ========= subjects: добавляем department_uuid если ещё нет (уже есть в V1) =========
-- (ничего не делаем — колонка уже существует)
