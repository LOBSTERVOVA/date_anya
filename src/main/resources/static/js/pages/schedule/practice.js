// ==================== PRACTICE MODULE ====================
// Вкладка «Практика»: выбор групп + пустая сетка дней учебного года
// Лениво загружается schedule-tabs.js при первом переключении

import { fetchGroups } from './api.js';
import { formatDateDDMM, formatEducationForm } from './utils.js';

let allGroups = [];
let selectedGroups = []; // сохраняет порядок выбора чекбоксов

export async function init(container) {
    try {
        allGroups = await fetchGroups('');
    } catch (e) {
        console.error('Failed to load groups for practice', e);
        container.innerHTML = '<div class="alert alert-danger m-4">Ошибка загрузки групп</div>';
        return;
    }

    renderUI(container);
}

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
               style="max-height: 280px; overflow-y: auto;"></div>

          <div id="practice-selected-chips" class="d-flex flex-wrap gap-2 mb-3"></div>

          <div id="practice-grid-wrap" style="display:none;">
            <div class="table-responsive" style="max-height: 72vh; overflow-y: auto;">
              <table class="table table-bordered align-middle mb-0"
                     id="practice-grid-table" style="table-layout:fixed; min-width:100%;">
                <thead class="table-light sticky-top" style="position:sticky; top:0; z-index:2;">
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
    `;

    renderGroupList();
    setupSearch(container);
}

function setupSearch(container) {
    container.querySelector('#practice-groups-search').addEventListener('input', () => {
        renderGroupList();
    });
}

function getFilteredGroups() {
    const q = (document.getElementById('practice-groups-search')?.value || '').toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter(g => g.groupName.toLowerCase().includes(q));
}

function renderGroupList() {
    const list = document.getElementById('practice-groups-list');
    if (!list) return;

    const filtered = getFilteredGroups();

    list.innerHTML = filtered.map(g => {
        const checked = selectedGroups.some(sg => sg.uuid === g.uuid);
        return `
          <div class="form-check">
            <input class="form-check-input practice-group-check" type="checkbox"
                   value="${g.uuid}" id="pg-${g.uuid}" ${checked ? 'checked' : ''} />
            <label class="form-check-label" for="pg-${g.uuid}">
              <span class="fw-medium">${g.groupName}</span>
              <span class="text-muted ms-2 small">
                ${g.course} курс, ${formatEducationForm(g.educationForm)}${g.faculty ? ', ' + g.faculty : ''}
              </span>
            </label>
          </div>`;
    }).join('');

    list.querySelectorAll('.practice-group-check').forEach(cb => {
        cb.addEventListener('change', () => onGroupToggle(cb));
    });
}

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
    renderGroupList(); // синхронизировать чекбоксы после любых изменений
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

    // Заголовки: фиксированные колонки + колонки групп
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

    // Инициализируем Bootstrap-тултипы для заголовков
    header.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        try {
            new bootstrap.Tooltip(el, { placement: 'bottom', delay: { show: 300, hide: 100 } });
        } catch (_) { /* bootstrap может быть недоступен */ }
    });

    // Тело: строки с 1 сентября по 31 августа
    const { startDate, endDate } = academicYear();
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    const fragment = document.createDocumentFragment();
    const cur = new Date(startDate);

    while (cur <= endDate) {
        const tr = document.createElement('tr');
        const dow = dayNames[cur.getDay()];
        const dateStr = formatDateDDMM(cur);
        const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;

        tr.innerHTML = `
          <td class="text-center fw-semibold small${isWeekend ? ' text-muted' : ''}">${dow}</td>
          <td class="text-center small${isWeekend ? ' text-muted' : ''}">${dateStr}</td>
          ${selectedGroups.map(() => `<td></td>`).join('')}
        `;
        fragment.appendChild(tr);
        cur.setDate(cur.getDate() + 1);
    }

    body.innerHTML = '';
    body.appendChild(fragment);

    // Скроллим к началу сентября (ближе к текущей дате если она в диапазоне)
    const today = new Date();
    if (today >= startDate && today <= endDate) {
        const dayIndex = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const row = body.children[dayIndex];
        if (row) {
            setTimeout(() => row.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
        }
    }
}

/**
 * Возвращает границы учебного года: 1 сентября → 31 августа следующего года.
 * Если сегодня январь–август — учебный год начался в прошлом календарном году.
 */
function academicYear() {
    const now = new Date();
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return {
        startDate: new Date(startYear, 8, 1),       // 1 сентября
        endDate: new Date(startYear + 1, 7, 31)     // 31 августа
    };
}
