import { fetchGroups } from './api.js';
import { formatEducationForm, showToast } from './utils.js';
import { buildCsrfHeaders } from './api.js';

const FORM_ORDER = { 'FULL_TIME': 0, 'PART_TIME': 1, 'MIXED': 2 };
const FORM_LABELS = { 'FULL_TIME': 'Очная', 'PART_TIME': 'Заочная', 'MIXED': 'Смешанная' };
const COURSE_LABELS = { 1: '1 курс', 2: '2 курс', 3: '3 курс', 4: '4 курс', 5: '5 курс', 6: '6 курс' };

let allGroups = [];
let faculties = [];

export async function init(container) {
    container.innerHTML = GROUPS_HTML;
    await loadData();
    renderStats();
    renderGroupList();
    bindEvents();
}

async function loadData() {
    allGroups = await fetchGroups('');
    allGroups.sort((a, b) => {
        if (a.course !== b.course) return a.course - b.course;
        const fa = FORM_ORDER[a.educationForm] ?? 3;
        const fb = FORM_ORDER[b.educationForm] ?? 3;
        if (fa !== fb) return fa - fb;
        if ((a.faculty || '') !== (b.faculty || '')) return (a.faculty || '').localeCompare(b.faculty || '');
        return a.groupName.localeCompare(b.groupName);
    });

    // Загружаем список факультетов (уникальные значения из групп)
    const facSet = new Set();
    allGroups.forEach(g => { if (g.faculty) facSet.add(g.faculty); });
    faculties = Array.from(facSet).sort();
}

function renderStats() {
    const container = document.getElementById('groups-stats');
    if (!container) return;

    const total = allGroups.length;
    const byCourse = {};
    allGroups.forEach(g => {
        byCourse[g.course] = (byCourse[g.course] || 0) + 1;
    });
    const byForm = {};
    allGroups.forEach(g => {
        const label = FORM_LABELS[g.educationForm] || g.educationForm || 'Не указана';
        byForm[label] = (byForm[label] || 0) + 1;
    });

    let html = `<div class="d-flex flex-wrap gap-2 mb-2">
        <span class="badge bg-primary">Всего: ${total}</span>`;

    Object.keys(byCourse).sort((a, b) => a - b).forEach(c => {
        html += `<span class="badge bg-secondary">${c} курс: ${byCourse[c]}</span>`;
    });

    Object.keys(byForm).forEach(f => {
        html += `<span class="badge bg-info">${f}: ${byForm[f]}</span>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function formatGroupInfo(g) {
    const parts = [g.groupName];
    if (g.specialization) parts.push(g.specialization);
    if (g.direction) parts.push(g.direction);
    if (g.kindsOfSports && g.kindsOfSports.length > 0) parts.push(g.kindsOfSports.join(', '));
    if (g.faculty) parts.push(g.faculty);
    return parts.join(' — ') + '.';
}

function renderGroupList(filter = '') {
    const list = document.getElementById('groups-list');
    if (!list) return;

    const q = filter.toLowerCase();
    const filtered = q
        ? allGroups.filter(g => {
            const haystack = [g.groupName, g.specialization, g.direction, g.faculty,
                (g.kindsOfSports || []).join(', ')].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(q);
        })
        : allGroups;

    let html = '';
    let lastCourse = null;
    let lastForm = null;
    let lastFaculty = null;

    for (const g of filtered) {
        if (g.course !== lastCourse) {
            html += `<div class="fw-bold fs-5 mt-3 mb-1 text-primary">${COURSE_LABELS[g.course] || g.course + ' курс'}</div>`;
            lastCourse = g.course;
            lastForm = null;
            lastFaculty = null;
        }
        if (g.educationForm !== lastForm) {
            html += `<div class="fw-semibold text-secondary ms-2 mb-1">${FORM_LABELS[g.educationForm] || g.educationForm}</div>`;
            lastForm = g.educationForm;
            lastFaculty = null;
        }
        const fac = g.faculty || '';
        if (fac !== (lastFaculty || '')) {
            html += `<div class="text-muted small ms-3 mb-1">${fac || 'Без факультета'}</div>`;
            lastFaculty = fac;
        }

        const info = formatGroupInfo(g);
        html += `<div class="ms-4 mb-1 small">${info}</div>`;
    }

    if (!filtered.length) {
        html = '<div class="text-muted p-3">Группы не найдены</div>';
    }

    list.innerHTML = html;
}

function bindEvents() {
    // Поиск
    const searchInput = document.getElementById('groups-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderGroupList(searchInput.value));
    }

    // Кнопка «Добавить группу»
    const addBtn = document.getElementById('groups-add-btn');
    const cancelBtn = document.getElementById('groups-form-cancel');
    const formWrap = document.getElementById('groups-form-wrap');

    if (addBtn && formWrap) {
        addBtn.addEventListener('click', () => {
            formWrap.style.display = 'block';
            addBtn.style.display = 'none';
            loadFacultiesForForm();
        });
    }
    if (cancelBtn && formWrap && addBtn) {
        cancelBtn.addEventListener('click', () => {
            formWrap.style.display = 'none';
            addBtn.style.display = '';
            document.getElementById('groups-create-form').reset();
        });
    }

    // Отправка формы
    const form = document.getElementById('groups-create-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createGroup();
        });
    }
}

async function createGroup() {
    const nameEl = document.getElementById('group-name');
    const facultyEl = document.getElementById('group-faculty');
    const courseEl = document.getElementById('group-course');
    const formEl = document.getElementById('group-education-form');
    const directionEl = document.getElementById('group-direction');
    const specializationEl = document.getElementById('group-specialization');
    const sportsEl = document.getElementById('group-kinds-of-sports');

    const name = nameEl?.value?.trim();
    if (!name) { showToast('Введите название группы', 'warning'); return; }
    if (!courseEl?.value) { showToast('Выберите курс', 'warning'); return; }
    if (!facultyEl?.value?.trim()) { showToast('Введите факультет', 'warning'); return; }
    if (!directionEl?.value?.trim()) { showToast('Введите направление', 'warning'); return; }
    if (!formEl?.value) { showToast('Выберите форму обучения', 'warning'); return; }

    const body = {
        groupName: name,
        faculty: facultyEl?.value?.trim() || null,
        course: parseInt(courseEl.value),
        educationForm: formEl.value,
        direction: directionEl?.value?.trim() || null,
        specialization: specializationEl?.value?.trim() || null,
        kindsOfSports: sportsEl?.value?.trim()
            ? sportsEl.value.split(',').map(s => s.trim()).filter(Boolean)
            : []
    };

    try {
        const headers = buildCsrfHeaders();
        const response = await fetch('/api/group', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Ошибка создания группы');
        }
        const created = await response.json();
        showToast(`Группа «${created.groupName}» создана`, 'success', 'Успех');

        document.getElementById('groups-create-form').reset();
        document.getElementById('groups-form-wrap').style.display = 'none';
        document.getElementById('groups-add-btn').style.display = '';

        await loadData();
        renderStats();
        renderGroupList();
    } catch (e) {
        console.error('Failed to create group', e);
        showToast(e.message || 'Не удалось создать группу', 'danger', 'Ошибка');
    }
}

async function loadFacultiesForForm() {
    if (faculties.length > 0) {
        populateFacultyDatalist();
        return;
    }
    // Загружаем из сети
    try {
        const response = await fetch('/api/group/faculties');
        if (response.ok) {
            const list = await response.json();
            faculties = list.sort();
        }
    } catch (_) {
        // fallback: собираем из уже загруженных групп
        const set = new Set();
        allGroups.forEach(g => { if (g.faculty) set.add(g.faculty); });
        faculties = Array.from(set).sort();
    }
    populateFacultyDatalist();
}

function populateFacultyDatalist() {
    const datalist = document.getElementById('faculties-list');
    if (!datalist) return;
    datalist.innerHTML = faculties.map(f => `<option value="${f}">`).join('');
}

const GROUPS_HTML = `
<style>
  #groups-stats .badge { font-size: 0.8rem; }
</style>

<div class="p-3">
  <div class="d-flex justify-content-between align-items-start mb-3">
    <div>
      <h5 class="mb-1"><i class="bi bi-people-fill me-2"></i>Группы</h5>
      <div id="groups-stats"></div>
    </div>
    <button id="groups-add-btn" class="btn btn-primary btn-sm">
      <i class="bi bi-plus-circle me-1"></i>Добавить группу
    </button>
  </div>

  <!-- Форма создания группы -->
  <div id="groups-form-wrap" class="card mb-3" style="display:none;">
    <div class="card-body">
      <h6 class="card-title">Новая группа</h6>
      <form id="groups-create-form">
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label" for="group-name">Название группы <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="group-name" required
                   placeholder="Например: С1-01Б-25" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label" for="group-faculty">Факультет <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="group-faculty" list="faculties-list"
                   placeholder="Начните вводить или выберите" autocomplete="off" required />
            <datalist id="faculties-list"></datalist>
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label" for="group-course">Курс <span class="text-danger">*</span></label>
            <select class="form-select" id="group-course" required>
              <option value="">—</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
              <option value="4">4</option><option value="5">5</option><option value="6">6</option>
            </select>
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label" for="group-education-form">Форма обучения <span class="text-danger">*</span></label>
            <select class="form-select" id="group-education-form" required>
              <option value="">—</option>
              <option value="FULL_TIME">Очная</option>
              <option value="PART_TIME">Заочная</option>
              <option value="MIXED">Смешанная</option>
            </select>
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label" for="group-direction">Направление <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="group-direction" required />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label" for="group-specialization">Специализация</label>
            <input type="text" class="form-control" id="group-specialization" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label" for="group-kinds-of-sports">Виды спорта (через запятую)</label>
            <input type="text" class="form-control" id="group-kinds-of-sports"
                   placeholder="Гандбол, Регби, Бейсбол" />
          </div>
        </div>
        <div class="mt-3 d-flex gap-2">
          <button type="submit" class="btn btn-primary">Создать</button>
          <button type="button" class="btn btn-secondary" id="groups-form-cancel">Отмена</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Поиск -->
  <div class="mb-3">
    <input type="text" class="form-control" id="groups-search"
           placeholder="Поиск по названию, специализации, направлению, факультету, видам спорта..." autocomplete="off" />
  </div>

  <!-- Список групп -->
  <div id="groups-list" class="border rounded p-3" style="max-height:60vh;overflow-y:auto;"></div>
</div>
`;
