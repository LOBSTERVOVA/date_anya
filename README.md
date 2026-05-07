# RusReact-2 — API Reference

Spring Boot 4.0.6 • WebFlux • R2DBC • PostgreSQL • Apache POI

---

## Эндпоинты

### Пары (`/api/pair`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `GET` | `/api/pair/week/batch?from=YYYY-MM-DD&to=YYYY-MM-DD` | — | `Flux<PairDto>` | Все пары в диапазоне дат |
| `POST` | `/api/pair` | `Pair` (JSON) | `Mono<PairDto>` | Создать/редактировать пару (есть uuid → редактирование, нет → создание). При сохранении всегда `isActive = false` |
| `DELETE` | `/api/pair/{uuid}` | — | `204 No Content` | Удалить пару (нельзя удалить прошедшую или утверждённую) |
| `POST` | `/api/pair/approve` | `{"departmentUuids": ["uuid1","uuid2"]}` | `Mono<Integer>` | Утвердить пары кафедр (кол-во утверждённых) |

---

### Преподаватели (`/api/lecturer`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `GET` | `/api/lecturer?q=поиск` | — | `Flux<LecturerDto>` | Поиск преподавателей по ФИО |
| `GET` | `/api/lecturer/eligible` | — | `Flux<LecturerDto>` | Преподаватели без кафедры |
| `POST` | `/api/lecturer` | `Lecturer` (JSON) | `Mono<LecturerDto>` | Создать преподавателя |
| `PUT` | `/api/lecturer/{uuid}` | `Lecturer` (JSON) | `Mono<LecturerDto>` | Обновить преподавателя |
| `DELETE` | `/api/lecturer/{uuid}` | — | `204 No Content` | Удалить преподавателя |
| `POST` | `/api/lecturer/{uuid}/make-head` | — | `Mono<LecturerDto>` | Назначить зав. кафедрой |
| `GET` | `/api/lecturer/workload?departmentUuid=UUID&from=YYYY-MM-DD&to=YYYY-MM-DD` | — | `Flux<LecturerWorkloadDto>` | Нагрузка преподавателей кафедры |

---

### Группы (`/api/group`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `GET` | `/api/group?q=поиск` | — | `Flux<GroupDto>` | Поиск групп по groupName/faculty/direction |

---

### Кафедры (`/api/department`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `GET` | `/api/department?q=поиск` | — | `Flux<DepartmentDto>` | Поиск кафедр по названию (возвращает с преподавателями, предметами, аудиториями) |
| `GET` | `/api/department/{uuid}` | — | `Mono<DepartmentDto>` | Кафедра по UUID |
| `POST` | `/api/department` | `Department` (JSON) | `Mono<DepartmentDto>` | Создать кафедру |
| `PUT` | `/api/department/{uuid}` | `Department` (JSON) | `Mono<DepartmentDto>` | Обновить кафедру |

---

### Аудитории (`/api/room`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `GET` | `/api/room` | — | `Flux<Room>` | Все аудитории |

---

### Новости (`/api/news`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `GET` | `/api/news?page=0&size=10` | — | `Mono<Map<String,Object>>` | Пагинированный список. Ответ: `{"content": [...], "totalElements": N, "totalPages": N, "page": N, "size": N}` |
| `GET` | `/api/news/{uuid}` | — | `Mono<NewsDto>` | Новость по UUID |
| `POST` | `/api/news` | `News` (JSON) | `Mono<NewsDto>` | Создать/редактировать новость |
| `DELETE` | `/api/news/{uuid}` | — | `204 No Content` | Удалить новость |

---

### Справочная информация (`/api/reference`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `GET` | `/api/reference/themes` | — | `Mono<List<String>>` | Список уникальных тем |
| `GET` | `/api/reference/themes/counts` | — | `Mono<Map<String,Long>>` | Количество записей по темам |
| `GET` | `/api/reference?theme=тема` | — | `Mono<List<ReferenceInfo>>` | Записи по теме (без темы — пустой список) |
| `GET` | `/api/reference/{uuid}` | — | `Mono<ReferenceInfo>` | Запись по UUID |
| `POST` | `/api/reference` | `ReferenceInfo` (JSON) | `Mono<ReferenceInfo>` | Создать запись |
| `PUT` | `/api/reference/{uuid}` | `ReferenceInfo` (JSON) | `Mono<ReferenceInfo>` | Обновить запись |
| `DELETE` | `/api/reference/{uuid}` | — | `204 No Content` | Удалить запись |

---

### Экспорт (`/api/export`)

| Метод | URL | Тело запроса | Ответ | Описание |
|-------|-----|-------------|-------|----------|
| `POST` | `/api/export/schedule` | `ExportRequest` (JSON) | `ResponseEntity<byte[]>` (`.xlsx`) | Экспорт расписания. **Для студентов:** `{from, to, groups: [UUID]}`. **Для преподавателей:** `{from, to, departmentUuid: UUID}`. Выгружаются только утверждённые пары (`isActive = true`) |

---

## DTO

### ExportRequest
| Поле | Тип | Описание |
|------|-----|----------|
| `from` | `LocalDate` (ISO) | Начало периода |
| `to` | `LocalDate` (ISO) | Конец периода |
| `groups` | `List<UUID>` | UUID групп (режим «для студентов») |
| `departmentUuid` | `UUID` | UUID кафедры (режим «для преподавателей») |

### PairDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `subject` | `SubjectDto` | Предмет |
| `pairOrder` | `int` | Номер пары (1–8) |
| `date` | `LocalDate` | Дата |
| `room` | `RoomDto` | Аудитория (nullable) |
| `lecturers` | `List<LecturerDto>` | Преподаватели |
| `groups` | `List<GroupDto>` | Группы |
| `isActive` | `Boolean` | Утверждена ли |
| `type` | `LessonType` | `LECTURE` / `PRACTICE` / `CREDIT` / `DIFFERENTIATED_CREDIT` / `EXAM` |

### SubjectDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `name` | `String` | Название |
| `description` | `String` | Описание |
| `department` | `DepartmentDto` | Кафедра (опционально) |

### LecturerDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `avatar` | `String` | URL аватара |
| `firstName` | `String` | Имя |
| `lastName` | `String` | Фамилия |
| `patronymic` | `String` | Отчество |
| `birthDate` | `LocalDate` | Дата рождения |
| `closestLesson` | `LocalDate` | Ближайшее занятие |
| `academicTitle` | `AcademicTitle` | Учёное звание |
| `description` | `String` | |
| `phone` | `String` | |
| `email` | `String` | |
| `room` | `String` | Кабинет |
| `academicDegree` | `String` | Учёная степень |
| `isLabHead` | `boolean` | Зав. лабораторией |
| `isHead` | `boolean` | Зав. кафедрой |
| `department` | `DepartmentDto` | Кафедра (опционально) |

### GroupDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `faculty` | `String` | Факультет |
| `course` | `int` | Курс (1–6) |
| `educationForm` | `EducationForm` | `FULL_TIME` / `PART_TIME` / `MIXED` |
| `direction` | `String` | Направление |
| `groupName` | `String` | Код группы |
| `specialization` | `String` | Специализация |
| `kindsOfSports` | `Set<String>` | Виды спорта |
| `pairs` | `Set<PairDto>` | Пары (опционально) |

### RoomDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `title` | `String` | Название аудитории |

### DepartmentDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `name` | `String` | Название |
| `description` | `String` | Описание |
| `rooms` | `Set<RoomDto>` | Аудитории |
| `lecturers` | `Set<LecturerDto>` | Преподаватели |
| `subjects` | `Set<SubjectDto>` | Предметы |

### NewsDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `title` | `String` | Заголовок |
| `htmlContent` | `String` | HTML-содержимое |
| `type` | `NewsType` | Тип новости |
| `createdAt` | `LocalDateTime` | |
| `updatedAt` | `LocalDateTime` | |

### LecturerWorkloadDto
| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | |
| `lastName` / `firstName` / `patronymic` | `String` | ФИО |
| `avatar` | `String` | |
| `academicTitle` | `AcademicTitle` | |
| `totalPairs` | `int` | Всего пар |
| `totalHours` | `int` | Всего часов |
| `totalLecturePairs` | `int` | Лекционных пар |
| `totalLectureHours` | `int` | Лекционных часов |
| `totalPracticePairs` | `int` | Практических пар |
| `totalPracticeHours` | `int` | Практических часов |
| `totalCreditPairs` | `int` | Зачётных пар |
| `totalCreditHours` | `int` | Зачётных часов |
| `totalDifferentiatedCreditPairs` | `int` | Пар диф. зачёта |
| `totalDifferentiatedCreditHours` | `int` | Часов диф. зачёта |
| `totalExamPairs` | `int` | Экзаменационных пар |
| `totalExamHours` | `int` | Экзаменационных часов |
| `subjects` | `List<SubjectStat>` | Статистика по предметам |
| `subjects[].subjectName` | `String` | |
| `subjects[].pairCount` / `.hours` | `int` | |
| `subjects[].lecturePairs` / `.lectureHours` | `int` | |
| `subjects[].practicePairs` / `.practiceHours` | `int` | |
| `subjects[].creditPairs` / `.creditHours` | `int` | |
| `subjects[].differentiatedCreditPairs` / `.differentiatedCreditHours` | `int` | |
| `subjects[].examPairs` / `.examHours` | `int` | |

### Import DTO (CSV)
| DTO | Поля |
|-----|-------|
| `ImportLecturerDto` | `fio`, `code`, `department`, `department_code` |
| `ImportRoomDto` | `room` |
| `ImportPlanDto` | `groupName`, `externalId`, `discipline`, `term`, `pairKind`, `hours`, `departmentName`, `educationForm`, `faculty`, `direction`, `course`, `specialization`, `kindOfSport` |

---

## Модели (Entity)

### Pair (`pairs`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `subjectUuid` | `UUID` | `subject_uuid` |
| `pairOrder` | `int` | `pair_order` (1–8) |
| `date` | `LocalDate` | `date` |
| `roomUuid` | `UUID` | `room_uuid` (nullable) |
| `lecturerUuids` | `Set<UUID>` | `lecturer_uuids` (UUID[]) |
| `groupUuids` | `Set<UUID>` | `group_uuids` (UUID[]) |
| `isActive` | `Boolean` | `is_active` |
| `type` | `LessonType` | `pair_type` |

### Lecturer (`lecturers`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `externalId` | `String` | `external_id` |
| `avatar` | `String` | `avatar` |
| `firstName` / `lastName` / `patronymic` | `String` | `first_name` / `last_name` / `patronymic` |
| `birthDate` | `LocalDate` | `birth_date` |
| `academicTitle` | `AcademicTitle` | `academic_title` |
| `isHead` | `boolean` | `is_head` |
| `closestLesson` | `LocalDate` | `closest_lesson` |
| `description` / `phone` / `email` / `room` | `String` | |
| `academicDegree` | `String` | `academic_degree` |
| `labHead` | `boolean` | `is_lab_head` |
| `departmentUuid` | `UUID` | `department_uuid` |
| `pairUuids` | `Set<UUID>` | `pair_uuids` (UUID[]) |

### Group (`groups`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `groupName` | `String` | `group_name` |
| `externalId` | `String` | `external_id` |
| `faculty` | `String` | `faculty` |
| `course` | `int` | `course` (1–6) |
| `educationForm` | `EducationForm` | `education_form` |
| `direction` | `String` | `direction` |
| `specialization` | `String` | `specialization` |
| `kindsOfSports` | `Set<String>` | `kind_of_sport` |
| `pairUuids` | `Set<UUID>` | `pair_uuids` (UUID[]) |

### Department (`departments`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `externalId` | `String` | `external_id` |
| `name` | `String` | `name` |
| `description` | `String` | `description` |
| `roomUuids` | `Set<UUID>` | `room_uuids` (UUID[]) |
| `lecturerUuids` | `Set<UUID>` | `lecturer_uuids` (UUID[]) |
| `subjectUuids` | `Set<UUID>` | `subject_uuids` (UUID[]) |

### Room (`rooms`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `title` | `String` | `title` |

### Subject (`subjects`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `externalId` | `String` | `external_id` |
| `name` | `String` | `name` |
| `description` | `String` | `description` |
| `departmentUuid` | `UUID` | `department_uuid` |

### News (`news`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `title` | `String` | `title` |
| `htmlContent` | `String` | `html_content` |
| `type` | `NewsType` | `type` |
| `createdAt` | `LocalDateTime` | `created_at` |
| `updatedAt` | `LocalDateTime` | `updated_at` |

### ReferenceInfo (`reference_info`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `theme` | `String` | `theme` |
| `importanceLevel` | `Integer` | `importance_level` (0–10) |
| `title` | `String` | `title` |
| `htmlText` | `String` | `html_text` |
| `annotation` | `String` | `annotation` |
| `actualDates` | `List<MonthDayRange>` | `@Transient` (отдельная таблица) |
| `createdAt` | `LocalDateTime` | `created_at` |
| `updatedAt` | `LocalDateTime` | `updated_at` |

### MonthDayRange (`month_day_ranges`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `startMonth` | `int` | `start_month` (1–12) |
| `startDay` | `int` | `start_day` (1–31) |
| `endMonth` | `int` | `end_month` (nullable) |
| `endDay` | `int` | `end_day` (nullable) |
| `referenceUuid` | `UUID` | `reference_uuid` (FK → reference_info) |

### Plan (`plans`)
| Поле | Тип | Колонка |
|------|-----|---------|
| `uuid` | `UUID` | `uuid` (PK) |
| `groupUuid` | `UUID` | `group_uuid` |
| `subjectUuid` | `UUID` | `subject_uuid` |
| `term` | `int` | `term` (1–12) |
| `lessonType` | `LessonType` | `lesson_type` |
| `hours` | `int` | `hours` |

---

## Enums

| Enum | Значения |
|------|----------|
| `LessonType` | `LECTURE`, `PRACTICE`, `CREDIT`, `DIFFERENTIATED_CREDIT`, `EXAM` |
| `EducationForm` | `FULL_TIME` («Очная»), `PART_TIME` («Заочная»), `MIXED` («Очно-заочная») |
| `AcademicTitle` | (учёные звания преподавателей) |
| `NewsType` | (типы новостей) |
