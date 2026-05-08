# Qwen Code — памятка по проекту rus-react-2

## Что за проект
Расписание занятий (Spring Boot 4.0.6, Java 17, WebFlux, R2DBC + PostgreSQL, Flyway).  
Фронтенд: **vanilla JS** (jQuery + Bootstrap 5), Thymeleaf-шаблоны для layout, содержимое страниц рендерится через JS-шаблоны.

## Структура

```
src/main/java/com/example/rusreact2/
  controllers/rest/   — REST API (@RestController)
  controllers/web/    — веб-контроллеры (страницы)
  services/           — бизнес-логика (PairService главный)
  data/models/        — JPA-сущности (Pair, Lecturer, Group, Subject, Room...)
  data/dto/           — DTO (PairDto, CloneRequest, CloneResponse...)
  repositories/       — R2DBC-репозитории

src/main/resources/
  static/css/schedule.css
  static/js/pages/schedule/
    schedule-tabs.js        — точка входа (ланитовая загрузка)
    schedule-handmade.js    — основной модуль (~1900 строк): SCHEDULE_HTML + init()
    import-schedule.js      — модалка копирования недели
    export-schedule.js      — модалка экспорта
    api.js                  — AJAX-запросы к бэкенду
    utils.js, date.js       — утилиты
    blocks/table_sizer.js   — ресайз колонок
    practice.js             — вкладка «Практика»
  db.migration/             — Flyway-миграции
```

## Ключевые технические моменты

### R2DBC
- **derived delete не работает** — всегда `@Query("DELETE FROM ...")`
- `Set<UUID>` маппится на `UUID[]` в PostgreSQL напрямую (без join-таблиц)
- Дочерние коллекции: `@Transient` + delete-then-insert
- Фильтрация по массивам: `WHERE p.group_uuids && (:uuids)::uuid[]`

### Фронтенд
- **jQuery `.css()` не добавляет `!important`** — для приоритета использовать `element.style.setProperty(key, value, 'important')`
- **`toISOString()` сдвигает дату в UTC** — в МСК (UTC+3) полночь уходит на предыдущий день. Всегда форматировать локально: `${getFullYear()}-${pad(month+1)}-${pad(date)}`
- Модалки: самодельные (display:none/block + класс show), не Bootstrap modal
- Редактирование пары: саму пару исключать из проверок конфликтов

### Бэкенд
- `PairService.savePair(pair)` — create-or-update: uuid=null → создание, uuid≠null → редактирование
- Все проверки внутри savePair: дата не в прошлом, предмет/преподаватели обязательны, кафедра едина, занятость преподавателей/групп/аудиторий, практики с prohibitPairs
- `PairService.cloneWeek(request)` — копирует пары с исходной недели на целевую через вызов savePair для каждой; ошибки собираются в CloneResponse

## Частые проблемы
1. **write_file не перезаписывает существующие файлы** — использовать `node -e "fs.writeFileSync(...)"` для изменений в существующих файлах
2. **read_file обрезает большие файлы** — перечитывать с явным offset/limit или grep_search
3. **Часовой пояс с датами** — LocalDate на бэке, на фронте форматировать локально без UTC

## Действующие лица
- Пользователь: full-stack разработчик, сам ставит задачи и проверяет результат
- Проект: расписание для вуза, русский язык везде
