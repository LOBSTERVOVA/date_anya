# Mobile API — документация по конечным точкам

**Базовый URL:** `/api/mobile`

Все конечные точки возвращают JSON. CORS разрешён для всех `/api/**` путей.

Форматы дат: `ISO 8601` (`yyyy-MM-dd`).  
Форматы даты-времени: `ISO 8601` с миллисекундами (`yyyy-MM-ddTHH:mm:ss.SSS`).  
UUID: строка в стандартном формате (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

---

## 1. GET /api/mobile/group/all

**Описание.** Возвращает **все** учебные группы (без поиска/фильтрации).  
**Логика.** `GroupService.getAll()` → `groupRepository.findAll()`. Каждая сущность `Group` маппится в `GroupDto` через `minimumGroupDto()`.

### Параметры запроса
Нет.

### Тело ответа
`Array<GroupDto>`

<details>
<summary><b>GroupDto</b></summary>

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | Уникальный идентификатор |
| `faculty` | `String` | Факультет |
| `course` | `int` | Курс |
| `educationForm` | `EducationForm` | Форма обучения: `FULL_TIME`, `PART_TIME`, `MIXED` |
| `direction` | `String` | Направление подготовки |
| `groupName` | `String` | Название группы (напр. «с1-01-20») |
| `specialization` | `String` | Специализация |
| `kindsOfSports` | `Set<String>` | Виды спорта |
| `pairs` | `Set<PairDto>` | **Всегда `null`** в mobile API |

</details>

### Пример ответа
```json
[
  {
    "uuid": "a1b2c3d4-...",
    "faculty": "ФФК",
    "course": 1,
    "educationForm": "FULL_TIME",
    "direction": "Физическая культура",
    "groupName": "с1-01-20",
    "specialization": "Спортивная подготовка",
    "kindsOfSports": ["каратэдо", "ушу"],
    "pairs": null
  }
]
```

---

## 2. GET /api/mobile/lecturer/all

**Описание.** Возвращает **всех** преподавателей с информацией об их кафедре.  
**Логика.** `LecturerService.getAll()` → `lecturerRepository.findAll()`. Каждый преподаватель обогащается `DepartmentDto` (через `departmentRepository.findById`). Если кафедра не назначена — DTO без поля `department`.

### Параметры запроса
Нет.

### Тело ответа
`Array<LecturerDto>`

<details>
<summary><b>LecturerDto</b></summary>

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | Уникальный идентификатор |
| `avatar` | `String` | URL/путь к аватару |
| `firstName` | `String` | Имя |
| `lastName` | `String` | Фамилия |
| `patronymic` | `String` | Отчество (может быть `null`) |
| `birthDate` | `LocalDate` | Дата рождения |
| `closestLesson` | `LocalDate` | Дата ближайшего занятия |
| `academicTitle` | `AcademicTitle` | Учёное звание |
| `description` | `String` | Описание |
| `phone` | `String` | Телефон |
| `email` | `String` | Email |
| `room` | `String` | Аудитория (строка) |
| `academicDegree` | `String` | Учёная степень |
| `isLabHead` | `boolean` | Заведующий лабораторией |
| `isHead` | `boolean` | Заведующий кафедрой |
| `department` | `DepartmentDto` | Кафедра, к которой привязан преподаватель (`null`, если не привязан) |

</details>

### Пример ответа
```json
[
  {
    "uuid": "b2c3d4e5-...",
    "avatar": null,
    "firstName": "Иван",
    "lastName": "Петров",
    "patronymic": "Сергеевич",
    "birthDate": "1975-03-15",
    "closestLesson": null,
    "academicTitle": "DOCENT",
    "description": "Специалист по ...",
    "phone": "+7-999-...",
    "email": "petrov@...",
    "room": "305",
    "academicDegree": "к.п.н.",
    "isLabHead": false,
    "department": {
      "uuid": "c3d4e5f6-...",
      "name": "Кафедра физвоспитания",
      "description": "...",
      "rooms": [],
      "lecturers": [],
      "subjects": []
    },
    "isHead": false
  }
]
```

---

## 3. GET /api/mobile/department?q=

**Описание.** Поиск кафедр по названию/описанию. Без параметра `q` возвращает **все** кафедры.  
**Логика.** `DepartmentService.search(q)` → `departmentRepository.search(q)`. Каждая кафедра обогащается: аудиториями (`roomRepository`), преподавателями (`lecturerRepository.findByDepartmentUuid`), предметами (`subjectRepository.findByDepartmentUuid`). Результат — `DepartmentDto.fullDepartmentDto()`.

### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| `q` | `String` | Нет | Поисковая строка (по `name`, `description`) |

### Тело ответа
`Array<DepartmentDto>`

<details>
<summary><b>DepartmentDto</b></summary>

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | Уникальный идентификатор |
| `name` | `String` | Название кафедры |
| `description` | `String` | Описание |
| `rooms` | `Set<RoomDto>` | Аудитории, привязанные к кафедре |
| `lecturers` | `Set<LecturerDto>` | Преподаватели кафедры (минимальное представление, без `department`) |
| `subjects` | `Set<SubjectDto>` | Предметы кафедры (минимальное представление, без `department`) |

**Важно:** вложенные `LecturerDto` и `SubjectDto` внутри `DepartmentDto` не содержат рекурсивного `department`.

</details>

### Пример ответа
```json
[
  {
    "uuid": "c3d4e5f6-...",
    "name": "Кафедра физвоспитания",
    "description": "Кафедра физического воспитания",
    "rooms": [
      {"uuid": "...", "title": "Спортзал №1"}
    ],
    "lecturers": [
      {
        "uuid": "b2c3d4e5-...",
        "firstName": "Иван",
        "lastName": "Петров",
        "academicTitle": "DOCENT",
        "isHead": false,
        "isLabHead": false,
        "department": null
      }
    ],
    "subjects": [
      {
        "uuid": "d4e5f6a7-...",
        "name": "Физическая культура",
        "description": "...",
        "department": null
      }
    ]
  }
]
```

---

## 4. GET /api/mobile/reference

**Описание.** Возвращает **все** справочные материалы (ReferenceInfo) с их периодами актуальности.  
**Логика.** `ReferenceService.getAll()` → `refRepo.findAll()`. Каждая запись обогащается `actualDates` через `mdrRepo.findByReferenceUuid()` (поле `@Transient`, не хранится в `reference_info`).

### Параметры запроса
Нет.

### Тело ответа
`Array<ReferenceInfo>`

<details>
<summary><b>ReferenceInfo</b></summary>

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | Уникальный идентификатор |
| `theme` | `String` | Тема/категория справки |
| `importanceLevel` | `Integer` | Уровень важности (0 — по умолчанию) |
| `title` | `String` | Заголовок |
| `htmlText` | `String` | Содержание в HTML |
| `annotation` | `String` | Краткая аннотация |
| `actualDates` | `List<MonthDayRange>` | Периоды актуальности (без года) |
| `createdAt` | `LocalDateTime` | Дата создания |
| `updatedAt` | `LocalDateTime` | Дата последнего обновления |

**MonthDayRange:**

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | Идентификатор диапазона |
| `startMonth` | `int` | Месяц начала (1–12) |
| `startDay` | `int` | День начала (1–31) |
| `endMonth` | `int` | Месяц конца (1–12) |
| `endDay` | `int` | День конца (1–31) |
| `referenceUuid` | `UUID` | UUID родительской справки |
| `createdAt` | `LocalDateTime` | Дата создания |

</details>

### Пример ответа
```json
[
  {
    "uuid": "e5f6a7b8-...",
    "theme": "Спортивные нормативы",
    "importanceLevel": 5,
    "title": "Нормативы ГТО",
    "htmlText": "<p>Текст справки...</p>",
    "annotation": "Краткое описание",
    "actualDates": [
      {
        "uuid": "f6a7b8c9-...",
        "startMonth": 9,
        "startDay": 1,
        "endMonth": 5,
        "endDay": 31,
        "referenceUuid": "e5f6a7b8-...",
        "createdAt": "2025-01-15T10:30:00.000"
      }
    ],
    "createdAt": "2025-01-15T10:30:00.000",
    "updatedAt": "2025-03-20T14:00:00.000"
  }
]
```

---

## 5. GET /api/mobile/pair/batch?from=&to=

**Описание.** Возвращает **только активные (утверждённые)** пары за указанный диапазон дат.  
**Логика.** `PairService.getActivePairsBatch(from, to)`:
1. Если `from` не передан — возвращается пустой поток.
2. Если `to` не передан — `to = from + 6 дней` (неделя).
3. `pairRepository.findByDateBetweenAndIsActiveTrue(from, to)` — нативный SQL-запрос:
   ```sql
   SELECT ... FROM pairs p
   WHERE p.date BETWEEN :from AND :to AND p.is_active = true
   ORDER BY p.date ASC, p.pair_order ASC
   ```
4. Каждая `Pair` конвертируется в `PairDto` через `convertPairToPairDto()`:
   - Загружаются преподаватели (`lecturerRepository.findById` для каждого UUID)
   - Загружаются группы (`groupRepository.findById`)
   - Загружается аудитория (`roomRepository.findById`; если не найдена — `new RoomDto()`)
   - Загружается предмет (`subjectRepository.findById`)
   - Все 4 запроса выполняются параллельно через `Mono.zip`

### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| `from` | `LocalDate` (ISO) | **Да** | Начало диапазона |
| `to` | `LocalDate` (ISO) | Нет | Конец диапазона. По умолчанию: `from + 6 дней` |

### Тело ответа
`Array<PairDto>`

<details>
<summary><b>PairDto</b></summary>

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | Уникальный идентификатор |
| `subject` | `SubjectDto` | Предмет (`department` = `null`) |
| `pairOrder` | `int` | Номер пары (1–6) |
| `date` | `LocalDate` | Дата проведения |
| `room` | `RoomDto` | Аудитория (может быть `RoomDto` с `uuid=null` и `title=null`) |
| `lecturers` | `List<LecturerDto>` | Список преподавателей (минимальное представление) |
| `groups` | `List<GroupDto>` | Список групп (минимальное представление) |
| `isActive` | `Boolean` | **Всегда `true`** в этом эндпоинте |
| `type` | `LessonType` | Тип занятия: `LECTURE` или `PRACTICE` |

</details>

### Пример ответа
```json
[
  {
    "uuid": "a7b8c9d0-...",
    "subject": {
      "uuid": "d4e5f6a7-...",
      "name": "Физическая культура",
      "description": "...",
      "department": null
    },
    "pairOrder": 1,
    "date": "2026-05-11",
    "room": {
      "uuid": "r1r2r3r4-...",
      "title": "Спортзал №1"
    },
    "lecturers": [
      {
        "uuid": "b2c3d4e5-...",
        "firstName": "Иван",
        "lastName": "Петров",
        "academicTitle": "DOCENT",
        "isHead": false,
        "isLabHead": false,
        "department": null
      }
    ],
    "groups": [
      {
        "uuid": "a1b2c3d4-...",
        "faculty": "ФФК",
        "course": 1,
        "educationForm": "FULL_TIME",
        "direction": "Физическая культура",
        "groupName": "с1-01-20",
        "specialization": "...",
        "kindsOfSports": ["каратэдо"],
        "pairs": null
      }
    ],
    "isActive": true,
    "type": "PRACTICE"
  }
]
```

---

## 6. GET /api/mobile/news?page=&size=

**Описание.** Пагинированный список новостей (свежие сверху).
**Логика.** `NewsService.findAllPaged(page, size)` → `newsRepository.findAllPaged(limit, offset)` + `newsRepository.countAll()`.

### Параметры запроса

| Параметр | Тип | Обязательный | По умолчанию |
|----------|-----|-------------|-------------|
| `page` | `int` | Нет | `0` |
| `size` | `int` | Нет | `10` |

### Тело ответа
```json
{
  "content": [NewsDto, ...],
  "totalElements": 42,
  "totalPages": 5
}
```

---

## 7. GET /api/mobile/news/{uuid}

**Описание.** Одна новость по UUID.
**Логика.** `NewsService.findById(uuid)` → `newsRepository.findById(uuid)` → 404 если не найдено.

### Параметры запроса
Нет (UUID в пути).

### Тело ответа
`NewsDto`

<details>
<summary><b>NewsDto</b></summary>

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | `UUID` | Уникальный идентификатор |
| `title` | `String` | Заголовок новости |
| `htmlContent` | `String` | HTML-содержимое (из Quill-редактора) |
| `mainPhotoUrl` | `String` | URL основной фотографии (относительный — добавить MINIO_URL) |
| `galleryPhotos` | `List<String>` | Массив URL фотографий галереи (относительные — добавить MINIO_URL) |
| `type` | `NewsType` | Тип новости (см. enum) |
| `createdAt` | `LocalDateTime` | Дата создания |
| `updatedAt` | `LocalDateTime` | Дата последнего обновления |

</details>

### Пример ответа
```json
{
  "uuid": "f6a7b8c9-...",
  "title": "Открытие нового спортзала",
  "htmlContent": "<p>Текст новости...</p>",
  "mainPhotoUrl": "/uploads/abc.jpg",
  "galleryPhotos": ["/uploads/g1.jpg", "/uploads/g2.jpg"],
  "type": "SPORT_EVENT",
  "createdAt": "2026-05-10T12:00:00.000",
  "updatedAt": "2026-05-11T09:30:00.000"
}
```

---

## Справочник DTO и моделей

### RoomDto
| Поле | Тип |
|------|-----|
| `uuid` | `UUID` |
| `title` | `String` |

### SubjectDto
| Поле | Тип |
|------|-----|
| `uuid` | `UUID` |
| `name` | `String` |
| `description` | `String` |
| `department` | `DepartmentDto` — `null` при вложении в `PairDto` и `DepartmentDto` |

---

## Enum-ы

### LessonType
| Значение | Описание |
|----------|----------|
| `LECTURE` | Лекции |
| `PRACTICE` | Практические занятия |
| `CREDIT` | Зачет |
| `DIFFERENTIATED_CREDIT` | Дифференцированный зачет |
| `EXAM` | Экзамен |

### EducationForm
| Значение | Описание |
|----------|----------|
| `FULL_TIME` | Очная |
| `PART_TIME` | Заочная |
| `MIXED` | Очно-заочная |

### AcademicTitle
| Значение | Описание |
|----------|----------|
| `HEAD` | Заведующий кафедрой |
| `DOCENT` | Доцент |
| `PROFESSOR` | Профессор |
| `SENIOR_LECTURER` | Старший преподаватель |
| `LECTURER` | Преподаватель |
| `EDUCATIONAL_METHODOLOGIST` | Специалист по учебно-методической работе |

---

## Сводная таблица эндпоинтов

| # | Метод | Путь | Параметры | Возвращает | Сервис |
|---|-------|------|-----------|------------|--------|
| 1 | `GET` | `/api/mobile/group/all` | — | `Flux<GroupDto>` | `GroupService.getAll()` |
| 2 | `GET` | `/api/mobile/lecturer/all` | — | `Flux<LecturerDto>` | `LecturerService.getAll()` |
| 3 | `GET` | `/api/mobile/department` | `?q=` (опционально) | `Flux<DepartmentDto>` | `DepartmentService.search(q)` |
| 4 | `GET` | `/api/mobile/reference` | — | `Flux<ReferenceInfo>` | `ReferenceService.getAll()` |
| 5 | `GET` | `/api/mobile/pair/batch` | `from` (обяз.), `to` (опц.) | `Flux<PairDto>` | `PairService.getActivePairsBatch()` |
| 6 | `GET` | `/api/mobile/news` | `page` (опц.), `size` (опц.) | `Mono<Map>` | `NewsService.findAllPaged()` |
| 7 | `GET` | `/api/mobile/news/{uuid}` | — | `Mono<NewsDto>` | `NewsService.findById()` |
