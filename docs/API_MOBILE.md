# API rus-react-2 — документация для мобильного приложения

> Базовый URL: `http://<host>/api` (или `/api/mobile` для специальных мобильных эндпоинтов)  
> Все ответы: JSON (кроме экспорта — Excel `.xlsx`)  
> Все даты: ISO `YYYY-MM-DD` (LocalDate), время: `HH:MM` (LocalTime)  
> Все UUID: стандартный формат `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 1. Пары (расписание)

### `GET /api/mobile/pair/batch`
**Только активные (утверждённые) пары** за период.  
| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `from` | LocalDate | да | Начало диапазона (ISO) |
| `to` | LocalDate | нет | Конец диапазона. Если не указан = from + 6 дней |

**Ответ:** `Flux<PairDto>`  

**Логика:** возвращает пары с `isActive = true` за неделю. Основной эндпоинт для мобильного расписания.

---

### `GET /api/pair/week/batch`
**Все пары** (включая неутверждённые) за период.  
Параметры — те же. Используется веб-клиентом, мобилке не нужен.

---

### `POST /api/pair`
Создать или редактировать пару.  
| Поле тела | Тип | Описание |
|---|---|---|
| `uuid` | UUID | `null` → создание, не-null → редактирование |
| `date` | LocalDate | Дата пары |
| `pairOrder` | int | Номер пары (1–8) |
| `type` | LessonType | Тип занятия |
| `subjectUuid` | UUID | UUID предмета |
| `roomUuid` | UUID | UUID аудитории (опционально) |
| `lecturerUuids` | Set\<UUID\> | Минимум 1 преподаватель |
| `groupUuids` | Set\<UUID\> | Группы (все одного курса) |
| `isActive` | boolean | Утверждена (обычно false при создании) |

**Ответ:** `Mono<PairDto>`  
**Логика:** полная проверка конфликтов (преподаватели, группы, аудитория, практики, курс групп).

---

### `DELETE /api/pair/{uuid}`
Удалить пару. Нельзя удалить прошедшую.  
**Ответ:** `204 No Content`

---

### `POST /api/pair/approve`
Утвердить пары (isActive = true).  
**Тело:** `{ "departmentUuids": ["uuid1", "uuid2"] }`  
**Ответ:** `Mono<Integer>` — количество утверждённых пар

---

### `POST /api/pair/clone`
Клонировать неделю.  
**Тело:** CloneRequest

---

## 2. Преподаватели

### `GET /api/mobile/lecturer/all`
**Все преподаватели.** Без параметров.  
**Ответ:** `Flux<LecturerDto>`

---

### `GET /api/lecturer?q=`
Поиск преподавателей. `q` — поисковый запрос (опционально).  
**Ответ:** `Flux<LecturerDto>`

---

### `GET /api/lecturer/eligible`
Преподаватели, доступные для назначения пар (связаны с кафедрами, имеющими предметы).  
**Ответ:** `Flux<LecturerDto>`

---

### `GET /api/lecturer/workload`
Нагрузка преподавателей кафедры за период.  
| Параметр | Тип | Обязательный |
|---|---|---|
| `departmentUuid` | UUID | да |
| `from` | LocalDate | да |
| `to` | LocalDate | да |

**Ответ:** `Flux<LecturerWorkloadDto>`

---

### `POST /api/lecturer` / `PUT /api/lecturer/{uuid}` / `DELETE /api/lecturer/{uuid}`
CRUD преподавателей. Тело — Lecturer (entity).

---

### `POST /api/lecturer/{uuid}/make-head`
Сделать заведующим кафедрой.  
**Ответ:** `Mono<LecturerDto>`

---

## 3. Группы

### `GET /api/mobile/group/all`
**Все группы.** Без параметров.  
**Ответ:** `Flux<GroupDto>`

---

### `GET /api/group?q=`
Поиск групп. `q` — поисковый запрос (опционально).  
**Ответ:** `Flux<GroupDto>`  
**Фильтрация:** только активные группы (`isActive = true`).

---

### `POST /api/group`
Создать группу.  
**Тело:** Group (entity) — поля `groupName`, `course` (1–6), `educationForm`, `direction`, `faculty` обязательны.  
**Ответ:** `Mono<GroupDto>`

---

### `DELETE /api/group/{uuid}`
Мягкое удаление (`isActive = false`).  
**Ответ:** `204 No Content`

---

### `GET /api/group/faculties`
Список уникальных названий факультетов (только активных групп).  
**Ответ:** `Flux<String>`

---

### `GET /api/group/workload`
Нагрузка групп за период.  
| Параметр | Тип | Обязательный |
|---|---|---|
| `groupUuids` | List\<UUID\> | да (можно несколько: `?groupUuids=a&groupUuids=b`) |
| `from` | LocalDate | да |
| `to` | LocalDate | да |

**Ответ:** `Flux<GroupWorkloadDto>`

---

## 4. Практики

### `GET /api/practice`
Практики групп в диапазоне дат.  
| Параметр | Тип | Обязательный |
|---|---|---|
| `from` | LocalDate | да |
| `to` | LocalDate | да |
| `groupUuids` | List\<UUID\> | нет |

**Ответ:** `Flux<PracticeDto>`

---

### `POST /api/practice`
Создать практику.  
**Тело:** Practice (entity) — обязательны: `groupUuid`, `title`, `practiceType`, `startDate`, `endDate`.  
**Валидация:** группа должна быть активна (`isActive = true`).  
**Ответ:** `Mono<PracticeDto>`

---

### `DELETE /api/practice/{uuid}`
Удалить практику.  
**Ответ:** `204 No Content`

---

## 5. Кафедры

### `GET /api/mobile/department?q=`
Поиск кафедр (мобильная версия). `q` — опционально.  
**Ответ:** `Flux<DepartmentDto>`

---

### `GET /api/department?q=`
Поиск кафедр.  
**Ответ:** `Flux<DepartmentDto>`

---

### `GET /api/department/{uuid}`
Одна кафедра по UUID.  
**Ответ:** `Mono<DepartmentDto>`

---

### `POST /api/department` / `PUT /api/department/{uuid}`
Создать / обновить кафедру. Тело — Department (entity).

---

## 6. Кружки и клубы

### `GET /api/club?type=&page=&size=&search=&dayOfWeek=&timeFrom=&timeTo=`
Пагинированный список клубов с фильтрами.  
| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `type` | String | да | `SPORTS_CLUB` или `SCIENCE_CLUB` |
| `page` | int | нет (default 0) | Номер страницы |
| `size` | int | нет (default 12) | Размер страницы |
| `search` | String | нет | Поиск по названию/описанию |
| `dayOfWeek` | Integer | нет | 1=ПН … 7=ВС |
| `timeFrom` | String | нет | «с» HH:MM |
| `timeTo` | String | нет | «по» HH:MM |

**Ответ:** `Mono<ClubPageDto>` (содержит `content`, `totalElements`, `totalPages`, `page`, `size`)

---

### `GET /api/club/department/{departmentUuid}`
Клубы конкретной кафедры.  
**Ответ:** `Flux<ClubDto>`

---

### `GET /api/club/{uuid}`
Один клуб по UUID.  
**Ответ:** `Mono<ClubDto>`

---

### `POST /api/club` / `PUT /api/club/{uuid}`
Создать / обновить клуб.  
**Тело:** ClubCreateRequest:
```json
{
  "club": {
    "name": "Название",
    "type": "SPORTS_CLUB",
    "avatar": "url",
    "description": "Описание",
    "roomUuids": ["uuid1"],
    "departmentUuid": "uuid"
  },
  "schedules": [
    {
      "dayOfWeek": 3,
      "startTime": "14:00",
      "endTime": "16:00"
    }
  ]
}
```
**Ответ:** `Mono<ClubDto>`

---

### `DELETE /api/club/{uuid}`
Удалить клуб.  
**Ответ:** `204 No Content`

---

## 7. Новости

### `GET /api/news?page=&size=`
Пагинированный список новостей.  
| Параметр | Тип | По умолчанию |
|---|---|---|
| `page` | int | 0 |
| `size` | int | 10 |

**Ответ:** `Mono<Map<String, Object>>`:
```json
{
  "content": [NewsDto, ...],
  "totalElements": 42,
  "totalPages": 5
}
```

---

### `GET /api/news/{uuid}`
Одна новость по UUID.  
**Ответ:** `Mono<NewsDto>`

---

### `POST /api/news`
Создать/редактировать новость. Тело — News (entity).  
**Ответ:** `Mono<NewsDto>`

---

### `DELETE /api/news/{uuid}`
Удалить новость.  
**Ответ:** `204 No Content`

---

## 8. Справочная информация

### `GET /api/mobile/reference`
Вся справочная информация.  
**Ответ:** `Flux<ReferenceInfo>`

### `GET /api/reference/themes`
Список тем.  
**Ответ:** `Mono<List<String>>`

### `GET /api/reference?theme=`
Справочная информация по теме.  
**Ответ:** `Mono<List<ReferenceInfo>>`

---

## 9. Экспорт

### `POST /api/export/schedule`
Экспорт расписания в Excel (`.xlsx`).  
**Тело:** ExportRequest:
```json
{
  "from": "2026-05-11",
  "to": "2026-05-17",
  "groups": ["uuid1", "uuid2"],
  "departmentUuid": null
}
```
- Если `departmentUuid` = null → режим «для студентов» (по группам)
- Если `departmentUuid` задан → режим «для преподавателей» (по кафедре, каждый преподаватель на отдельном листе)

**Ответ:** `binary .xlsx` (Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

---

## 10. Загрузка файлов

### `POST /api/upload`
Загрузка файла в MinIO.  
**Тело:** `multipart/form-data`, поле `file`  
**Ответ:** `Mono<Map<String, String>>` — `{ "url": "/uploads/uuid.png" }`

---

# DTO — справочник полей

## PairDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `subject` | SubjectDto |
| `pairOrder` | int |
| `date` | LocalDate |
| `room` | RoomDto (nullable) |
| `lecturers` | List\<LecturerDto\> |
| `groups` | List\<GroupDto\> |
| `isActive` | boolean |
| `type` | LessonType |

## SubjectDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `name` | String |
| `description` | String |
| `department` | DepartmentDto |

## RoomDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `title` | String |

## LecturerDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `avatar` | String (nullable) |
| `lastName` | String |
| `firstName` | String |
| `patronymic` | String (nullable) |
| `birthDate` | LocalDate (nullable) |
| `closestLesson` | LocalDate (nullable) |
| `academicTitle` | AcademicTitle |
| `description` | String |
| `phone` | String |
| `email` | String |
| `room` | String (номер кабинета) |
| `academicDegree` | String |
| `isLabHead` | boolean |
| `department` | DepartmentDto |
| `isHead` | boolean |

## GroupDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `groupName` | String |
| `course` | int (1–6) |
| `educationForm` | EducationForm |
| `faculty` | String |
| `direction` | String |
| `specialization` | String |
| `kindsOfSports` | Set\<String\> |
| `pairs` | Set\<PairDto\> (nullable) |

## DepartmentDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `name` | String |
| `description` | String |
| `rooms` | Set\<RoomDto\> |
| `lecturers` | Set\<LecturerDto\> |
| `subjects` | Set\<SubjectDto\> |

## PracticeDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `groupUuid` | UUID |
| `title` | String |
| `practiceType` | PracticeType |
| `startDate` | LocalDate |
| `endDate` | LocalDate |
| `prohibitPairs` | boolean |
| `lecturerUuid` | UUID (nullable) |

## ClubDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `name` | String |
| `type` | String (`SPORTS_CLUB` / `SCIENCE_CLUB`) |
| `avatar` | String (URL) |
| `description` | String |
| `roomUuids` | Set\<UUID\> |
| `rooms` | Set\<RoomDto\> |
| `departmentUuid` | UUID |
| `departmentName` | String |
| `schedules` | List\<ClubScheduleDto\> |

## ClubScheduleDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `clubUuid` | UUID |
| `dayOfWeek` | int (1=ПН … 7=ВС) |
| `startTime` | LocalTime |
| `endTime` | LocalTime |

## ClubPageDto
| Поле | Тип |
|---|---|
| `content` | List\<ClubDto\> |
| `totalElements` | long |
| `totalPages` | int |
| `page` | int |
| `size` | int |

## NewsDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `title` | String |
| `htmlContent` | String |
| `type` | NewsType |
| `createdAt` | LocalDateTime |
| `updatedAt` | LocalDateTime |

## LecturerWorkloadDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `lastName`, `firstName`, `patronymic` | String |
| `avatar` | String |
| `academicTitle` | AcademicTitle |
| `totalPairs`, `totalHours` | int |
| `totalLecturePairs`, `totalLectureHours` | int |
| `totalPracticePairs`, `totalPracticeHours` | int |
| `totalCreditPairs`, `totalCreditHours` | int |
| `totalDifferentiatedCreditPairs`, `totalDifferentiatedCreditHours` | int |
| `totalExamPairs`, `totalExamHours` | int |
| `subjects` | List\<SubjectStat\> |

### SubjectStat (вложенный в LecturerWorkloadDto и GroupWorkloadDto)
| Поле | Тип |
|---|---|
| `subjectName` | String |
| `pairCount`, `hours` | int |
| `lecturePairs`, `lectureHours` | int |
| `practicePairs`, `practiceHours` | int |
| `creditPairs`, `creditHours` | int |
| `differentiatedCreditPairs`, `differentiatedCreditHours` | int |
| `examPairs`, `examHours` | int |

## GroupWorkloadDto
| Поле | Тип |
|---|---|
| `uuid` | UUID |
| `groupName` | String |
| `course` | int |
| `educationForm` | EducationForm |
| `faculty`, `direction`, `specialization` | String |
| `kindsOfSports` | Set\<String\> |
| `totalPairs`, `totalHours` | int |
| `. . .` (все счётчики типов занятий, как у LecturerWorkloadDto) | |
| `subjects` | List\<SubjectStat\> |
| `practices` | List\<PracticeDto\> |

## CloneRequest
| Поле | Тип |
|---|---|
| `departmentUuid` | UUID |
| `sourceDate` | LocalDate |
| `targetDate` | LocalDate |
| `lecturerUuids` | List\<UUID\> |
| `daysOfWeek` | List\<DayOfWeek\> |

## CloneResponse
| Поле | Тип |
|---|---|
| `successCount` | int |
| `errors` | List\<CloneError\> |

**CloneError:** `dayOfWeek`, `pairOrder`, `lecturerName`, `reason`

## ExportRequest
| Поле | Тип |
|---|---|
| `from` | LocalDate |
| `to` | LocalDate |
| `groups` | List\<UUID\> |
| `departmentUuid` | UUID (nullable — null = для студентов, задан = для преподавателей) |

---

# Enum-справочник

| Enum | Значения |
|---|---|
| **LessonType** | `LECTURE`, `PRACTICE`, `CREDIT`, `DIFFERENTIATED_CREDIT`, `EXAM` |
| **AcademicTitle** | `HEAD`, `DOCENT`, `PROFESSOR`, `SENIOR_LECTURER`, `LECTURER`, `EDUCATIONAL_METHODOLOGIST` |
| **EducationForm** | `FULL_TIME`, `PART_TIME`, `MIXED` |
| **PracticeType** | `EDUCATIONAL`, `PRODUCTION`, `PRE_GRADUATION`, `SCIENTIFIC_RESEARCH` |
| **NewsType** | `APP_UPDATE`, `NEW_SECTION`, `NEW_SCIENCE_CLUB`, `NEW_LECTURER`, `SPORT_ACHIEVEMENT`, `SPORT_EVENT`, `IMPORTANT`, `INFORMATION`, `OTHER` |

---

# Ключевые эндпоинты для мобильного клиента (шпаргалка)

| # | Метод | Путь | Назначение |
|---|---|---|---|
| 1 | GET | `/api/mobile/pair/batch?from=&to=` | Активные пары за неделю |
| 2 | GET | `/api/mobile/group/all` | Все группы |
| 3 | GET | `/api/mobile/lecturer/all` | Все преподаватели |
| 4 | GET | `/api/mobile/department?q=` | Поиск кафедр |
| 5 | GET | `/api/mobile/reference` | Справочная информация |
| 6 | GET | `/api/group?q=` | Поиск групп |
| 7 | GET | `/api/practice?from=&to=&groupUuids=` | Практики групп |
| 8 | GET | `/api/news?page=&size=` | Новости (пагинация) |
| 9 | GET | `/api/club?type=SPORTS_CLUB&page=&size=` | Клубы/секции |
| 10 | GET | `/api/lecturer/workload?departmentUuid=&from=&to=` | Нагрузка преподавателей |
| 11 | GET | `/api/group/workload?groupUuids=&from=&to=` | Нагрузка групп |
| 12 | POST | `/api/export/schedule` | Экспорт в Excel |
| 13 | GET | `/api/department/{uuid}` | Одна кафедра |
| 14 | GET | `/api/club/{uuid}` | Один клуб |
| 15 | GET | `/api/news/{uuid}` | Одна новость |
