import { fetchRooms } from './api.js';
import { showToast } from './utils.js';
import { buildCsrfHeaders } from './api.js';

let allRooms = [];

export async function init(container) {
    container.innerHTML = ROOMS_TAB_HTML;
    await loadData();
    renderStats();
    renderRoomList();
    bindEvents();
}

async function loadData() {
    allRooms = await fetchRooms('');
    allRooms.sort((a, b) => {
        const na = parseInt(a.title || a.name || '0');
        const nb = parseInt(b.title || b.name || '0');
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        if (!isNaN(na)) return -1;
        if (!isNaN(nb)) return 1;
        return (a.title || a.name || '').localeCompare(b.title || b.name || '');
    });
}

function renderStats() {
    const container = document.getElementById('rooms-stats');
    if (!container) return;
    container.innerHTML = `<span class="badge bg-primary">Всего: ${allRooms.length}</span>`;
}

function renderRoomList(filter = '') {
    const list = document.getElementById('rooms-list');
    if (!list) return;

    const q = filter.toLowerCase();
    const filtered = q
        ? allRooms.filter(r => (r.title || r.name || '').toLowerCase().includes(q))
        : allRooms;

    if (!filtered.length) {
        list.innerHTML = '<div class="text-muted p-3">Аудитории не найдены</div>';
        return;
    }

    let html = '<div class="row g-2">';
    filtered.forEach(r => {
        html += `
          <div class="col-6 col-md-4 col-lg-3 col-xl-2">
            <div class="border rounded p-2 text-center bg-light h-100">
              <div class="fw-bold fs-5">${r.title || r.name || '—'}</div>
            </div>
          </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
}

function bindEvents() {
    // Поиск
    const searchInput = document.getElementById('rooms-tab-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderRoomList(searchInput.value));
    }

    // Кнопка «Добавить аудиторию»
    const addBtn = document.getElementById('rooms-add-btn');
    const cancelBtn = document.getElementById('rooms-form-cancel');
    const formWrap = document.getElementById('rooms-form-wrap');

    if (addBtn && formWrap) {
        addBtn.addEventListener('click', () => {
            formWrap.style.display = 'block';
            addBtn.style.display = 'none';
        });
    }
    if (cancelBtn && formWrap && addBtn) {
        cancelBtn.addEventListener('click', () => {
            formWrap.style.display = 'none';
            addBtn.style.display = '';
            document.getElementById('rooms-create-form').reset();
        });
    }

    // Отправка формы
    const form = document.getElementById('rooms-create-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createRoom();
        });
    }
}

async function createRoom() {
    const titleEl = document.getElementById('room-title');
    const title = titleEl?.value?.trim();
    if (!title) { showToast('Введите название аудитории', 'warning'); return; }

    try {
        const headers = buildCsrfHeaders();
        const response = await fetch('/api/room', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Ошибка создания аудитории');
        }
        const created = await response.json();
        showToast(`Аудитория «${created.title}» создана`, 'success', 'Успех');

        document.getElementById('rooms-create-form').reset();
        document.getElementById('rooms-form-wrap').style.display = 'none';
        document.getElementById('rooms-add-btn').style.display = '';

        await loadData();
        renderStats();
        renderRoomList();
    } catch (e) {
        console.error('Failed to create room', e);
        showToast(e.message || 'Не удалось создать аудиторию', 'danger', 'Ошибка');
    }
}

const ROOMS_TAB_HTML = `
<div class="p-3">
  <div class="d-flex justify-content-between align-items-start mb-3">
    <div>
      <h5 class="mb-1"><i class="bi bi-door-open-fill me-2"></i>Аудитории</h5>
      <div id="rooms-stats"></div>
    </div>
    <button id="rooms-add-btn" class="btn btn-primary btn-sm">
      <i class="bi bi-plus-circle me-1"></i>Добавить аудиторию
    </button>
  </div>

  <!-- Форма создания аудитории -->
  <div id="rooms-form-wrap" class="card mb-3" style="display:none;">
    <div class="card-body">
      <h6 class="card-title">Новая аудитория</h6>
      <form id="rooms-create-form">
        <div class="mb-3">
          <label class="form-label" for="room-title">Название <span class="text-danger">*</span></label>
          <input type="text" class="form-control" id="room-title" required
                 placeholder="Например: 305" />
        </div>
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary">Создать</button>
          <button type="button" class="btn btn-secondary" id="rooms-form-cancel">Отмена</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Поиск -->
  <div class="mb-3">
    <input type="text" class="form-control" id="rooms-tab-search"
           placeholder="Поиск аудиторий..." autocomplete="off" />
  </div>

  <!-- Список аудиторий -->
  <div id="rooms-list" class="border rounded p-3" style="max-height:60vh;overflow-y:auto;"></div>
</div>
`;
