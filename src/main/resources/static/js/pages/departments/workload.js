/**
 * Страница нагрузка-часов преподавателей
 */
(function () {
  const deptSelect = document.getElementById('wlDept');
  const fromInput = document.getElementById('wlFrom');
  const toInput = document.getElementById('wlTo');
  const applyBtn = document.getElementById('wlApply');
  const cardsContainer = document.getElementById('wlCards');
  const summaryEl = document.getElementById('wlSummary');

  // Значения по умолчанию: с начала семестра по сегодня
  const now = new Date();
  const semesterStart = now.getMonth() < 8 ? `${now.getFullYear()}-02-01` : `${now.getFullYear()}-09-01`;
  fromInput.value = semesterStart;
  toInput.value = now.toISOString().slice(0, 10);

  let allDepartments = [];

  /* --- Инициализация --- */
  async function init() {
    try {
      const resp = await fetch('/api/department');
      allDepartments = await resp.json();
      deptSelect.innerHTML = '<option value="">— Выберите кафедру —</option>' +
        allDepartments.map(d => `<option value="${d.uuid}">${d.name}</option>`).join('');
    } catch (e) {
      deptSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
  }

  /* --- Применить --- */
  async function loadWorkload() {
    const deptUuid = deptSelect.value;
    if (!deptUuid) { summaryEl.textContent = 'Выберите кафедру'; return; }

    const from = fromInput.value;
    const to = toInput.value;
    if (!from || !to) { summaryEl.textContent = 'Укажите период'; return; }

    applyBtn.disabled = true;
    applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Загрузка...';

    try {
      const resp = await fetch(`/api/lecturer/workload?departmentUuid=${deptUuid}&from=${from}&to=${to}`);
      const data = await resp.json();
      renderCards(data || []);
      summaryEl.textContent = `Найдено преподавателей: ${(data || []).length}`;
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

  /* --- События --- */
  applyBtn.addEventListener('click', loadWorkload);
  document.addEventListener('DOMContentLoaded', init);
})();
