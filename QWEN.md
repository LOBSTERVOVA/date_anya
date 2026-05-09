# Qwen Code — памятка по проекту rus-react-2

## Что за проект
Расписание занятий для вуза (Spring Boot 4.0.6, Java 17, WebFlux, R2DBC + PostgreSQL, Flyway).  
Фронтенд: **vanilla JS** (jQuery + Bootstrap 5), Thymeleaf-шаблоны для layout, всё содержимое страниц рендерится через JS-шаблоны.  
**Язык:** русский везде (интерфейс, комментарии, логи, сообщения об ошибках).  
**Пользователь:** full-stack разработчик, сам ставит задачи, проверяет результат, работает в МСК (UTC+3).

---

## Структура проекта

### Бэкенд (`src/main/java/com/example/rusreact2/`)
```
config/
  MinioConfiguration.java   — создаёт бин MinioClient из minio.url/username/password
controllers/rest/
  PairController.java       — CRUD пар + cloneWeek + approvePairs
  ExportController.java     — POST /api/export/schedule (Excel)
controllers/web/
  SchedulePageController.java — GET /schedule (Thymeleaf)
services/
  PairService.java          — главный сервис: savePair, deletePair, cloneWeek, approvePairs, getWeekPairsBatch, convertPairToPairDto
  ExportService.java        — генерация Excel через Apache POI
  MinioService.java         — загрузка/удаление файлов в MinIO (uploadStream, uploadFile, deleteFile)
data/models/
  Pair.java                 — date, pairOrder, subjectUuid, roomUuid, type, isActive, lecturerUuids (Set<UUID>), groupUuids (Set<UUID>)
  Lecturer.java             — lastName, firstName, patronymic, departmentUuid
  Group.java                — groupName, course, educationForm, faculty, direction, specialization, kindsOfSports (Set<String>)
  Subject.java              — name, departmentUuid
  Room.java                 — title
  Practice.java             — groupUuid, title, practiceType, startDate, endDate, prohibitPairs
data/dto/
  PairDto.java, LecturerDto.java, GroupDto.java, RoomDto.java, SubjectDto.java
  CloneRequest.java         — departmentUuid, sourceDate, targetDate, lecturerUuids, daysOfWeek
  CloneResponse.java        — successCount, errors (List<CloneError>)
  CloneResponse.CloneError  — dayOfWeek, pairOrder, lecturerName, reason
  ExportRequest.java        — from, to, groups, departmentUuid
data/enums/
  EducationForm.java        — FULL_TIME, PART_TIME, MIXED
repositories/
  PairRepository.java       — findByDateBetween, findByDateAndPairOrder, findByDateBetweenAndIsActiveTrue
  LecturerRepository.java   — search(@Param), findByDepartmentUuid
  GroupRepository.java      — стандартный R2DBC
  PracticeRepository.java   — findBlockingPractices(groupUuids, date)
db.migration/
  V1__init.sql, V2__..., etc. — Flyway-миграции
```

### Фронтенд (`src/main/resources/static/js/pages/schedule/`)
```
schedule-tabs.js        — ТОЧКА ВХОДА: создаёт табы «Учебное расписание» / «Практика», лениво импортирует модули
schedule-handmade.js    — ОСНОВНОЙ МОДУЛЬ (~2000 строк):
                           - экспортирует init(container)
                           - SCHEDULE_HTML — полный HTML страницы (вкладки, модалки, таблица)
                           - init() — вставляет HTML, загружает данные, рендерит таблицу
                           - функции: loadDepartments, initDates, renderTable, loadPairsForWeek, renderPairsIntoGrid
import-schedule.js      — модалка копирования недели: экспортирует initImportSchedule()
export-schedule.js      — модалка экспорта в Excel
api.js                  — AJAX (jQuery): fetchDepartments, fetchLecturers, fetchWeekPairsBatch, savePair, cloneWeek, ...
utils.js                — showToast, getWeekStart, formatDateDDMM, formatLectFio, formatEducationForm, dateToIso
date.js                 — startOfWeekMonday, endOfWeekSunday, dateIsoFor
practice.js             — вкладка «Практика»: экспортирует init(container)
rooms.js                — рендерит таблицу занятости аудиторий (renderRoomsTable)
locks.js                — WebSocket-блокировки (SockJS + STOMP)
blocks/table_sizer.js   — фиксированный скроллбар + drag-to-resize колонок
```

### Конфигурация
- `build.gradle` — Spring Boot 4.0.6, Java 17, WebFlux, R2DBC, Flyway, Lombok
- `docker-compose.yml` — PostgreSQL
- `QWEN.md` — этот файл

---

## Ключевая архитектура фронтенда

### Как рендерится страница расписания
1. `template.html` → `<main id="schedule-root">` + `<script type="module" src="...schedule-tabs.js">`
2. `schedule-tabs.js` → создаёт табы, при активации вкладки «Учебное расписание» делает `import('./schedule-handmade.js')`
3. `schedule-handmade.js` → `init(container)` вставляет `SCHEDULE_HTML` (содержит и страницу, и все модалки), загружает данные, рендерит таблицу
4. Модалки: самодельные (display:none/block + класс show), **не Bootstrap modal** (кроме pair-modal и practice-modal)

### Переменные модуля schedule-handmade.js (замыкание)
- `loadedDepartments`, `loadedLecturers`, `loadedRooms`, `loadedGroups` — загруженные справочники
- `selectedDepartments` — выбранные кафедры (массив объектов {uuid, name, ...})
- `weekStart` — JS Date, понедельник текущей отображаемой недели
- `weekPairs` — пары за текущую неделю
- `window.weekStart`, `window.loadedDepartments`, `window.loadedLecturers`, `window.allGroups`, `window.renderTable` — экспорт для доступа из import-schedule.js и practice.js

### Как работает навигация по неделям
- `weekStart = getWeekStart(null)` — понедельник текущей недели
- Кнопки prev/next: `weekStart.setDate(weekStart.getDate() ± 7)` → `updateDisplay()` → `renderTable()`
- При каждом изменении: `window.weekStart = weekStart` + `saveScheduleState()`

### Как работает выбор кафедр
- Модалка `#additional-department-modal`: поиск → выбор → `selectedDepartments.push(dept)` → DOM-элемент в `#additional-departments` → `renderTable()`
- При удалении: `selectedDepartments = selectedDepartments.filter(...)` → удаление DOM-элемента → `renderTable()`
- Функция `renderExtraDepartments()` — пересоздаёт DOM-элементы всех selectedDepartments (для восстановления из localStorage)

### Сохранение состояния (localStorage)
- Ключ: `schedule_page_state`
- Сохраняется: weekStart (локальный YYYY-MM-DD) + selectedDepartments ({uuid, name})
- Сохранение при: навигации prev/next, добавлении/удалении кафедры
- Восстановление в init(): после загрузки loadedDepartments → `loadScheduleState()` → установка weekStart + selectedDepartments + `renderExtraDepartments()`

### Формат дат (КРИТИЧНО!)
- **НИКОГДА** `toISOString().split('T')[0]` — в МСК (UTC+3) дата сдвигается на день назад
- Всегда локальное форматирование: `${getFullYear()}-${pad(month+1)}-${pad(date)}`
- Бэкенд принимает `LocalDate` (ISO YYYY-MM-DD), Jackson десериализует корректно

---

## Реализованные фичи

### Расписание (schedule-handmade.js)
- Сетка дней × пар, 7 дней × 8 пар
- Выбор/удаление кафедр (searchable dropdown)
- Создание/редактирование/удаление пары (модалка)
- Поиск предмета, преподавателей, групп, аудитории
- Проверка конфликтов (преподаватель/группа/аудитория заняты, практика запрещает пары)
- Утверждение расписания
- Экспорт в Excel (для студентов / для преподавателей)
- Жирная линия между днями (класс `day-last-row` на последней строке дня)
- Контекстное меню по правому клику (кнопки Копировать/Вставить/Отмена)
- Сохранение состояния в localStorage (неделя + кафедры)

### Копирование недели (import-schedule.js)
- Модалка: searchable dropdown кафедры, селектор недель (с 1 сентября по текущую), чекбокс «Другая неделя» с datepicker
- Расширенные настройки: выбор преподавателей и дней недели (по умолчанию всё)
- Бэкенд: `PairService.cloneWeek(CloneRequest)` → загружает преподавателей кафедры → фильтрует пары → создаёт копии через `savePair` → собирает CloneResponse
- Модалка отчёта: группировка ошибок по дням → номерам пар → преподавателям → причинам

### Практика (practice.js)
- Выбор групп с группировкой: курс → форма обучения → факультет → группа
- Полный формат группы: `groupName — specialization. direction — kindsOfSports — faculty.`
- Поиск по всем полям (groupName, specialization, direction, kindsOfSports, faculty)
- Сетка дней учебного года (1 сентября – 31 августа)
- Модалка создания практики: название, тип, даты, запрет пар
- Статистика практик по группам с раскрытием

### Валидация групп по курсу
- Фронтенд (модалка пары): после выбора первой группы — фильтр по курсу
- Бэкенд (savePair): проверка, что все группы одного курса (400 Bad Request иначе)

---

## Бэкенд: ключевые методы

### PairService
```java
// CRUD
Flux<PairDto> getWeekPairsBatch(LocalDate from, LocalDate to)
Mono<PairDto> savePair(Pair pair)           // create-or-update, полная валидация
Mono<Void> deletePair(UUID uuid)            // нельзя удалить прошедшую пару
Mono<Integer> approvePairs(Set<UUID> departmentUuids)  // isActive=true

// Клонирование
Mono<CloneResponse> cloneWeek(CloneRequest request)
// Логика: загрузка преподавателей кафедры → фильтр по преподавателям и дням недели →
// для каждой пары savePair → сбор ошибок в CloneResponse

// Приватные
Mono<PairDto> convertPairToPairDto(Pair pair)  // загружает связанные сущности
Mono<List<LecturerDto>> getLecturers(Set<UUID> uuids)
Mono<List<GroupDto>> getGroups(Set<UUID> uuids)
Mono<RoomDto> getRoom(UUID uuid)
Mono<SubjectDto> getSubject(UUID uuid)
```

### savePair — полная цепочка проверок
1. uuid=null → создание, uuid≠null → редактирование
2. Валидация: дата не в прошлом, предмет обязателен, минимум 1 преподаватель
3. Проверка: предмет существует, преподаватели относятся к кафедре предмета
4. Загрузка существующих пар на ту же дату/номер пары (при редактировании — исключая себя)
5. Проверка занятости преподавателей
6. Проверка занятости групп
7. Проверка: все группы одного курса (если групп >1)
8. Проверка практик с prohibitPairs=true для групп на эту дату
9. Проверка занятости аудитории
10. Сохранение: isActive=false, возврат PairDto

---

## Проблемы и решения

### Инструменты редактирования
1. **`write_file` НЕ перезаписывает существующие файлы** — только создаёт новые
   - Для изменений: `node -e "fs.readFileSync + replace + fs.writeFileSync"`
   - Или: удалить файл (`del`), затем создать `write_file`
2. **`edit` tool** — часто выдаёт "binary payload" на файлах с кириллицей
   - Обход: использовать `node -e` или PowerShell
3. **`read_file` обрезает большие файлы** — перечитывать с offset/limit
4. **Экранирование в Node.js one-liner** — `\x27` для `'`, `\x60` для бэктика, `\r\n` для CRLF (в Windows-файлах)
5. **PowerShell Here-String** — `@' ... '@` сохраняет точные line endings, сложное экранирование

### Часовой пояс
- `toISOString()` → UTC, `new Date(2026,4,4)` (4 мая МСК) → `2026-05-03T21:00:00.000Z` → `split('T')[0]` → `2026-05-03` (ОШИБКА)
- Решение: `${getFullYear()}-${pad(month+1)}-${pad(date)}`
- Затронутые места: `import-schedule.js` (populateCopyWeekSelect, handleCopyWeekConfirm), `schedule-handmade.js` (saveScheduleState)

### R2DBC особенности
- Derived delete не поддерживается → `@Query("DELETE FROM ...")`
- `Set<UUID>` ↔ `UUID[]` в PostgreSQL (без join-таблиц)
- Дочерние коллекции: `@Transient` + delete-then-insert

### jQuery
- `.css()` не добавляет `!important` → использовать `element.style.setProperty(k, v, 'important')`
- Для чтения inline-стиля: `this.style.maxWidth` (не `.css()`)

### Модалки
- Самодельные (display:none/block + show), кроме pair-modal (Bootstrap modal)
- z-index: модалки 1055, backdrop 1050, dropdown 1060, toast 1070

### Редактирование пары
- При проверке конфликтов исключать саму редактируемую пару (`!existing.getUuid().equals(p.getUuid())`)
- Иначе назначение того же преподавателя ложно определяется как конфликт

---

## Типичный цикл работы
1. Пользователь ставит задачу (обычно несколько правок в одной области)
2. Я исследую код (agent Explore или grep_search + read_file)
3. Создаю todo_write для сложных задач
4. Вношу изменения (node -e для существующих файлов, write_file для новых)
5. Компилирую: `gradlew.bat compileJava --no-daemon`
6. Проверяю результат через grep_search и read_file
7. Удаляю временные файлы (_patch.js, _replace_clone.js)
