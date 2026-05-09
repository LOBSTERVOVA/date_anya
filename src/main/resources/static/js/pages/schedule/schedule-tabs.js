// ==================== SCHEDULE TAB MANAGER ====================
// Управляет переключателем «Учебное расписание» / «Практика»
// Лениво загружает соответствующие модули при первом открытии вкладки

const TABS_HTML = `
  <div class="schedule-tabs-wrapper">
    <ul class="nav nav-pills" id="scheduleTabNav" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="tab-btn-schedule" data-bs-toggle="tab"
                data-bs-target="#tab-schedule" type="button" role="tab" aria-selected="true">
          <i class="bi bi-calendar-week me-2"></i>Учебное расписание
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-btn-practice" data-bs-toggle="tab"
                data-bs-target="#tab-practice" type="button" role="tab" aria-selected="false">
          <i class="bi bi-briefcase me-2"></i>Практика
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-btn-groups" data-bs-toggle="tab"
                data-bs-target="#tab-groups" type="button" role="tab" aria-selected="false">
          <i class="bi bi-people-fill me-2"></i>Группы
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-btn-rooms-page" data-bs-toggle="tab"
                data-bs-target="#tab-rooms-page" type="button" role="tab" aria-selected="false">
          <i class="bi bi-door-open-fill me-2"></i>Аудитории
        </button>
      </li>
      <li class="nav-item ms-auto" role="presentation">
        <button class="btn btn-outline-secondary rounded-circle" id="help-btn"
                style="width:38px;height:38px;padding:0;font-weight:700;font-size:1.1rem;"
                data-bs-toggle="tooltip" data-bs-placement="bottom"
                title="Как пользоваться расписанием">?</button>
      </li>
    </ul>
  </div>

  <style>
    .schedule-tabs-wrapper {
      padding: 0.625rem 0.75rem 0 0.75rem;
    }
    .schedule-tabs-wrapper .nav-pills {
      gap: 0.375rem;
    }
    .schedule-tabs-wrapper .nav-link {
      border-radius: 0.625rem;
      padding: 0.6rem 1.25rem;
      font-weight: 500;
      font-size: 0.925rem;
      color: #4b5563;
      transition: all 0.2s ease;
    }
    .schedule-tabs-wrapper .nav-link:hover {
      color: #2563eb;
      background: rgba(37,99,235,.06);
    }
    .schedule-tabs-wrapper .nav-link.active {
      color: #fff !important;
      background: linear-gradient(135deg,#2563eb,#1d4ed8) !important;
      box-shadow: 0 2px 8px rgba(37,99,235,.3);
    }
    #tab-practice {
      min-height: 260px;
    }
  </style>

  <div class="tab-content" id="scheduleTabContent">
    <div class="tab-pane fade show active" id="tab-schedule" role="tabpanel" tabindex="0">
      <div class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Загрузка расписания…</p>
      </div>
    </div>

    <div class="tab-pane fade" id="tab-practice" role="tabpanel" tabindex="0">
      <div class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Загрузка практики…</p>
      </div>
    </div>

    <div class="tab-pane fade" id="tab-groups" role="tabpanel" tabindex="0">
      <div class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Загрузка групп…</p>
      </div>
    </div>

    <div class="tab-pane fade" id="tab-rooms-page" role="tabpanel" tabindex="0">
      <div class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Загрузка аудиторий…</p>
      </div>
    </div>
  </div>

  <!-- Модалка «Как пользоваться расписанием» -->
  <div class="modal fade" id="help-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title"><i class="bi bi-question-circle me-2"></i>Как пользоваться расписанием</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Закрыть"></button>
        </div>
        <div class="modal-body" style="font-size:0.95rem; line-height:1.7;">

          <div class="alert alert-info mb-4">
            <i class="bi bi-info-circle me-2"></i>
            На этой странице вы составляете учебное расписание и управляете практиками групп.
            Все изменения сохраняются автоматически при нажатии кнопки «Сохранить».
          </div>

          <!-- 1. Навигация -->
          <h5 class="text-primary mb-3">1. Навигация по неделям</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3 mb-3 p-3 bg-white rounded border">
                <button class="btn btn-outline-secondary rounded-circle" type="button" disabled>
                  <i class="bi bi-chevron-left"></i>
                </button>
                <div class="text-center">
                  <div class="fw-normal fs-5">Неделя</div>
                  <div class="text-muted small">04.05 — 10.05</div>
                </div>
                <button class="btn btn-outline-secondary rounded-circle" type="button" disabled>
                  <i class="bi bi-chevron-right"></i>
                </button>
                <div class="d-flex align-items-center gap-2 ms-3">
                  <div class="progress" style="width:100px;height:6px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:100%"></div>
                  </div>
                  <small class="text-muted">Загрузка пар…</small>
                </div>
              </div>
              <p><strong><i class="bi bi-chevron-left"></i> <i class="bi bi-chevron-right"></i> Стрелки влево/вправо</strong> — переключение между учебными неделями.</p>
              <p><strong>Поле с датой</strong> — можно ввести любую дату и нажать Enter, чтобы перейти к нужной неделе.</p>
              <p><strong>Прогрессбар</strong> — появляется при загрузке пар с сервера.</p>
              <strong class="text-danger"><i class="bi bi-arrow-clockwise"></i> Повторить загрузку</strong> — появляется только при ошибке. Нажмите, чтобы перезапросить данные.
              <p class="text-muted small mb-0">Диапазон отображаемой недели: понедельник – воскресенье.</p>
            </div>
          </div>

          <!-- 2. Кафедры -->
          <h5 class="text-primary mb-3">2. Выбор кафедры</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <p>Кафедра определяет, каких преподавателей и какие предметы вы видите в модалке создания пары.</p>
              <div class="d-flex align-items-center gap-3 mb-3 p-3 bg-white rounded border">
                <button class="btn btn-outline-primary btn-sm" type="button" disabled>
                  <i class="bi bi-plus-circle me-1"></i>Добавить кафедру
                </button>
                <div class="d-flex align-items-center gap-2 p-2 border rounded bg-light">
                  <span class="fw-medium">Кафедра анатомии и биологической антропологии</span>
                  <button class="btn btn-sm btn-outline-danger ms-auto" type="button" disabled>
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
              <p><strong><i class="bi bi-plus-circle"></i> Добавить кафедру</strong> — открывает модалку выбора кафедр. Можно выбрать несколько кафедр одновременно — их преподаватели и предметы объединятся в общем списке.</p>
              <p><strong><i class="bi bi-x"></i> (крестик на плашке кафедры)</strong> — убирает кафедру из фильтра.</p>
              <p class="text-muted small mb-0">Рекомендуется выбрать кафедру перед созданием пар — иначе списки преподавателей и предметов будут пустыми.</p>
            </div>
          </div>

          <!-- 3. Создание пары -->
          <h5 class="text-primary mb-3">3. Создание и редактирование пары</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <p><strong>Чтобы создать пару:</strong> нажмите на свободную ячейку в таблице расписания (пересечение дня и времени). Откроется модальное окно.</p>
              <p><strong>Чтобы редактировать:</strong> нажмите на ячейку, где уже есть пара.</p>
              <p class="text-danger small"><i class="bi bi-exclamation-triangle me-1"></i>Создавать и редактировать можно только пары на будущие даты (начиная с сегодняшнего дня). Прошедшие даты недоступны для изменений.</p>
              <hr>
              <p><strong>Поля в модалке:</strong></p>
              <ul>
                <li><span class="text-danger">*</span> <strong>Предмет</strong> — <strong>обязательное поле</strong>. Выберите из выпадающего списка (фильтруется по выбранным кафедрам).</li>
                <li><strong>Тип пары</strong> — Лекция, Практика, Зачет, Диф. зачет или Экзамен.</li>
                <li><span class="text-danger">*</span> <strong>Преподаватели</strong> — <strong>обязательно минимум один</strong>. Можно выбрать нескольких. Список фильтруется по кафедре предмета.</li>
                <li><strong>Группы</strong> — не обязательное поле. Можно не указывать, можно указать несколько групп для одной пары.</li>
                <li><strong>Аудитория</strong> — не обязательное поле. Можно оставить пустым, можно выбрать из списка.</li>
              </ul>
              <p class="mb-0"><strong><i class="bi bi-x"></i> (крестик на преподавателе/группе)</strong> — убирает преподавателя или группу из уже добавленных, не закрывая модалку.</p>
            </div>
          </div>

          <!-- 4. Удаление пары -->
          <h5 class="text-primary mb-3">4. Удаление пары</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <p>Откройте пару (клик по ячейке) и нажмите кнопку <strong>«Удалить»</strong> в левом нижнем углу модалки.</p>
              <p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Нельзя удалить пару с прошедшей датой.</p>
            </div>
          </div>

          <!-- 5. Утверждение -->
          <h5 class="text-primary mb-3">5. Утверждение расписания</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <div class="mb-3 p-3 bg-white rounded border">
                <button class="btn btn-warning btn-sm" type="button" disabled>
                  <i class="bi bi-check2-all me-1"></i>Утвердить расписание
                </button>
              </div>
              <p><strong><i class="bi bi-check2-all"></i> Утвердить расписание</strong> — помечает все пары для выбранных кафедр как утверждённые.</p>
              <p><strong>Чем отличаются утверждённые и неутверждённые пары:</strong></p>
              <ul>
                <li>Неутверждённые пары отмечены <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;vertical-align:middle;"></span> <strong>синим кружком</strong> в правой части ячейки.</li>
                <li>Неутверждённые пары <strong>не отображаются</strong> в мобильном приложении для студентов.</li>
                <li>Неутверждённые пары <strong>не попадают в экспорт</strong> Excel.</li>
                <li>При редактировании утверждённой пары она автоматически <strong>сбрасывается в неутверждённое</strong> состояние — это защита от случайных изменений.</li>
              </ul>
              <p class="text-muted small mb-0">Утверждайте расписание только когда все пары окончательно согласованы.</p>
            </div>
          </div>

          <!-- 6. Экспорт -->
          <h5 class="text-primary mb-3">6. Экспорт в Excel</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <div class="mb-3 p-3 bg-white rounded border">
                <button class="btn btn-success btn-sm" type="button" disabled>
                  Экспортировать расписание
                </button>
              </div>
              <p><strong>Экспортировать расписание</strong> — открывает модалку выбора периода и групп. После подтверждения скачивается Excel-файл (.xlsx) с расписанием.</p>
              <p>Поддерживается два вида экспорта:</p>
              <ul>
                <li><strong>Расписание студентов</strong> — выберите нужные группы (одну или несколько) и диапазон дат.</li>
                <li><strong>Расписание преподавателей</strong> — выберите кафедру и диапазон дат. Для каждого преподавателя будет создан отдельный лист.</li>
              </ul>
              <p class="text-muted small mb-0">Если у группы в какой-то день действует практика с запретом пар — в ячейках будет написано <strong>«Практика»</strong> крупным шрифтом.</p>
            </div>
          </div>

          <!-- 7. Группы -->
          <h5 class="text-primary mb-3">7. Создание группы</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <div class="mb-3 p-3 bg-white rounded border">
                <button class="btn btn-outline-secondary btn-sm" type="button" disabled>
                  <i class="bi bi-plus-circle me-1"></i>Добавить группу
                </button>
              </div>
              <p><strong><i class="bi bi-plus-circle"></i> Добавить группу</strong> — открывает модалку создания новой группы. Заполните поля:</p>
              <ul>
                <li><span class="text-danger">*</span> <strong>Название группы</strong> — обязательно (например: А-101).</li>
                <li><span class="text-danger">*</span> <strong>Факультет, Курс, Форма обучения</strong> — обязательные поля.</li>
                <li><strong>Направление, Специализация</strong> — не обязательные.</li>
                <li><strong>Виды спорта</strong> — не обязательное, для спортивных групп.</li>
              </ul>
            </div>
          </div>

          <!-- 8. Практика -->
          <h5 class="text-primary mb-3">8. Вкладка «Практика»</h5>
          <div class="card border-0 bg-light mb-4">
            <div class="card-body">
              <p>Переключитесь на вкладку <strong>«Практика»</strong> для управления учебными и производственными практиками групп.</p>
              <p><strong>Как создать практику:</strong></p>
              <ol>
                <li>В левой панели отметьте чекбоксами нужные группы.</li>
                <li>В таблице-сетке нажмите на ячейку (день + группа).</li>
                <li>В модалке заполните: название (не обязательно), тип практики, даты начала и окончания.</li>
                <li>При необходимости включите <strong>«Запретить пары в период практики»</strong> — тогда на время практики нельзя будет создать обычные пары для этой группы.</li>
                <li>Нажмите «Сохранить».</li>
              </ol>
              <p><strong>Цвета в сетке:</strong></p>
              <ul>
                <li><span style="display:inline-block;width:14px;height:14px;background:#dbeafe;border:2px solid #3b82f6;border-radius:3px;vertical-align:middle;"></span> Учебная практика</li>
                <li><span style="display:inline-block;width:14px;height:14px;background:#ffedd5;border:2px solid #f97316;border-radius:3px;vertical-align:middle;"></span> Производственная</li>
                <li><span style="display:inline-block;width:14px;height:14px;background:#ede9fe;border:2px solid #8b5cf6;border-radius:3px;vertical-align:middle;"></span> Преддипломная</li>
                <li><span style="display:inline-block;width:14px;height:14px;background:#dcfce7;border:2px solid #22c55e;border-radius:3px;vertical-align:middle;"></span> Научно-исследовательская</li>
              </ul>
              <p>Если на один день выпадает 2 практики — ячейка делится по диагонали. 3 и более — вертикальными полосами.</p>
              <p><strong><i class="bi bi-lock-fill"></i> Замок</strong> означает, что практика запрещает создание пар. Отображается в ячейках сетки и в легенде.</p>
              <p><strong>Статистика практик</strong> (под сеткой) — выберите диапазон дат и нажмите ↻. Раскройте группу, чтобы увидеть список её практик. Можно фильтровать: Все / С практиками / Без практик. Кнопка <i class="bi bi-trash3"></i> удаляет практику (только будущую).</p>
            </div>
          </div>

          <!-- 9. Правила -->
          <h5 class="text-danger mb-3">9. В каких случаях создание пары будет отклонено</h5>
          <div class="card border-danger bg-light mb-4">
            <div class="card-body">
              <table class="table table-sm mb-0">
                <thead class="table-danger">
                  <tr><th>Ошибка</th><th>Причина</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Преподаватель занят</strong></td><td>Выбранный преподаватель уже ведёт другую пару в это же время (та же дата + тот же порядковый номер пары).</td></tr>
                  <tr><td><strong>Группа занята</strong></td><td>Выбранная группа уже участвует в другой паре в это же время.</td></tr>
                  <tr><td><strong>Аудитория занята</strong></td><td>Выбранная аудитория уже используется другой парой в это же время.</td></tr>
                  <tr><td><strong>Практика запрещает пары</strong></td><td>У группы действует практика с включённой опцией «Запретить пары». На время такой практики создать пару нельзя.</td></tr>
                  <tr><td><strong>Дата в прошлом</strong></td><td>Нельзя создать или редактировать пару с датой раньше сегодняшнего дня.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <p class="text-center text-muted small mt-4">Если у вас остались вопросы — обратитесь к администратору системы.</p>

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Понятно</button>
        </div>
      </div>
    </div>
  </div>
`;

async function initTabs() {
    const root = document.getElementById('schedule-root');
    root.innerHTML = TABS_HTML;

    // Кнопка «?» — справка
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        new bootstrap.Tooltip(helpBtn);
        helpBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('help-modal'));
            modal.show();
        });
    }

    // Сразу загружаем модуль расписания (вкладка активна по умолчанию)
    async function loadScheduleModule() {
        const tabSchedule = document.getElementById('tab-schedule');
        // Показываем спиннер (на случай повторной попытки)
        tabSchedule.innerHTML = `<div class="text-center text-muted py-5">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p>Загрузка расписания…</p>
        </div>`;
        try {
            const scheduleModule = await import('./schedule-handmade.js');
            await scheduleModule.init(tabSchedule);
        } catch (err) {
            console.error('Failed to load schedule module:', err);
            tabSchedule.innerHTML = `<div class="alert alert-danger m-4 d-flex align-items-center gap-3">
                <span>Ошибка загрузки расписания</span>
                <button class="btn btn-outline-danger btn-sm" id="retry-schedule-load">
                    <i class="bi bi-arrow-clockwise me-1"></i>Повторить
                </button>
            </div>`;
            document.getElementById('retry-schedule-load').addEventListener('click', loadScheduleModule);
        }
    }

    await loadScheduleModule();

    // Практика — ленивая загрузка при первом переключении
    let practiceLoaded = false;
    const tabBtnPractice = document.getElementById('tab-btn-practice');

    tabBtnPractice.addEventListener('shown.bs.tab', async () => {
        if (practiceLoaded) return;
        practiceLoaded = true;
        try {
            const practiceModule = await import('./practice.js');
            const tabPractice = document.getElementById('tab-practice');
            await practiceModule.init(tabPractice);
        } catch (err) {
            console.error('Failed to load practice module:', err);
            const tabPractice = document.getElementById('tab-practice');
            tabPractice.innerHTML = `<div class="alert alert-danger m-4 d-flex align-items-center gap-3">
                <span>Ошибка загрузки раздела «Практика»</span>
                <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Обновить
                </button>
            </div>`;
        }
    });

    // Группы — ленивая загрузка
    let groupsLoaded = false;
    const tabBtnGroups = document.getElementById('tab-btn-groups');
    tabBtnGroups.addEventListener('shown.bs.tab', async () => {
        if (groupsLoaded) return;
        groupsLoaded = true;
        try {
            const groupsModule = await import('./groups.js');
            const tabGroups = document.getElementById('tab-groups');
            await groupsModule.init(tabGroups);
        } catch (err) {
            console.error('Failed to load groups module:', err);
            const tabGroups = document.getElementById('tab-groups');
            tabGroups.innerHTML = `<div class="alert alert-danger m-4 d-flex align-items-center gap-3">
                <span>Ошибка загрузки раздела «Группы»</span>
                <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Обновить
                </button>
            </div>`;
        }
    });

    // Аудитории — ленивая загрузка
    let roomsPageLoaded = false;
    const tabBtnRoomsPage = document.getElementById('tab-btn-rooms-page');
    tabBtnRoomsPage.addEventListener('shown.bs.tab', async () => {
        if (roomsPageLoaded) return;
        roomsPageLoaded = true;
        try {
            const roomsModule = await import('./rooms-tab.js');
            const tabRoomsPage = document.getElementById('tab-rooms-page');
            await roomsModule.init(tabRoomsPage);
        } catch (err) {
            console.error('Failed to load rooms module:', err);
            const tabRoomsPage = document.getElementById('tab-rooms-page');
            tabRoomsPage.innerHTML = `<div class="alert alert-danger m-4 d-flex align-items-center gap-3">
                <span>Ошибка загрузки раздела «Аудитории»</span>
                <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Обновить
                </button>
            </div>`;
        }
    });
}

// Стартуем, когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
} else {
    initTabs();
}
