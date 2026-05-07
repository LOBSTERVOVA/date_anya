// ==================== PRACTICE MODULE ====================
// Вкладка «Практика»: выбор групп + пустая сетка дней учебного года + модалка практики
// Лениво загружается schedule-tabs.js при первом переключении

import { fetchGroups } from './api.js';
import { formatDateDDMM, formatEducationForm, dateToIso } from './utils.js';

let allGroups = [];
let selectedGroups = []; // сохраняет порядок выбора чекбоксов
let academicDates = null; // { startDate, endDate } — кэш учебного года

const FORM_ORDER = { 'FULL_TIME': 0, 'PART_TIME': 1, 'MIXED': 2 };
const FORM_LABELS = { 'FULL_TIME': 'Очная', 'PART_TIME': 'Заочная', 'MIXED': 'Очно-заочная' };

export async function init(container) {
    try {
        allGroups = await fetchGroups('');
    } catch (e) {
        console.error('Failed to load groups for practice', e);
        container.innerHTML = '<div class="alert alert-danger m-4">Ошибка загрузки групп</div>';
        return;
    }

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
            <i class="bi bi-briefcase me-2"></i>Выбор групп для практики
          </h5>

          <div class="position-relative mb-3">
            <input id="practice-groups-search" type="text" class="form-control"
                   placeholder="Найти группы…" autocomplete="off" />
          </div>

          <div id="practice-groups-list" class="border rounded p-2 mb-3"
               style="max-height: 320px; overflow-y: auto;"></div>

          <div id="practice-selected-chips" class="d-flex flex-wrap gap-2 mb-3"></div>

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
                <label class="form-label" for="practice-modal-name">Название практики</label>
                <input type="text" class="form-control" id="practice-modal-name"
                       placeholder="Например: Производственная практика" />
              </div>
              <div class="mb-3">
                <label class="form-label">Группы</label>
                <div id="practice-modal-groups" class="border rounded p-2"
                     style="max-height:200px; overflow-y:auto;"></div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="practice-modal-type">Тип практики</label>
                <select class="form-select" id="practice-modal-type">
                  <option value="">—</option>
                  <option value="EDUCATIONAL">Учебная</option>
                  <option value="PRODUCTION">Производственная</option>
                  <option value="PRE_GRADUATION">Преддипломная</option>
                  <option value="RESEARCH">Научно-исследовательская</option>
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
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
              <button type="button" class="btn btn-primary" id="practice-modal-save">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#practice-groups-search').addEventListener('input', () => renderGroupList());
    container.querySelector('#practice-modal-save').addEventListener('click', () => {
        // Пока только визуал — просто закрываем
        const modal = bootstrap.Modal.getInstance(document.getElementById('practice-modal'));
        if (modal) modal.hide();
    });

    renderGroupList();
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
        return a.groupName.localeCompare(b.groupName);
    });
}

function getFilteredGroups() {
    const q = (document.getElementById('practice-groups-search')?.value || '').toLowerCase();
    const pool = q ? allGroups.filter(g => g.groupName.toLowerCase().includes(q)) : allGroups;
    return sortGroups(pool);
}

function renderGroupList() {
    const list = document.getElementById('practice-groups-list');
    if (!list) return;

    const filtered = getFilteredGroups();
    let html = '';
    let lastCourse = null;
    let lastForm = null;

    for (const g of filtered) {
        if (g.course !== lastCourse) {
            html += `<div class="practice-group-course-header">${g.course} курс</div>`;
            lastCourse = g.course;
            lastForm = null;
        }
        if (g.educationForm !== lastForm) {
            html += `<div class="practice-group-form-header">${FORM_LABELS[g.educationForm] || g.educationForm}</div>`;
            lastForm = g.educationForm;
        }

        const checked = selectedGroups.some(sg => sg.uuid === g.uuid);
        html += `
          <div class="form-check ms-3">
            <input class="form-check-input practice-group-check" type="checkbox"
                   value="${g.uuid}" id="pg-${g.uuid}" ${checked ? 'checked' : ''} />
            <label class="form-check-label" for="pg-${g.uuid}">
              <span class="fw-medium">${g.groupName}</span>
              <span class="text-muted ms-2 small">${g.faculty || ''}</span>
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
//  Клик по ячейке → модалка практики
// ----------------------------------------------------------------

function setupGridClickDelegation(container) {
    const body = document.getElementById('practice-grid-body');
    if (!body) return;

    body.addEventListener('click', (e) => {
        const cell = e.target.closest('.practice-cell');
        if (!cell) return;
        openPracticeModal(cell.dataset.date, cell.dataset.groupUuid);
    });
}

function openPracticeModal(dateIso, groupUuid) {
    const modalEl = document.getElementById('practice-modal');
    if (!modalEl) return;

    // Дата начала — из ячейки, дата окончания — туда же
    document.getElementById('practice-modal-start').value = dateIso || '';
    document.getElementById('practice-modal-end').value = dateIso || '';

    // Сбрасываем остальные поля
    document.getElementById('practice-modal-name').value = '';
    document.getElementById('practice-modal-type').value = '';
    document.getElementById('practice-modal-block-pairs').checked = false;

    // Отрисовываем чекбоксы групп в модалке
    renderModalGroups(groupUuid);

    // Открываем
    const modal = new bootstrap.Modal(modalEl, { focus: false });
    modal.show();
}

function renderModalGroups(preCheckedUuid) {
    const container = document.getElementById('practice-modal-groups');
    if (!container) return;

    // Показываем все выбранные группы
    if (selectedGroups.length === 0) {
        container.innerHTML = '<span class="text-muted small">Нет выбранных групп</span>';
        return;
    }

    container.innerHTML = selectedGroups.map(g => {
        const checked = g.uuid === preCheckedUuid ? ' checked' : '';
        return `
          <div class="form-check">
            <input class="form-check-input practice-modal-group-check" type="checkbox"
                   value="${g.uuid}" id="pmg-${g.uuid}"${checked} />
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
//  Учебный год
// ----------------------------------------------------------------

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
  }
  .practice-cell:hover {
    background: #eff6ff !important;
  }
</style>`;

// Внедряем стили при загрузке модуля
if (!document.getElementById('practice-styles')) {
    document.head.insertAdjacentHTML('beforeend', PRACTICE_STYLES);
}
