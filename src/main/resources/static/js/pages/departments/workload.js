/**
 * Страница нагрузка-часов преподавателей
 */
(function () {
  const deptInput = document.getElementById('wlDept');
  const deptDropdown = document.getElementById('wlDeptDropdown');
  const fromInput = document.getElementById('wlFrom');
  const toInput = document.getElementById('wlTo');
  const applyBtn = document.getElementById('wlApply');
  const resetBtn = document.getElementById('wlReset');
  const cardsContainer = document.getElementById('wlCards');
  const summaryEl = document.getElementById('wlSummary');
  const legendEl = document.getElementById('wlLegend');

  const STORAGE_KEY = 'workloadFilters';

  // Значения по умолчанию: с начала семестра по сегодня
  const now = new Date();
  const semesterStart = now.getMonth() < 8 ? `${now.getFullYear()}-02-01` : `${now.getFullYear()}-09-01`;
  fromInput.value = semesterStart;
  toInput.value = now.toISOString().slice(0, 10);

  let allDepartments = [];
  let selectedDeptUuid = null;

  /* --- Инициализация --- */
  async function init() {
    try {
      const resp = await fetch('/api/department');
      allDepartments = (await resp.json())
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

      // Автозагрузка из localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const filters = JSON.parse(saved);
          if (filters.deptUuid && filters.deptName) {
            // Проверяем, что кафедра всё ещё существует
            const found = allDepartments.find(d => d.uuid === filters.deptUuid);
            if (found) {
              deptInput.value = found.name;
              selectedDeptUuid = found.uuid;
              if (filters.from) fromInput.value = filters.from;
              if (filters.to) toInput.value = filters.to;
              await loadWorkload();
            } else {
              // Кафедра больше не существует — чистим localStorage
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      deptDropdown.innerHTML = '<div class="dropdown-item text-muted">Ошибка загрузки</div>';
    }
  }

  function populateDropdown(q) {
    const search = q.toLowerCase();
    const filtered = allDepartments.filter(d =>
      d.name.toLowerCase().includes(search)
    );
    deptDropdown.innerHTML = '';
    if (!filtered.length) {
      deptDropdown.innerHTML = '<div class="dropdown-item text-muted py-2 px-3">Кафедры не найдены</div>';
      deptDropdown.classList.remove('show');
      return;
    }
    filtered.forEach(d => {
      const el = document.createElement('div');
      el.className = 'dropdown-item py-2 px-3 text-wrap';
      el.textContent = d.name;
      el.addEventListener('click', () => {
        deptInput.value = d.name;
        selectedDeptUuid = d.uuid;
        deptDropdown.classList.remove('show');
      });
      deptDropdown.appendChild(el);
    });
    deptDropdown.classList.add('show');
  }

  deptInput.addEventListener('input', () => {
    populateDropdown(deptInput.value);
  });
  deptInput.addEventListener('focus', () => {
    if (allDepartments.length) populateDropdown(deptInput.value);
  });
  // Скрываем дропдаун при клике вне
  document.addEventListener('click', (e) => {
    if (!deptInput.contains(e.target) && !deptDropdown.contains(e.target)) {
      deptDropdown.classList.remove('show');
    }
  });

  /* --- Применить --- */
  async function loadWorkload() {
    if (!selectedDeptUuid) { summaryEl.textContent = 'Выберите кафедру'; return; }

    const from = fromInput.value;
    const to = toInput.value;
    if (!from || !to) { summaryEl.textContent = 'Укажите период'; return; }

    applyBtn.disabled = true;
    applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Загрузка...';

    try {
      const resp = await fetch(`/api/lecturer/workload?departmentUuid=${selectedDeptUuid}&from=${from}&to=${to}`);
      const data = await resp.json();
      renderCards(data || []);
      summaryEl.textContent = `Найдено преподавателей: ${(data || []).length}`;
      legendEl.classList.remove('d-none');

      // Сохраняем фильтры в localStorage
      const deptName = deptInput.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        deptUuid: selectedDeptUuid,
        deptName: deptName,
        from: from,
        to: to
      }));
    } catch (e) {
      cardsContainer.innerHTML = '<div class="col-12 text-danger text-center py-5">Не удалось загрузить данные</div>';
    } finally {
      applyBtn.disabled = false;
      applyBtn.innerHTML = '<i class="bi bi-search me-1"></i>Показать';
    }
  }

  /* --- Карточки --- */
  function renderCards(list) {
    if (!list.length) {
      cardsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="bi bi-emoji-neutral" style="font-size:3rem;"></i><p class="mt-2">Нет данных за выбранный период</p></div>';
      return;
    }

    cardsContainer.innerHTML = list.map(l => {
      const initials = ((l.lastName || '').charAt(0) + (l.firstName || '').charAt(0)).toUpperCase() || '?';
      const subjectsHtml = l.subjects.length
        ? l.subjects.map(s => {
            const parts = [];
            if (s.lecturePairs) parts.push(`<span class="text-primary fw-medium">Л: ${s.lectureHours} ч</span>`);
            if (s.practicePairs) parts.push(`<span class="text-success fw-medium">П: ${s.practiceHours} ч</span>`);
            if (s.creditPairs) parts.push(`<span class="text-warning fw-medium">З: ${s.creditHours} ч</span>`);
            if (s.differentiatedCreditPairs) parts.push(`<span class="text-info fw-medium">ДЗ: ${s.differentiatedCreditHours} ч</span>`);
            if (s.examPairs) parts.push(`<span class="text-danger fw-medium">Э: ${s.examHours} ч</span>`);
            return `<div class="d-flex justify-content-between small"><span>${s.subjectName}</span><span>${parts.join('  ')}</span></div>`;
          }).join('')
        : '<div class="text-muted small">Нет пар</div>';

      const badgeMap = {
        PROFESSOR: 'badge-prof', DOCENT: 'badge-docent', SENIOR_LECTURER: 'badge-senior',
        LECTURER: 'badge-lect', EDUCATIONAL_METHODOLOGIST: 'badge-method'
      };
      const labelMap = {
        PROFESSOR: 'Профессор', DOCENT: 'Доцент', SENIOR_LECTURER: 'Ст. преп.',
        LECTURER: 'Преподаватель', EDUCATIONAL_METHODOLOGIST: 'Методист'
      };
      const badgeCls = badgeMap[l.academicTitle] || 'badge-lect';
      const badgeLabel = labelMap[l.academicTitle] || '';

      const totalParts = [];
      if (l.totalLecturePairs) totalParts.push(`<span class="text-primary">Л: ${l.totalLectureHours} ч</span>`);
      if (l.totalPracticePairs) totalParts.push(`<span class="text-success">П: ${l.totalPracticeHours} ч</span>`);
      if (l.totalCreditPairs) totalParts.push(`<span class="text-warning">З: ${l.totalCreditHours} ч</span>`);
      if (l.totalDifferentiatedCreditPairs) totalParts.push(`<span class="text-info">ДЗ: ${l.totalDifferentiatedCreditHours} ч</span>`);
      if (l.totalExamPairs) totalParts.push(`<span class="text-danger">Э: ${l.totalExamHours} ч</span>`);

      return `
        <div class="col-12 col-md-6 col-xl-4">
          <div class="wl-card h-100">
            <div class="d-flex align-items-start gap-3 mb-2">
              <div class="wl-avatar">${initials}</div>
              <div class="flex-grow-1 min-w-0">
                <div class="fw-bold text-truncate">${l.lastName} ${l.firstName} ${l.patronymic || ''}</div>
                ${badgeLabel ? `<span class="badge ${badgeCls} mt-1">${badgeLabel}</span>` : ''}
              </div>
            </div>
            <div class="wl-total mb-2">
              <i class="bi bi-mortarboard me-1"></i>
              <span class="fw-bold">${l.totalPairs}</span> пар (${l.totalHours} ч)
              ${totalParts.length ? ' &nbsp;' + totalParts.join(' &nbsp;') : ''}
            </div>
            <div class="wl-subjects">${subjectsHtml}</div>
          </div>
        </div>`;
    }).join('');
  }

  /* --- Сбросить --- */
  function resetWorkload() {
    localStorage.removeItem(STORAGE_KEY);
    deptInput.value = '';
    selectedDeptUuid = null;
    fromInput.value = semesterStart;
    toInput.value = new Date().toISOString().slice(0, 10);
    cardsContainer.innerHTML = '';
    summaryEl.textContent = '';
    legendEl.classList.add('d-none');
  }

  /* --- События --- */
  applyBtn.addEventListener('click', loadWorkload);
  resetBtn.addEventListener('click', resetWorkload);

  // Экспортируем init для вызова из workload-tabs.js
  window.initWorkload = init;
})();
