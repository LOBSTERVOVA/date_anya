/**
 * Страница нагрузки студентов (групп)
 */
(function () {
  const STORAGE_KEY = 'studentWorkloadFilters';

  let allGroups = [];
  let selectedGroupUuids = new Set();

  /* --- Инициализация --- */
  async function init(container) {
    // Значения по умолчанию
    const now = new Date();
    const semesterStart = now.getMonth() < 8 ? `${now.getFullYear()}-02-01` : `${now.getFullYear()}-09-01`;

    container.innerHTML = `
      <link rel="stylesheet" href="/css/workload.css" />
      <div class="container py-4">
        <div class="wl-header">
          <h1 class="h3 mb-1 fw-bold"><i class="bi bi-people me-2"></i>Нагрузка-часы студентов</h1>
          <p class="mb-0 opacity-75">Выберите группы и период для расчёта</p>
        </div>

        <!-- Фильтры: период -->
        <div class="card border-0 shadow-sm rounded-4 mb-3">
          <div class="card-body">
            <div class="row g-3 align-items-end">
              <div class="col-6 col-md-3">
                <label class="form-label small fw-semibold">С</label>
                <input id="swFrom" type="date" class="form-control" value="${semesterStart}" />
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label small fw-semibold">По</label>
                <input id="swTo" type="date" class="form-control" value="${now.toISOString().slice(0, 10)}" />
              </div>
              <div class="col-12 col-md-3">
                <button id="swApply" class="btn btn-primary rounded-pill w-100">
                  <i class="bi bi-search me-1"></i>Показать
                </button>
              </div>
              <div class="col-12 col-md-3">
                <button id="swReset" class="btn btn-outline-secondary rounded-pill w-100" title="Сбросить">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Сбросить
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Чипы выбранных групп -->
        <div id="swChips" class="d-flex flex-wrap gap-2 mb-3"></div>

        <!-- Поиск групп -->
        <div class="mb-3">
          <input id="swSearch" type="text" class="form-control" placeholder="Поиск групп по названию, направлению, специализации, факультету..." autocomplete="off" />
        </div>

        <!-- Список групп -->
        <div class="card border-0 shadow-sm rounded-4 mb-4">
          <div class="card-body" id="swGroupsCard">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-semibold">Группы</span>
              <button id="swSelectAll" class="btn btn-outline-primary btn-sm rounded-pill">Выбрать все</button>
            </div>
            <div id="swGroupsList" class="border rounded p-4" style="max-height: 420px; overflow-y: auto;"></div>
          </div>
        </div>

        <!-- Сводка и легенда -->
        <div id="swSummary" class="text-muted small mb-3"></div>
        <div id="swLegend" class="alert alert-info py-2 px-3 small mb-3 d-none">
          <i class="bi bi-info-circle me-2"></i>
          <span class="text-primary fw-medium">Л</span> — лекция,
          <span class="text-success fw-medium">П</span> — практика,
          <span class="text-warning fw-medium">З</span> — зачет,
          <span class="text-info fw-medium">ДЗ</span> — диф. зачет,
          <span class="text-danger fw-medium">Э</span> — экзамен.
          Все значения указаны в <strong>часах</strong> за выбранный период.
        </div>

        <!-- Карточки -->
        <div id="swCards" class="row g-3"></div>
      </div>
    `;

    const fromInput = document.getElementById('swFrom');
    const toInput = document.getElementById('swTo');
    const applyBtn = document.getElementById('swApply');
    const resetBtn = document.getElementById('swReset');
    const searchInput = document.getElementById('swSearch');
    const chipsEl = document.getElementById('swChips');
    const groupsListEl = document.getElementById('swGroupsList');
    const cardsEl = document.getElementById('swCards');
    const summaryEl = document.getElementById('swSummary');
    const legendEl = document.getElementById('swLegend');
    const selectAllBtn = document.getElementById('swSelectAll');

    // Загружаем все группы
    try {
      const resp = await fetch('/api/group');
      allGroups = (await resp.json())
        .sort((a, b) => (a.groupName || '').localeCompare(b.groupName || '', 'ru'));
    } catch (e) {
      groupsListEl.innerHTML = '<div class="text-danger py-3 text-center">Ошибка загрузки групп</div>';
      return;
    }

    // Восстанавливаем фильтры
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (filters.groupUuids?.length) {
          selectedGroupUuids = new Set(filters.groupUuids);
          if (filters.from) fromInput.value = filters.from;
          if (filters.to) toInput.value = filters.to;
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Рендер чипов
    function renderChips() {
      const selected = allGroups.filter(g => selectedGroupUuids.has(g.uuid));
      chipsEl.innerHTML = selected.map(g => `
        <span class="badge bg-light text-dark border d-inline-flex align-items-center gap-2 py-2 px-3 fw-normal">
          ${g.groupName}
          <button class="btn-close ms-1" style="font-size:.5rem;" data-remove="${g.uuid}" title="Убрать"></button>
        </span>
      `).join('') || '<span class="text-muted small">Группы не выбраны</span>';

      chipsEl.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedGroupUuids.delete(btn.dataset.remove);
          renderChips();
          renderGroupsList(searchInput.value);
        });
      });
    }

    // Рендер списка групп
    function renderGroupsList(search) {
      const q = (search || '').toLowerCase();
      let filtered = allGroups;
      if (q) {
        filtered = allGroups.filter(g =>
          (g.groupName || '').toLowerCase().includes(q) ||
          (g.direction || '').toLowerCase().includes(q) ||
          (g.specialization || '').toLowerCase().includes(q) ||
          (g.faculty || '').toLowerCase().includes(q) ||
          (g.kindsOfSports || []).some(s => s.toLowerCase().includes(q))
        );
      }

      const eduFormOrder = { FULL_TIME: 0, PART_TIME: 1, MIXED: 2 };
      const eduFormLabel = { FULL_TIME: 'Очная', PART_TIME: 'Заочная', MIXED: 'Очно-заочная' };

      // Группируем по курсу, внутри — по форме обучения
      const grouped = new Map();
      for (const g of filtered) {
        const courseKey = g.course || 0;
        if (!grouped.has(courseKey)) grouped.set(courseKey, new Map());
        const formMap = grouped.get(courseKey);
        const formKey = (g.educationForm || 'FULL_TIME').toUpperCase().trim();
        if (!formMap.has(formKey)) formMap.set(formKey, []);
        formMap.get(formKey).push(g);
      }

      // Сортируем внутри каждой формы
      for (const formMap of grouped.values()) {
        for (const arr of formMap.values()) {
          arr.sort((a, b) => (a.groupName || '').localeCompare(b.groupName || '', 'ru'));
        }
      }

      let html = '';
      const sortedCourses = [...grouped.keys()].sort((a, b) => a - b);
      for (const course of sortedCourses) {
        html += `<div class="fw-bold text-primary mt-2 mb-1 px-1">${course} курс</div>`;
        const formMap = grouped.get(course);
        const sortedForms = [...formMap.keys()].sort((a, b) => (eduFormOrder[a] || 99) - (eduFormOrder[b] || 99));
        for (const form of sortedForms) {
          html += `<div class="fw-semibold px-1 mt-1">${eduFormLabel[form] || form}</div>`;
          for (const g of formMap.get(form)) {
            const checked = selectedGroupUuids.has(g.uuid) ? 'checked' : '';
            // Доп. инфо: спорт, специализация, направление
            const extras = [];
            if (g.kindsOfSports?.length) extras.push(g.kindsOfSports.join(', '));
            if (g.specialization) extras.push(g.specialization);
            if (g.direction && !extras.includes(g.direction)) extras.push(g.direction);
            const extra = extras.join(' · ');
            html += `
              <div class="form-check py-1 px-2 border-bottom">
                <input class="form-check-input sw-group-cb" type="checkbox" value="${g.uuid}" id="swg-${g.uuid}" ${checked} />
                <label class="form-check-label" for="swg-${g.uuid}">
                  <span class="fw-medium">${g.groupName}</span>
                  ${g.faculty ? `<span class="text-muted">(${g.faculty})</span>` : ''}
                  ${extra ? `<span class="text-muted small"> — ${extra}</span>` : ''}
                </label>
              </div>`;
          }
        }
      }

      groupsListEl.innerHTML = html || '<div class="text-muted py-3 text-center">Группы не найдены</div>';

      // Обработчики чекбоксов
      groupsListEl.querySelectorAll('.sw-group-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) selectedGroupUuids.add(cb.value);
          else selectedGroupUuids.delete(cb.value);
          renderChips();
        });
      });
    }

    // Выбрать все
    selectAllBtn.addEventListener('click', () => {
      const q = (searchInput.value || '').toLowerCase();
      const filtered = q ? allGroups.filter(g =>
        (g.groupName || '').toLowerCase().includes(q) ||
        (g.direction || '').toLowerCase().includes(q) ||
        (g.specialization || '').toLowerCase().includes(q) ||
        (g.faculty || '').toLowerCase().includes(q) ||
        (g.kindsOfSports || []).some(s => s.toLowerCase().includes(q))
      ) : allGroups;
      filtered.forEach(g => selectedGroupUuids.add(g.uuid));
      renderChips();
      renderGroupsList(searchInput.value);
    });

    searchInput.addEventListener('input', () => renderGroupsList(searchInput.value));

    // Загрузка данных
    async function loadWorkload() {
      if (!selectedGroupUuids.size) { summaryEl.textContent = 'Выберите хотя бы одну группу'; return; }
      const from = fromInput.value;
      const to = toInput.value;
      if (!from || !to) { summaryEl.textContent = 'Укажите период'; return; }

      applyBtn.disabled = true;
      applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Загрузка...';

      try {
        const uuids = [...selectedGroupUuids].join(',');
        const resp = await fetch(`/api/group/workload?groupUuids=${uuids}&from=${from}&to=${to}`);
        const data = await resp.json();
        renderCards(data || []);
        summaryEl.textContent = `Найдено групп: ${(data || []).length}`;
        legendEl.classList.remove('d-none');

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          groupUuids: [...selectedGroupUuids],
          from, to
        }));
      } catch (e) {
        cardsEl.innerHTML = '<div class="col-12 text-danger text-center py-5">Не удалось загрузить данные</div>';
      } finally {
        applyBtn.disabled = false;
        applyBtn.innerHTML = '<i class="bi bi-search me-1"></i>Показать';
      }
    }

    // Рендер карточек
    function renderCards(list) {
      if (!list.length) {
        cardsEl.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="bi bi-emoji-neutral" style="font-size:3rem;"></i><p class="mt-2">Нет данных за выбранный период</p></div>';
        return;
      }

      const eduFormLabel = { FULL_TIME: 'Очная', MIXED: 'Очно-заочная', PART_TIME: 'Заочная' };
      const formatDate = d => d ? new Date(d).toLocaleDateString('ru-RU') : '';

      cardsEl.innerHTML = list.map(g => {
        // Строки по предметам
        const subjectsHtml = g.subjects.length
          ? g.subjects.map(s => {
              const parts = [];
              if (s.lecturePairs) parts.push(`<span class="text-primary fw-medium">Л: ${s.lectureHours} ч</span>`);
              if (s.practicePairs) parts.push(`<span class="text-success fw-medium">П: ${s.practiceHours} ч</span>`);
              if (s.creditPairs) parts.push(`<span class="text-warning fw-medium">З: ${s.creditHours} ч</span>`);
              if (s.differentiatedCreditPairs) parts.push(`<span class="text-info fw-medium">ДЗ: ${s.differentiatedCreditHours} ч</span>`);
              if (s.examPairs) parts.push(`<span class="text-danger fw-medium">Э: ${s.examHours} ч</span>`);
              return `<div class="d-flex justify-content-between small"><span>${s.subjectName}</span><span>${parts.join('  ')}</span></div>`;
            }).join('')
          : '<div class="text-muted small">Нет пар</div>';

        // Практики
        const practicesHtml = g.practices.length
          ? `<div class="mt-2 pt-2 border-top">
              <div class="fw-semibold small mb-1"><i class="bi bi-briefcase me-1"></i>Практики:</div>
              ${g.practices.map(pr => `
                <div class="small text-muted">
                  <span class="fw-medium">${pr.practiceTypeTitle || pr.practiceType || '—'}</span>
                  ${pr.title ? ` «${pr.title}»` : ''}
                  — ${formatDate(pr.startDate)} – ${formatDate(pr.endDate)}
                  ${pr.prohibitPairs ? '<i class="bi bi-lock-fill ms-1 text-danger" title="Запрет пар"></i>' : ''}
                </div>
              `).join('')}
            </div>`
          : '';

        // Итоговая строка
        const totalParts = [];
        if (g.totalLecturePairs) totalParts.push(`<span class="text-primary">Л: ${g.totalLectureHours} ч</span>`);
        if (g.totalPracticePairs) totalParts.push(`<span class="text-success">П: ${g.totalPracticeHours} ч</span>`);
        if (g.totalCreditPairs) totalParts.push(`<span class="text-warning">З: ${g.totalCreditHours} ч</span>`);
        if (g.totalDifferentiatedCreditPairs) totalParts.push(`<span class="text-info">ДЗ: ${g.totalDifferentiatedCreditHours} ч</span>`);
        if (g.totalExamPairs) totalParts.push(`<span class="text-danger">Э: ${g.totalExamHours} ч</span>`);

        return `
          <div class="col-12 col-md-6 col-xl-4">
            <div class="wl-card h-100">
              <div class="d-flex align-items-start gap-2 mb-2">
                <div class="flex-grow-1 min-w-0">
                  <div class="fw-bold text-truncate">${g.groupName}</div>
                  <div class="small text-muted">
                    ${g.course} курс · ${eduFormLabel[g.educationForm] || g.educationForm || ''}
                    ${g.faculty ? ' · ' + g.faculty : ''}
                  </div>
                </div>
              </div>
              <div class="wl-total mb-2">
                <i class="bi bi-mortarboard me-1"></i>
                <span class="fw-bold">${g.totalPairs}</span> пар (${g.totalHours} ч)
                ${totalParts.length ? ' &nbsp;' + totalParts.join(' &nbsp;') : ''}
              </div>
              <div class="wl-subjects">${subjectsHtml}</div>
              ${practicesHtml}
            </div>
          </div>`;
      }).join('');
    }

    // События
    applyBtn.addEventListener('click', loadWorkload);
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      selectedGroupUuids.clear();
      fromInput.value = semesterStart;
      toInput.value = new Date().toISOString().slice(0, 10);
      cardsEl.innerHTML = '';
      summaryEl.textContent = '';
      legendEl.classList.add('d-none');
      renderChips();
      renderGroupsList('');
      searchInput.value = '';
    });

    // Начальный рендер
    renderChips();
    renderGroupsList('');
  }

  window.initStudentWorkload = init;
})();
