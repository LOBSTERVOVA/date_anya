// ==================== PRACTICE MODULE ====================
// Вкладка «Практика»: выбор групп + сетка дней учебного года + модалка практики
// Лениво загружается schedule-tabs.js при первом переключении

import { fetchGroups, fetchPractices, savePractice, deletePractice, fetchDepartments, fetchLecturers } from './api.js';
import { formatDateDDMM, formatEducationForm, dateToIso, showToast } from './utils.js';

let allGroups = [];
let selectedGroups = []; // сохраняет порядок выбора чекбоксов
let academicDates = null; // { startDate, endDate } — кэш учебного года
let editingPracticeUuid = null; // uuid редактируемой практики (null = создание)
let allPractices = []; // загруженные практики для текущей сетки
let loadedDepartments = [];
let loadedLecturers = [];

const FORM_ORDER = { 'FULL_TIME': 0, 'PART_TIME': 1, 'MIXED': 2 };
const FORM_LABELS = { 'FULL_TIME': 'Очная', 'PART_TIME': 'Заочная', 'MIXED': 'Очно-заочная' };

// Цвета для типов практик (фиксированная палитра)
const PRACTICE_COLORS = {
    'EDUCATIONAL':          { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', label: 'Учебная' },
    'PRODUCTION':           { bg: '#ffedd5', border: '#f97316', text: '#9a3412', label: 'Производственная' },
    'PRE_GRADUATION':       { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', label: 'Преддипломная' },
    'SCIENTIFIC_RESEARCH':  { bg: '#dcfce7', border: '#22c55e', text: '#166534', label: 'Научно-исследовательская' }
};

export async function init(container) {
    try {
        allGroups = await fetchGroups('');
    } catch (e) {
        console.error('Failed to load groups for practice', e);
        container.innerHTML = '<div class="alert alert-danger m-4">Ошибка загрузки групп</div>';
        return;
    }

    // Фоновая загрузка кафедр и преподавателей (не блокирует отрисовку)
    loadDeptsAndLecturers();

    academicDates = makeAcademicYear();
    renderUI(container);
    setupGridClickDelegation(container);
}

// ----------------------------------------------------------------
//  UI
// ----------------------------------------------------------------

function renderUI(container) {
    container.innerHTML = `
      <section class="container-fluid py-4">
        <div class="bg-white rounded-4 shadow p-4">
          <h5 class="mb-3 fw-semibold">
            <i class="bi bi-briefcase me-2"></i>Выбор групп для создания практики
          </h5>

          <div class="position-relative mb-3">
            <input id="practice-groups-search" type="text" class="form-control"
                   placeholder="Найти группы…" autocomplete="off" />
          </div>

          <div id="practice-groups-list" class="border rounded p-2 mb-3"
               style="max-height: 320px; overflow-y: auto;"></div>

          <div id="practice-selected-chips" class="d-flex flex-wrap gap-2 mb-3"></div>

          <!-- Легенда -->
          <div id="practice-legend" class="mb-3" style="display:none;"></div>

          <div id="practice-grid-wrap" style="display:none;">
            <div class="table-responsive" style="max-height: 72vh; overflow-y: auto;">
              <table class="table table-bordered align-middle mb-0"
                     id="practice-grid-table" style="table-layout:fixed; min-width:100%;">
                <thead class="table-light" style="position:sticky; top:0; z-index:2;">
                  <tr id="practice-grid-header">
                    <th style="width:48px;min-width:48px;">День</th>
                    <th style="width:100px;min-width:100px;">Дата</th>
                  </tr>
                </thead>
                <tbody id="practice-grid-body"></tbody>
              </table>
            </div>
          </div>

          <!-- Статистика практик по группам -->
          <div id="practice-stats-section" class="mt-4">
            <h6 class="fw-semibold mb-3 d-flex align-items-center gap-2">
              <i class="bi bi-bar-chart"></i> Статистика практик
            </h6>
            <div class="row g-3 mb-3">
              <div class="col-auto">
                <label class="form-label small text-muted">с</label>
                <input type="date" id="stats-from" class="form-control form-control-sm" style="width:150px;" />
              </div>
              <div class="col-auto">
                <label class="form-label small text-muted">по</label>
                <input type="date" id="stats-to" class="form-control form-control-sm" style="width:150px;" />
              </div>
              <div class="col-auto d-flex align-items-end">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="stats-refresh-btn">
                  <i class="bi bi-arrow-repeat"></i>
                </button>
              </div>
              <div class="col-auto d-flex align-items-end ms-auto">
                <div class="btn-group btn-group-sm" role="group" id="stats-toggle-group">
                  <input type="radio" class="btn-check" name="stats-filter" id="stats-all" value="all" checked />
                  <label class="btn btn-outline-secondary" for="stats-all">Все</label>
                  <input type="radio" class="btn-check" name="stats-filter" id="stats-with" value="with" />
                  <label class="btn btn-outline-secondary" for="stats-with">С практиками</label>
                  <input type="radio" class="btn-check" name="stats-filter" id="stats-without" value="without" />
                  <label class="btn btn-outline-secondary" for="stats-without">Без практик</label>
                </div>
              </div>
            </div>
            <div class="mb-3">
              <input type="text" id="stats-group-search" class="form-control form-control-sm"
                     placeholder="Поиск по группам…" autocomplete="off" />
            </div>
            <div id="stats-group-list" class="border rounded p-1"
                 style="max-height: 60vh; overflow-y: auto;"></div>
          </div>
        </div>
      </section>

      <!-- Модалка практического занятия -->
      <div id="practice-modal" class="modal" tabindex="-1" style="display:none;">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Практическое занятие</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label" for="practice-modal-name">Название практики <span class="text-muted">(не обязательно)</span></label>
                <input type="text" class="form-control" id="practice-modal-name"
                       placeholder="Например: Производственная практика" />
              </div>
              <div class="mb-3">
                <label class="form-label">Группы</label>
                <div id="practice-modal-groups" class="border rounded p-2"
                     style="max-height:200px; overflow-y:auto;"></div>
              </div>
              <div class="mb-3">
                <label class="form-label">Кафедра <span class="text-danger">*</span></label>
                <div class="position-relative">
                  <input type="text" class="form-control" id="practice-modal-dept-search"
                         placeholder="Поиск кафедры…" autocomplete="off" />
                  <div id="practice-modal-dept-dropdown" class="dropdown-menu w-100"
                       style="max-height:200px;overflow-y:auto;display:none;"></div>
                </div>
              </div>
              <div class="mb-3" id="practice-modal-lecturer-block" style="display:none;">
                <label class="form-label">Преподаватель <span class="text-danger">*</span></label>
                <div class="position-relative">
                  <input type="text" class="form-control" id="practice-modal-lecturer-search"
                         placeholder="Поиск преподавателя…" autocomplete="off" disabled />
                  <div id="practice-modal-lecturer-dropdown" class="dropdown-menu w-100"
                       style="max-height:200px;overflow-y:auto;display:none;"></div>
                </div>
                <div id="practice-modal-selected-lecturer" class="mt-2"></div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="practice-modal-type">Тип практики</label>
                <select class="form-select" id="practice-modal-type">
                  <option value="">—</option>
                  <option value="EDUCATIONAL">Учебная</option>
                  <option value="PRODUCTION">Производственная</option>
                  <option value="PRE_GRADUATION">Преддипломная</option>
                  <option value="SCIENTIFIC_RESEARCH">Научно-исследовательская</option>
                </select>
              </div>
              <div class="row g-3">
                <div class="col-6">
                  <label class="form-label" for="practice-modal-start">Дата начала</label>
                  <input type="date" class="form-control" id="practice-modal-start" />
                </div>
                <div class="col-6">
                  <label class="form-label" for="practice-modal-end">Дата окончания</label>
                  <input type="date" class="form-control" id="practice-modal-end" />
                </div>
              </div>
              <div class="form-check mt-3">
                <input class="form-check-input" type="checkbox" id="practice-modal-block-pairs" />
                <label class="form-check-label" for="practice-modal-block-pairs">
                  Запретить пары в период практики
                </label>
              </div>
              <div id="practice-modal-error" class="alert alert-danger mt-3" style="display:none;"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
              <button type="button" class="btn btn-primary" id="practice-modal-save">
                <span class="spinner-border spinner-border-sm me-1" style="display:none;"></span>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#practice-groups-search').addEventListener('input', () => renderGroupList());

    // Поиск кафедры в модалке
    const deptSearch = document.getElementById('practice-modal-dept-search');
    const deptDropdown = document.getElementById('practice-modal-dept-dropdown');
    if (deptSearch) {
        deptSearch.addEventListener('input', () => filterModalDepts(deptSearch.value));
        deptSearch.addEventListener('focus', () => { if (deptSearch.value) filterModalDepts(deptSearch.value); else { populateModalDeptDropdown(''); deptDropdown.style.display = 'block'; } });
        document.addEventListener('click', (e) => { if (!deptSearch.contains(e.target) && !deptDropdown.contains(e.target)) deptDropdown.style.display = 'none'; });
    }

    // Поиск преподавателя в модалке
    const lectSearch = document.getElementById('practice-modal-lecturer-search');
    const lectDropdown = document.getElementById('practice-modal-lecturer-dropdown');
    if (lectSearch) {
        lectSearch.addEventListener('input', () => filterModalLecturers(lectSearch.value));
        lectSearch.addEventListener('focus', () => { if (lectSearch.value) filterModalLecturers(lectSearch.value); else { populateModalLectDropdown(''); lectDropdown.style.display = 'block'; } });
        document.addEventListener('click', (e) => { if (!lectSearch.contains(e.target) && !lectDropdown.contains(e.target)) lectDropdown.style.display = 'none'; });
    }
    container.querySelector('#practice-modal-save').addEventListener('click', () => onSavePractice());

    // Статистика
    const statsFrom = container.querySelector('#stats-from');
    const statsTo = container.querySelector('#stats-to');
    const statsRefresh = container.querySelector('#stats-refresh-btn');
    const statsSearch = container.querySelector('#stats-group-search');
    if (statsFrom && statsTo) {
        const today = new Date();
        statsFrom.value = dateToIso(today);
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        statsTo.value = dateToIso(nextMonth);
        statsRefresh?.addEventListener('click', () => { statsLoaded = false; loadStats(); });
        statsSearch?.addEventListener('input', () => renderStatsList());
        document.querySelectorAll('#stats-toggle-group input').forEach(r =>
            r.addEventListener('change', () => renderStatsList()));
    }

    renderGroupList();
    loadStats();
}

// ----------------------------------------------------------------
//  Сортировка и отрисовка групп (по курсам → формам → алфавиту)
// ----------------------------------------------------------------

function sortGroups(groups) {
    return [...groups].sort((a, b) => {
        if (a.course !== b.course) return a.course - b.course;
        const fa = FORM_ORDER[a.educationForm] ?? 3;
        const fb = FORM_ORDER[b.educationForm] ?? 3;
        if (fa !== fb) return fa - fb;
        if ((a.faculty || "") !== (b.faculty || "")) return (a.faculty || "").localeCompare(b.faculty || "");
        return a.groupName.localeCompare(b.groupName);
    });
}

function getFilteredGroups() {
    const q = (document.getElementById('practice-groups-search')?.value || '').toLowerCase();
    const pool = q ? allGroups.filter(g => {
        const haystack = [g.groupName, g.specialization, g.direction, g.faculty, (g.kindsOfSports || []).join(", ")].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
    }) : allGroups;
    return sortGroups(pool);
}

function formatGroupInfo(g) {
    const parts = [g.groupName];
    if (g.specialization) parts.push(g.specialization);
    if (g.direction) parts.push(g.direction);
    if (g.kindsOfSports && g.kindsOfSports.length > 0) parts.push(g.kindsOfSports.join(", "));
    if (g.faculty) parts.push(g.faculty);
    return parts.join(" — ") + ".";
}

function renderGroupList() {
    const list = document.getElementById('practice-groups-list');
    if (!list) return;

    const filtered = getFilteredGroups();
    let html = '';
    let lastCourse = null;
    let lastForm = null;
    let lastFaculty = null;

    for (const g of filtered) {
        if (g.course !== lastCourse) {
            html += `<div class="practice-group-course-header">${g.course} курс</div>`;
            lastCourse = g.course;
            lastForm = null;
            lastFaculty = null;
        }
        if (g.educationForm !== lastForm) {
            html += `<div class="practice-group-form-header">${FORM_LABELS[g.educationForm] || g.educationForm}</div>`;
            lastForm = g.educationForm;
            lastFaculty = null;
        }
        const fac = g.faculty || '';
        if (fac !== (lastFaculty || '')) {
            html += `<div class="text-muted small fw-semibold mt-1 ms-3">${fac || 'Без факультета'}</div>`;
            lastFaculty = fac;
        }

        const checked = selectedGroups.some(sg => sg.uuid === g.uuid);
        const info = formatGroupInfo(g);
        const extra = info.substring(g.groupName.length + 3); // убираем "groupName — "
        html += `
          <div class="form-check ms-4">
            <input class="form-check-input practice-group-check" type="checkbox"
                   value="${g.uuid}" id="pg-${g.uuid}" ${checked ? 'checked' : ''} />
            <label class="form-check-label" for="pg-${g.uuid}">
              <span class="fw-medium">${g.groupName}</span>
              <span class="text-muted ms-1 small">${extra}</span>
            </label>
          </div>`;
    }

    if (!filtered.length) {
        html = '<div class="text-muted small p-2">Ничего не найдено</div>';
    }

    list.innerHTML = html;

    list.querySelectorAll('.practice-group-check').forEach(cb => {
        cb.addEventListener('change', () => onGroupToggle(cb));
    });
}

// ----------------------------------------------------------------
//  Логика выбора групп
// ----------------------------------------------------------------

function onGroupToggle(checkbox) {
    const group = allGroups.find(g => g.uuid === checkbox.value);
    if (!group) return;

    if (checkbox.checked) {
        if (!selectedGroups.some(sg => sg.uuid === group.uuid)) {
            selectedGroups.push(group);
        }
    } else {
        selectedGroups = selectedGroups.filter(sg => sg.uuid !== group.uuid);
    }

    renderChips();
    renderGrid();
    renderGroupList();
}

function renderChips() {
    const chips = document.getElementById('practice-selected-chips');
    if (!chips) return;

    if (selectedGroups.length === 0) {
        chips.innerHTML = '<span class="text-muted small">Группы не выбраны</span>';
        return;
    }

    chips.innerHTML = selectedGroups.map((g, i) => `
      <span class="badge bg-primary rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2"
            style="cursor:default; font-size:0.85rem;">
        <span>${i + 1}. ${g.groupName}</span>
        <button type="button" class="btn-close btn-close-white practice-chip-remove"
                data-uuid="${g.uuid}" aria-label="Убрать"
                style="font-size:0.5rem;"></button>
      </span>
    `).join('');

    chips.querySelectorAll('.practice-chip-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedGroups = selectedGroups.filter(sg => sg.uuid !== btn.dataset.uuid);
            renderChips();
            renderGrid();
            renderGroupList();
        });
    });
}

// ----------------------------------------------------------------
//  Сетка (дни × группы)
// ----------------------------------------------------------------

function renderGrid() {
    const wrap = document.getElementById('practice-grid-wrap');
    const body = document.getElementById('practice-grid-body');
    const header = document.getElementById('practice-grid-header');

    if (!wrap || !body || !header) return;

    if (selectedGroups.length === 0) {
        wrap.style.display = 'none';
        document.getElementById('practice-legend').style.display = 'none';
        return;
    }

    wrap.style.display = 'block';

    // Заголовки
    header.innerHTML = `
      <th style="width:48px;min-width:48px;">День</th>
      <th style="width:100px;min-width:100px;">Дата</th>
      ${selectedGroups.map(g => {
          const tooltip = [
              `Группа: ${g.groupName}`,
              `Курс: ${g.course}`,
              `Форма: ${formatEducationForm(g.educationForm)}`,
              g.faculty ? `Факультет: ${g.faculty}` : '',
              g.direction ? `Направление: ${g.direction}` : '',
              g.specialization ? `Специализация: ${g.specialization}` : ''
          ].filter(Boolean).join('&#10;');

          return `<th style="min-width:110px; cursor:default;"
                      data-bs-toggle="tooltip" data-bs-html="true"
                      title="${tooltip}">
                    ${g.groupName}
                  </th>`;
      }).join('')}
    `;

    header.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        try {
            new bootstrap.Tooltip(el, { placement: 'bottom', delay: { show: 300, hide: 100 } });
        } catch (_) { /* */ }
    });

    // Тело: строки 1 сентября → 31 августа
    const { startDate, endDate } = academicDates;
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    const fragment = document.createDocumentFragment();
    const cur = new Date(startDate);

    while (cur <= endDate) {
        const tr = document.createElement('tr');
        const dow = dayNames[cur.getDay()];
        const dateStr = formatDateDDMM(cur);
        const iso = dateToIso(cur);
        const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;
        const dimmed = isWeekend ? ' text-muted' : '';

        tr.innerHTML = `
          <td class="text-center fw-semibold small${dimmed}">${dow}</td>
          <td class="text-center small${dimmed}">${dateStr}</td>
          ${selectedGroups.map(g =>
              `<td class="practice-cell" data-date="${iso}" data-group-uuid="${g.uuid}"></td>`
          ).join('')}
        `;
        fragment.appendChild(tr);
        cur.setDate(cur.getDate() + 1);
    }

    body.innerHTML = '';
    body.appendChild(fragment);

    // Загружаем практики и раскрашиваем
    loadPractices();

    // Скролл к сегодняшней дате
    const today = new Date();
    if (today >= startDate && today <= endDate) {
        const dayIndex = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const row = body.children[dayIndex];
        if (row) {
            setTimeout(() => row.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
        }
    }
}

// ----------------------------------------------------------------
//  Загрузка и отображение практик
// ----------------------------------------------------------------

async function loadPractices() {
    if (selectedGroups.length === 0) return;

    const { startDate, endDate } = academicDates;
    const groupUuids = selectedGroups.map(g => g.uuid);

    try {
        allPractices = await fetchPractices(dateToIso(startDate), dateToIso(endDate), groupUuids);
    } catch (e) {
        console.error('Failed to load practices', e);
        allPractices = [];
    }

    renderPracticeColors();
    renderLegend();
}

function renderPracticeColors() {
    const body = document.getElementById('practice-grid-body');
    if (!body) return;

    // Строим индекс: groupUuid → { dateIso → [practices] }
    const index = {};
    for (const p of allPractices) {
        const gUuid = p.groupUuid;
        if (!index[gUuid]) index[gUuid] = {};

        // Для каждого дня от start до end добавляем практику
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        const cur = new Date(start);
        while (cur <= end) {
            const iso = dateToIso(cur);
            if (!index[gUuid][iso]) index[gUuid][iso] = [];
            // Избегаем дубликатов (одна практика не должна дублироваться)
            if (!index[gUuid][iso].some(x => x.uuid === p.uuid)) {
                index[gUuid][iso].push(p);
            }
            cur.setDate(cur.getDate() + 1);
        }
    }

    // Раскрашиваем ячейки
    const cells = body.querySelectorAll('.practice-cell');
    cells.forEach(cell => {
        const date = cell.dataset.date;
        const groupUuid = cell.dataset.groupUuid;
        const practices = (index[groupUuid] && index[groupUuid][date]) || [];

        // Сбрасываем
        cell.style.background = '';
        cell.style.backgroundImage = '';
        cell.title = '';

        if (practices.length === 0) return;

        const hasLock = practices.some(p => p.prohibitPairs);
        const lockHtml = hasLock ? ' <i class="bi bi-lock-fill" style="font-size:0.55rem;opacity:0.7;"></i>' : '';

        if (practices.length === 1) {
            const p = practices[0];
            const colors = PRACTICE_COLORS[p.practiceType] || { bg: '#e5e7eb', border: '#9ca3af', text: '#374151' };
            cell.style.background = colors.bg;
            cell.style.borderLeft = `3px solid ${colors.border}`;
            cell.title = `${p.title || p.practiceType || ''}: ${p.startDate} – ${p.endDate}${p.prohibitPairs ? ' (пары запрещены)' : ''}`;
            cell.innerHTML = `<span style="font-size:0.7rem;color:${colors.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100px;">${p.title || ''}${p.prohibitPairs ? lockHtml : ''}</span>`;
        } else if (practices.length === 2) {
            // Делим ячейку по диагонали: верх-лево — первая практика, низ-право — вторая
            const c1 = PRACTICE_COLORS[practices[0].practiceType] || { bg: '#e5e7eb' };
            const c2 = PRACTICE_COLORS[practices[1].practiceType] || { bg: '#d1d5db' };
            cell.style.background = `linear-gradient(135deg, ${c1.bg} 50%, ${c2.bg} 50%)`;
            cell.title = [
                `${practices[0].title || ''}: ${practices[0].startDate} – ${practices[0].endDate}${practices[0].prohibitPairs ? ' (пары запрещены)' : ''}`,
                `${practices[1].title || ''}: ${practices[1].startDate} – ${practices[1].endDate}${practices[1].prohibitPairs ? ' (пары запрещены)' : ''}`
            ].join('\n');
            cell.innerHTML = hasLock ? `<span style="position:absolute;top:1px;right:2px;font-size:0.55rem;opacity:0.7;">${lockHtml}</span>` : '';
        } else {
            // 3+ практик — вертикальные полосы
            const colors = practices.map(p => PRACTICE_COLORS[p.practiceType] || { bg: '#e5e7eb' });
            const total = colors.length;
            const stops = colors.map((c, i) => {
                const pctStart = (i / total * 100).toFixed(1);
                const pctEnd = ((i + 1) / total * 100).toFixed(1);
                return `${c.bg} ${pctStart}%, ${c.bg} ${pctEnd}%`;
            });
            cell.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
            cell.title = practices.map(p =>
                `${p.title || ''}: ${p.startDate} – ${p.endDate}${p.prohibitPairs ? ' (пары запрещены)' : ''}`
            ).join('\n');
            cell.innerHTML = hasLock ? `<span style="position:absolute;top:1px;right:2px;font-size:0.55rem;opacity:0.7;">${lockHtml}</span>` : '';
        }
    });
}

function renderLegend() {
    const legend = document.getElementById('practice-legend');
    if (!legend) return;

    // Собираем уникальные практики (по uuid) которые видны в сетке
    const seen = new Set();
    const unique = [];
    for (const p of allPractices) {
        if (!seen.has(p.uuid)) {
            seen.add(p.uuid);
            unique.push(p);
        }
    }

    if (unique.length === 0) {
        legend.style.display = 'none';
        return;
    }

    legend.style.display = 'block';
    legend.innerHTML = `
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-palette"></i>
        <span class="fw-semibold small">Обозначения практик:</span>
      </div>
      <div class="d-flex flex-wrap gap-3">
        ${unique.map(p => {
            const colors = PRACTICE_COLORS[p.practiceType] || { bg: '#e5e7eb', border: '#9ca3af', text: '#374151' };
            const lockIcon = p.prohibitPairs ? ' <i class="bi bi-lock-fill" style="font-size:0.65rem;" title="Пары запрещены"></i>' : '';
            return `
              <div class="d-flex align-items-center gap-1">
                <span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${colors.bg};border:2px solid ${colors.border};flex-shrink:0;"></span>
                <span class="small" style="color:${colors.text};">
                  <strong>${p.title || PRACTICE_COLORS[p.practiceType]?.label || p.practiceType}${lockIcon}</strong>
                  <span class="text-muted">${formatDateDDMM(new Date(p.startDate))} – ${formatDateDDMM(new Date(p.endDate))}</span>
                </span>
              </div>`;
        }).join('')}
      </div>
    `;
}


// ----------------------------------------------------------------
//  Выпадающий список кафедр в модалке
// ----------------------------------------------------------------

let modalSelectedDeptUuid = null;
let modalSelectedLecturerUuid = null;

function populateModalDeptDropdown(search) {
    const dropdown = document.getElementById('practice-modal-dept-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    const filtered = loadedDepartments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    if (filtered.length > 0) {
        filtered.forEach(dept => {
            const item = document.createElement('div');
            item.className = 'dropdown-item py-2 px-3';
            item.textContent = dept.name;
            item.addEventListener('click', () => {
                document.getElementById('practice-modal-dept-search').value = dept.name;
                modalSelectedDeptUuid = dept.uuid;
                dropdown.style.display = 'none';
                // Показываем блок преподавателя
                document.getElementById('practice-modal-lecturer-search').disabled = false;
                document.getElementById('practice-modal-lecturer-block').style.display = 'block';
                document.getElementById('practice-modal-lecturer-search').value = '';
                modalSelectedLecturerUuid = null;
                document.getElementById('practice-modal-selected-lecturer').innerHTML = '';
                populateModalLectDropdown('');
            });
            const hr = document.createElement('hr');
            hr.className = 'm-0 p-0';
            dropdown.appendChild(item);
            dropdown.appendChild(hr);
        });
    } else {
        const empty = document.createElement('div');
        empty.className = 'dropdown-item text-muted py-2 px-3';
        empty.textContent = 'Кафедры не найдены';
        dropdown.appendChild(empty);
    }
    dropdown.style.display = 'block';
}

function filterModalDepts(query) {
    populateModalDeptDropdown(query);
}

// ----------------------------------------------------------------
//  Выпадающий список преподавателей в модалке
// ----------------------------------------------------------------

function populateModalLectDropdown(search) {
    const dropdown = document.getElementById('practice-modal-lecturer-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    const deptLecturers = loadedLecturers.filter(l =>
        l.department && l.department.uuid === modalSelectedDeptUuid
    );

    const filtered = deptLecturers.filter(l => {
        const fio = (l.lastName + ' ' + l.firstName + ' ' + l.patronymic).toLowerCase();
        return fio.includes(search.toLowerCase()) && l.uuid !== modalSelectedLecturerUuid;
    });

    if (filtered.length > 0) {
        filtered.forEach(lect => {
            const item = document.createElement('div');
            item.className = 'dropdown-item py-2 px-3';
            item.textContent = lect.lastName + ' ' + lect.firstName + ' ' + lect.patronymic;
            item.addEventListener('click', () => {
                modalSelectedLecturerUuid = lect.uuid;
                document.getElementById('practice-modal-lecturer-search').value = '';
                dropdown.style.display = 'none';
                const shortName = getLecturerFio(lect.uuid);
                document.getElementById('practice-modal-selected-lecturer').innerHTML =
                    '<span class="badge bg-primary fs-6">Преподаватель: ' + shortName +
                    ' <button type="button" class="btn-close btn-close-white ms-1" style="font-size:0.6rem;" id="practice-modal-remove-lecturer"></button></span>';
                document.getElementById('practice-modal-remove-lecturer').addEventListener('click', () => {
                    modalSelectedLecturerUuid = null;
                    document.getElementById('practice-modal-selected-lecturer').innerHTML = '';
                    document.getElementById('practice-modal-lecturer-search').value = '';
                });
            });
            const hr = document.createElement('hr');
            hr.className = 'm-0 p-0';
            dropdown.appendChild(item);
            dropdown.appendChild(hr);
        });
    } else {
        const empty = document.createElement('div');
        empty.className = 'dropdown-item text-muted py-2 px-3';
        empty.textContent = deptLecturers.length === 0 ? 'Нет преподавателей на этой кафедре' : 'Преподаватели не найдены';
        dropdown.appendChild(empty);
    }
    dropdown.style.display = 'block';
}

function filterModalLecturers(query) {
    populateModalLectDropdown(query);
}

// ----------------------------------------------------------------
//  Фоновая загрузка кафедр и преподавателей
// ----------------------------------------------------------------

function loadDeptsAndLecturers() {
    if (window.loadedDepartments && window.loadedDepartments.length) {
        loadedDepartments = window.loadedDepartments;
    } else {
        fetchDepartments('').then(list => {
            loadedDepartments = list || [];
            loadedDepartments.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            window.loadedDepartments = loadedDepartments;
        }).catch(e => { console.error('Depts load error', e); });
    }
    if (window.loadedLecturers && window.loadedLecturers.length) {
        loadedLecturers = window.loadedLecturers;
    } else {
        fetchLecturers('').then(list => {
            loadedLecturers = list || [];
            window.loadedLecturers = loadedLecturers;
        }).catch(e => { console.error('Lecturers load error', e); });
    }
}

// ----------------------------------------------------------------
//  Вспомогательная: ФИО преподавателя по uuid
// ----------------------------------------------------------------

function getLecturerFio(uuid) {
    if (!uuid) return null;
    const l = loadedLecturers.find(lec => lec.uuid === uuid);
    if (!l) return null;
    return l.lastName + ' ' + l.firstName[0] + '.' + l.patronymic[0] + '.';
}

// ----------------------------------------------------------------
//  Клик по ячейке → модалка практики
// ----------------------------------------------------------------

function setupGridClickDelegation(container) {
    const body = document.getElementById('practice-grid-body');
    if (!body) return;

    body.addEventListener('click', (e) => {
        const cell = e.target.closest('.practice-cell');
        if (!cell) return;
        const dateIso = cell.dataset.date;
        const groupUuid = cell.dataset.groupUuid;
        // Ищем существующую практику для этой ячейки
        const existing = allPractices.find(p => p.groupUuid === groupUuid && p.startDate <= dateIso && p.endDate >= dateIso);
        openPracticeModal(dateIso, groupUuid, existing || null);
    });
}

function openPracticeModal(dateIso, groupUuid, existingPractice) {
    const modalEl = document.getElementById('practice-modal');
    if (!modalEl) return;

    editingPracticeUuid = existingPractice ? existingPractice.uuid : null;

    // Дата начала — из ячейки/практики, дата окончания — туда же
    document.getElementById('practice-modal-start').value = existingPractice ? existingPractice.startDate : (dateIso || '');
    document.getElementById('practice-modal-end').value = existingPractice ? existingPractice.endDate : (dateIso || '');

    // Поля практики
    document.getElementById('practice-modal-name').value = existingPractice ? (existingPractice.title || '') : '';
    document.getElementById('practice-modal-type').value = existingPractice ? (existingPractice.practiceType || '') : '';
    document.getElementById('practice-modal-block-pairs').checked = existingPractice ? existingPractice.prohibitPairs : false;
    const errEl = document.getElementById('practice-modal-error');
    if (errEl) errEl.style.display = 'none';

    // Сброс кафедры и преподавателя
    document.getElementById('practice-modal-dept-search').value = '';
    const deptDropdown = document.getElementById('practice-modal-dept-dropdown');
    if (deptDropdown) deptDropdown.style.display = 'none';
    document.getElementById('practice-modal-lecturer-search').value = '';
    document.getElementById('practice-modal-lecturer-search').disabled = true;
    const lectDropdown = document.getElementById('practice-modal-lecturer-dropdown');
    if (lectDropdown) lectDropdown.style.display = 'none';
    document.getElementById('practice-modal-selected-lecturer').innerHTML = '';
    const lectBlock = document.getElementById('practice-modal-lecturer-block');
    if (lectBlock) lectBlock.style.display = 'none';
    modalSelectedDeptUuid = null;
    modalSelectedLecturerUuid = null;

    // Если редактируем и есть lecturerUuid — восстанавливаем кафедру и преподавателя
    if (existingPractice && existingPractice.lecturerUuid && loadedLecturers.length > 0 && loadedDepartments.length > 0) {
        const lecturer = loadedLecturers.find(l => l.uuid === existingPractice.lecturerUuid);
        if (lecturer && lecturer.department) {
            const dept = loadedDepartments.find(d => d.uuid === lecturer.department.uuid);
            if (dept) {
                document.getElementById('practice-modal-dept-search').value = dept.name;
                modalSelectedDeptUuid = dept.uuid;
            }
            document.getElementById('practice-modal-lecturer-search').disabled = false;
            if (lectBlock) lectBlock.style.display = 'block';
            modalSelectedLecturerUuid = lecturer.uuid;
            const shortName = getLecturerFio(lecturer.uuid);
            document.getElementById('practice-modal-selected-lecturer').innerHTML =
                '<span class="badge bg-primary fs-6">Преподаватель: ' + shortName +
                ' <button type="button" class="btn-close btn-close-white ms-1" style="font-size:0.6rem;" id="practice-modal-remove-lecturer"></button></span>';
            document.getElementById('practice-modal-remove-lecturer').addEventListener('click', () => {
                modalSelectedLecturerUuid = null;
                document.getElementById('practice-modal-selected-lecturer').innerHTML = '';
                document.getElementById('practice-modal-lecturer-search').value = '';
            });
        }
    }

    // Отрисовываем чекбоксы групп в модалке
    renderModalGroups(groupUuid, existingPractice);

    // Открываем
    const modal = new bootstrap.Modal(modalEl, { focus: false });
    modal.show();
}

function renderModalGroups(preCheckedUuid, existingPractice) {
    const container = document.getElementById('practice-modal-groups');
    if (!container) return;

    if (selectedGroups.length === 0) {
        container.innerHTML = '<span class="text-muted small">Нет выбранных групп</span>';
        return;
    }

    // При редактировании — только группа практики
    const editableGroupUuid = existingPractice ? existingPractice.groupUuid : null;

    container.innerHTML = selectedGroups.map(g => {
        let checked = g.uuid === preCheckedUuid ? ' checked' : '';
        let disabled = '';
        if (editableGroupUuid) {
            checked = g.uuid === editableGroupUuid ? ' checked' : '';
            disabled = g.uuid !== editableGroupUuid ? ' disabled' : '';
        }
        return `
          <div class="form-check">
            <input class="form-check-input practice-modal-group-check" type="checkbox"
                   value="${g.uuid}" id="pmg-${g.uuid}"${checked}${disabled} />
            <label class="form-check-label" for="pmg-${g.uuid}">
              <span class="fw-medium">${g.groupName}</span>
              <span class="text-muted ms-2 small">
                ${g.course} курс, ${formatEducationForm(g.educationForm)}
              </span>
            </label>
          </div>`;
    }).join('');
}

// ----------------------------------------------------------------
//  Сохранение практики
// ----------------------------------------------------------------

async function onSavePractice() {
    const name = document.getElementById('practice-modal-name')?.value?.trim();
    const type = document.getElementById('practice-modal-type')?.value;
    const startVal = document.getElementById('practice-modal-start')?.value;
    const endVal = document.getElementById('practice-modal-end')?.value;
    const prohibitPairs = document.getElementById('practice-modal-block-pairs')?.checked || false;
    const errEl = document.getElementById('practice-modal-error');
    const saveBtn = document.getElementById('practice-modal-save');

    // Валидация на фронте
    if (!type) {
        showError('Выберите тип практики');
        return;
    }
    if (!startVal || !endVal) {
        showError('Укажите даты начала и окончания');
        return;
    }
    if (endVal < startVal) {
        showError('Дата окончания не может быть раньше даты начала');
        return;
    }
    if (!modalSelectedLecturerUuid) {
        showError('Выберите преподавателя');
        return;
    }

    // Собираем выбранные группы в модалке
    const checks = document.querySelectorAll('#practice-modal-groups .practice-modal-group-check:checked');
    const groupUuids = Array.from(checks).map(cb => cb.value);
    if (groupUuids.length === 0) {
        showError('Выберите хотя бы одну группу');
        return;
    }

    // Показываем спиннер
    if (saveBtn) {
        saveBtn.disabled = true;
        const spinner = saveBtn.querySelector('.spinner-border');
        if (spinner) spinner.style.display = 'inline-block';
    }
    clearError();

    // Если редактируем — удаляем старую практику
    if (editingPracticeUuid) {
        try {
            await deletePractice(editingPracticeUuid);
        } catch (e) {
            if (saveBtn) {
                saveBtn.disabled = false;
                const spinner = saveBtn.querySelector('.spinner-border');
                if (spinner) spinner.style.display = 'none';
            }
            showError('Не удалось обновить практику: ' + (e.message || 'Ошибка'));
            return;
        }
    }

    // Создаём практику для каждой выбранной группы
    let errors = [];
    let created = 0;
    for (const groupUuid of groupUuids) {
        try {
            await savePractice({
                groupUuid: groupUuid,
                title: name,
                practiceType: type,
                startDate: startVal,
                endDate: endVal,
                prohibitPairs: prohibitPairs,
                lecturerUuid: modalSelectedLecturerUuid
            });
            created++;
        } catch (e) {
            errors.push(e.message || 'Ошибка сохранения');
        }
    }

    // Восстанавливаем кнопку
    if (saveBtn) {
        saveBtn.disabled = false;
        const spinner = saveBtn.querySelector('.spinner-border');
        if (spinner) spinner.style.display = 'none';
    }

    if (errors.length > 0) {
        showError(errors.join('; '));
        if (created === 0) return;
    }

    // Закрываем модалку и обновляем сетку
    const modalEl = document.getElementById('practice-modal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    editingPracticeUuid = null;
    await loadPractices();

    const msg = created > 0
        ? `Создано практик: ${created}` + (errors.length > 0 ? `. Ошибки: ${errors.join('; ')}` : '')
        : errors.join('; ');
    showToast(msg, errors.length > 0 ? 'warning' : 'success');
}

function showError(msg) {
    const errEl = document.getElementById('practice-modal-error');
    if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }
}

function clearError() {
    const errEl = document.getElementById('practice-modal-error');
    if (errEl) errEl.style.display = 'none';
}

// ----------------------------------------------------------------
//  Статистика практик по группам
// ----------------------------------------------------------------

let statsPractices = []; // практики в выбранном диапазоне дат
let statsLoading = false;
let statsLoaded = false;

async function loadStats() {
    if (statsLoading) return;
    const fromVal = document.getElementById('stats-from')?.value;
    const toVal = document.getElementById('stats-to')?.value;
    if (!fromVal || !toVal) return;

    statsLoading = true;
    try {
        statsPractices = await fetchPractices(fromVal, toVal, null);
    } catch (e) {
        console.error('Stats load error', e);
        statsPractices = [];
    } finally {
        statsLoading = false;
        statsLoaded = true;
    }
    renderStatsList();
}

function renderStatsList() {
    const container = document.getElementById('stats-group-list');
    if (!container) return;

    const fromVal = document.getElementById('stats-from')?.value;
    const toVal = document.getElementById('stats-to')?.value;
    const toggleVal = document.querySelector('input[name="stats-filter"]:checked')?.value || 'all';
    const query = (document.getElementById('stats-group-search')?.value || '').toLowerCase();

    if (!fromVal || !toVal) {
        container.innerHTML = '<div class="text-muted small p-3 text-center">Укажите диапазон дат и нажмите ↻</div>';
        return;
    }

    // Загружаем при первом открытии
    if (!statsLoaded) {
        loadStats();
        return;
    }

    // Индекс: groupUuid → [practices]
    const byGroup = {};
    for (const p of statsPractices) {
        if (!byGroup[p.groupUuid]) byGroup[p.groupUuid] = [];
        byGroup[p.groupUuid].push(p);
    }

    const groups = sortGroups(allGroups);
    let lastCourse = null;
    let lastForm = null;
    let html = '';
    let hasVisible = false;

    for (const g of groups) {
        const groupPractices = byGroup[g.uuid] || [];
        const count = groupPractices.length;

        // Фильтр по тогглу
        if (toggleVal === 'with' && count === 0) continue;
        if (toggleVal === 'without' && count > 0) continue;

        // Фильтр по поиску
        if (query && !g.groupName.toLowerCase().includes(query)) continue;

        hasVisible = true;

        // Заголовки курса и формы
        if (g.course !== lastCourse) {
            html += `<div class="stats-course-header">${g.course} курс</div>`;
            lastCourse = g.course;
            lastForm = null;
        }
        if (g.educationForm !== lastForm) {
            html += `<div class="stats-form-header">${FORM_LABELS[g.educationForm] || g.educationForm}</div>`;
            lastForm = g.educationForm;
        }

        const colors = { bg: '#f8fafc', border: '#e2e8f0' };
        const badgeColor = count > 0 ? 'bg-primary' : 'bg-secondary';
        const lockCount = groupPractices.filter(p => p.prohibitPairs).length;

        // Доп. инфо: виды спорта → специализация → направление
        let extraInfo = '';
        if (g.kindsOfSports && g.kindsOfSports.length > 0) {
            extraInfo = ` (${g.kindsOfSports.join(', ')})`;
        } else if (g.specialization) {
            extraInfo = ` (${g.specialization})`;
        } else if (g.direction) {
            extraInfo = ` (${g.direction})`;
        }

        html += `
          <div class="stats-group-card mb-1" data-group-uuid="${g.uuid}">
            <div class="stats-group-header d-flex align-items-center px-3 py-2"
                 style="background:${colors.bg}; border:1px solid ${colors.border}; border-radius:8px; cursor:pointer;">
              <i class="bi bi-chevron-right stats-chevron me-2" style="transition: transform 0.2s; font-size:0.75rem;"></i>
              <span class="fw-medium flex-grow-1">${g.groupName}<span class="text-muted">${extraInfo}</span></span>
              <span class="text-muted small me-2">${g.faculty || ''}</span>
              <span class="badge ${badgeColor} rounded-pill me-1" title="Практик в периоде">${count}</span>
              ${lockCount > 0 ? `<span class="badge bg-warning text-dark rounded-pill" title="Блокируют пары: ${lockCount}"><i class="bi bi-lock-fill" style="font-size:0.6rem;"></i> ${lockCount}</span>` : ''}
            </div>
            <div class="stats-group-body" style="display:none; border:1px solid ${colors.border}; border-top:none; border-radius:0 0 8px 8px; background:#fff;">
              ${groupPractices.length === 0 ? `
                <div class="text-muted small px-3 py-2">Нет практик в выбранном периоде</div>
              ` : groupPractices.map(p => {
                  const pc = PRACTICE_COLORS[p.practiceType] || { bg: '#e5e7eb', border: '#9ca3af', text: '#374151' };
                  const isPast = new Date(p.startDate) <= new Date(); // уже началась — удалить нельзя
                  return `
                    <div class="stats-practice-row d-flex align-items-center px-3 py-2 gap-2"
                         style="border-bottom:1px solid #f1f5f9;">
                      <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${pc.bg};border:1px solid ${pc.border};flex-shrink:0;"></span>
                      <span class="small fw-medium" style="color:${pc.text};min-width:100px;">
                        ${p.title || pc.label || p.practiceType}
                      </span>
                      <span class="text-muted small">${formatDateDDMM(new Date(p.startDate))} – ${formatDateDDMM(new Date(p.endDate))}</span>
                      ${p.lecturerUuid ? `<span class="text-muted small" style="min-width:140px;">Преподаватель: ${getLecturerFio(p.lecturerUuid) || 'не найден'}</span>` : ''}
                      ${p.prohibitPairs ? `
                        <span style="cursor:help;"
                              data-bs-toggle="tooltip" data-bs-placement="top"
                              title="Практика блокирует добавление пар">
                          <i class="bi bi-lock-fill" style="color:#f59e0b;font-size:0.75rem;"></i>
                        </span>` : ''}
                      <button type="button" class="btn btn-sm btn-outline-danger ms-auto stats-delete-btn"
                              data-practice-uuid="${p.uuid}"
                              ${isPast ? 'disabled title="Нельзя удалить уже начавшуюся практику"' : ''}
                              style="padding: 0 6px; font-size: 0.9rem; border: none;">
                        <i class="bi bi-trash3"></i>
                      </button>
                    </div>`;
              }).join('')}
            </div>
          </div>`;
    }

    if (!hasVisible) {
        html = '<div class="text-muted small p-3 text-center">Нет групп, соответствующих фильтрам</div>';
    }

    container.innerHTML = html;

    // Клик по заголовку — раскрытие/сворачивание
    container.querySelectorAll('.stats-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.stats-group-card');
            const body = card.querySelector('.stats-group-body');
            const chevron = card.querySelector('.stats-chevron');
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
        });
    });

    // Тулипы для замков
    container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        try { new bootstrap.Tooltip(el, { delay: { show: 200, hide: 0 } }); } catch (_) { /* */ }
    });

    // Клик по кнопке удаления
    container.querySelectorAll('.stats-delete-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const uuid = btn.dataset.practiceUuid;
            if (!confirm('Удалить практику?')) return;
            try {
                await deletePractice(uuid);
                showToast('Практика удалена', 'success');
                // Обновляем данные сетки и статистики
                if (selectedGroups.length > 0) await loadPractices();
                await loadStats();
            } catch (err) {
                showToast(err.message || 'Ошибка удаления', 'danger');
            }
        });
    });
}

function makeAcademicYear() {
    const now = new Date();
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return {
        startDate: new Date(startYear, 8, 1),
        endDate: new Date(startYear + 1, 7, 31)
    };
}

// ----------------------------------------------------------------
//  Стили (внедряются один раз при инициализации)
// ----------------------------------------------------------------

const PRACTICE_STYLES = `
<style id="practice-styles">
  .practice-group-course-header {
    font-weight: 700;
    font-size: 0.85rem;
    padding: 6px 8px 2px;
    color: #1e40af;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 2px;
  }
  .practice-group-form-header {
    font-weight: 600;
    font-size: 0.8rem;
    padding: 4px 8px 1px;
    color: #6b7280;
  }
  .practice-cell {
    cursor: pointer;
    transition: background 0.15s;
    padding: 2px 4px !important;
    min-width: 100px;
    vertical-align: middle;
    position: relative;
  }
  .practice-cell:hover {
    filter: brightness(0.92);
  }
  .stats-course-header {
    font-weight: 700;
    font-size: 0.8rem;
    padding: 8px 10px 4px;
    color: #1e40af;
    border-bottom: 1px solid #bfdbfe;
    margin-top: 6px;
  }
  .stats-form-header {
    font-weight: 600;
    font-size: 0.75rem;
    padding: 4px 10px 2px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .stats-group-header:hover {
    background: #f1f5f9 !important;
  }
  .stats-practice-row:last-child {
    border-bottom: none !important;
  }
</style>`;

// Внедряем стили при загрузке модуля
if (!document.getElementById('practice-styles')) {
    document.head.insertAdjacentHTML('beforeend', PRACTICE_STYLES);
}
