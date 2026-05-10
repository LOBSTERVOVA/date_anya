# API rus-react-2 — документация для мобильного приложения

> **Базовый URL мобильного API:** `http://<host>/api/mobile`  
> **MINIO_URL (для фото/аватарок):** `http://185.170.144.76:9002`  
>   — все поля `avatar`, `url` возвращаются относительно (например `/uploads/uuid.png`),  
>   — полный URL = `MINIO_URL + avatar` (например `http://185.170.144.76:9002/uploads/uuid.png`)  
>  
> Все ответы: JSON (кроме экспорта — Excel `.xlsx`)  
> Все даты: ISO `YYYY-MM-DD` (LocalDate), время: `HH:MM` (LocalTime)  
> Все UUID: стандартный формат `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 1. Пары (расписание)

### `GET /api/mobile/pair/batch?from=&to=`
**Только активные (утверждённые) пары** за период.  
| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `from` | LocalDate | да | Начало диапазона (ISO) |
| `to` | LocalDate | нет | Конец диапазона. Если не указан = from + 6 дней |

**Ответ:** `Flux<PairDto>`  
**Логика:** возвращает пары с `isActive = true` за неделю. Основной эндпоинт для мобильного расписания.

---

## 2. Преподаватели

### `GET /api/mobile/lecturer/all`
**Все преподаватели.** Без параметров.  
**Ответ:** `Flux<LecturerDto>`

---

### `GET /api/mobile/lecturer/workload?departmentUuid=&from=&to=`
Нагрузка преподавателей кафедры за период.  
| Параметр | Тип | Обязательный |
|---|---|---|
| `departmentUuid` | UUID | да |
| `from` | LocalDate | да |
| `to` | LocalDate | да |

**Ответ:** `Flux<LecturerWorkloadDto>`

---

## 3. Группы

### `GET /api/mobile/group/all`
**Все активные группы.** Без параметров.  
**Ответ:** `Flux<GroupDto>`  
**Фильтрация:** только `isActive = true`.

---

### `GET /api/mobile/group/workload?groupUuids=&from=&to=`
Нагрузка групп за период.  
| Параметр | Тип | Обязательный |
|---|---|---|
| `groupUuids` | List\<UUID\> | да (можно несколько: `?groupUuids=a&groupUuids=b`) |
| `from` | LocalDate | да |
| `to` | LocalDate | да |

**Ответ:** `Flux<GroupWorkloadDto>`

---

## 4. Практики

### `GET /api/mobile/practice?from=&to=&groupUuids=`
Практики групп в диапазоне дат.  
| Параметр | Тип | Обязательный |
|---|---|---|
| `from` | LocalDate | да |
| `to` | LocalDate | да |
| `groupUuids` | List\<UUID\> | нет (можно несколько: `?groupUuids=a&groupUuids=b`) |

**Ответ:** `Flux<PracticeDto>`

---

## 5. Кафедры

### `GET /api/mobile/department?q=`
Поиск кафедр. `q` — поисковый запрос (опционально).  
**Ответ:** `Flux<DepartmentDto>`

---

## 6. Кружки и клубы

### `GET /api/mobile/club?type=&page=&size=&search=&departmentUuids=&dayOfWeek=&timeFrom=&timeTo=`
Пагинированный список клубов с фильтрами.  
| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `type` | String | да | `SPORTS_CLUB` или `SCIENCE_CLUB` |
| `page` | int | нет (default 0) | Номер страницы |
| `size` | int | нет (default 12) | Размер страницы |
| `search` | String | нет | Поиск по названию/описанию |
| `departmentUuids` | UUID[] | нет | Фильтр по кафедрам (можно несколько: `?departmentUuids=uuid1&departmentUuids=uuid2`) |
| `dayOfWeek` | Integer | нет | 1=ПН … 7=ВС |
| `timeFrom` | String | нет | «не раньше» HH:MM |
| `timeTo` | String | нет | «не позже» HH:MM |

**Логика фильтрации:** возвращаются клубы, у которых есть занятие в указанный день недели, и время занятия пересекается с заданным диапазоном.  
**Ответ:** `Mono<ClubPageDto>` (содержит `content`, `totalElements`, `totalPages`, `page`, `size`)

---

### `GET /api/mobile/club/{uuid}`
Один клуб по UUID.  
**Ответ:** `Mono<ClubDto>`

---

### `GET /api/mobile/club/department/{departmentUuid}`
Клубы конкретной кафедры.  
**Ответ:** `Flux<ClubDto>`

---

## 7. Новости

### `GET /api/mobile/news?page=&size=`
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

### `GET /api/mobile/news/{uuid}`
Одна новость по UUID.  
**Ответ:** `Mono<NewsDto>`

---

## 8. Справочная информация

### `GET /api/mobile/reference`
Вся справочная информация.  
**Ответ:** `Flux<ReferenceInfo>`

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
| `avatar` | String (относительный путь — добавить MINIO_URL) |
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
| `avatar` | String (относительный путь — добавить MINIO_URL) |
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
| `avatar` | String (относительный путь) |
| `academicTitle` | AcademicTitle |
| `totalPairs`, `totalHours` | int |
| `totalLecturePairs`, `totalLectureHours` | int |
| `totalPracticePairs`, `totalPracticeHours` | int |
| `totalCreditPairs`, `totalCreditHours` | int |
| `totalDifferentiatedCreditPairs`, `totalDifferentiatedCreditHours` | int |
| `totalExamPairs`, `totalExamHours` | int |
| `subjects` | List\<SubjectStat\> |

### SubjectStat (вложенный)
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
| ... (все счётчики типов занятий, как у LecturerWorkloadDto) | |
| `subjects` | List\<SubjectStat\> |
| `practices` | List\<PracticeDto\> |

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

# Полный список мобильных эндпоинтов (шпаргалка)

| # | Метод | Путь | Назначение |
|---|---|---|---|
| 1 | GET | `/api/mobile/pair/batch?from=&to=` | Активные пары за неделю |
| 2 | GET | `/api/mobile/group/all` | Все группы |
| 3 | GET | `/api/mobile/group/workload?groupUuids=&from=&to=` | Нагрузка групп |
| 4 | GET | `/api/mobile/lecturer/all` | Все преподаватели |
| 5 | GET | `/api/mobile/lecturer/workload?departmentUuid=&from=&to=` | Нагрузка преподавателей |
| 6 | GET | `/api/mobile/department?q=` | Поиск кафедр |
| 7 | GET | `/api/mobile/practice?from=&to=&groupUuids=` | Практики групп |
| 8 | GET | `/api/mobile/news?page=&size=` | Новости (пагинация) |
| 9 | GET | `/api/mobile/news/{uuid}` | Одна новость |
| 10 | GET | `/api/mobile/club?type=&page=&size=&search=&departmentUuids=&dayOfWeek=&timeFrom=&timeTo=` | Клубы с фильтрами |
| 11 | GET | `/api/mobile/club/{uuid}` | Один клуб |
| 12 | GET | `/api/mobile/club/department/{uuid}` | Клубы кафедры |
| 13 | GET | `/api/mobile/reference` | Справочная информация |

> **Важно:** для полей `avatar`, `url` — полный путь = `http://185.170.144.76:9002` + значение поля.
