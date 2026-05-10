/**
 * Клубы и кружки — страница редактирования кафедры
 */
const deptUuid = window.__deptUuid;
if (!deptUuid) throw new Error('deptUuid not set');

const DAY_LABELS = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' };
// CDN-префикс для MinIO (из Thymeleaf-переменной)

let allRooms = [];
let editingClubId = null;

init();

async function init() {
    await loadRooms();
    await loadClubs();

    document.getElementById('createClubBtn').addEventListener('click', () => openClubModal());
    document.getElementById('clubSaveBtn').addEventListener('click', saveClub);
    document.getElementById('clubScheduleAdd').addEventListener('click', addScheduleRow);
    document.getElementById('clubRemoveAvatarBtn').addEventListener('click', removeAvatar);

    // Drag & drop для аватарки
    const dropZone = document.getElementById('clubAvatarDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-primary'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-primary'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('border-primary');
            const file = e.dataTransfer.files[0];
            if (file) handleAvatarFile(file);
        });
        dropZone.addEventListener('click', () => document.getElementById('clubAvatarFileInput').click());
    }
    document.getElementById('clubAvatarFileInput').addEventListener('change', function () {
        if (this.files[0]) handleAvatarFile(this.files[0]);
    });

    const modal = document.getElementById('clubModal');
    modal.addEventListener('hidden.bs.modal', resetClubForm);
}

/* --- Данные --- */
async function loadRooms() {
    try {
        const resp = await fetch('/api/room');
        if (resp.ok) allRooms = await resp.json();
        allRooms.sort((a, b) => {
            const na = parseInt(a.title || '0'), nb = parseInt(b.title || '0');
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return (a.title || '').localeCompare(b.title || '');
        });
    } catch (e) { console.error('loadRooms', e); }
}

async function loadClubs() {
    const grid = document.getElementById('deptClubsGrid');
    const count = document.getElementById('deptClubsCount');
    grid.innerHTML = '<div class="col-12 text-center text-muted py-3"><div class="spinner-border spinner-border-sm me-2"></div>Загрузка...</div>';
    try {
        const resp = await fetch('/api/club/department/' + deptUuid);
        if (!resp.ok) throw new Error(resp.statusText);
        const clubs = await resp.json();
        count.textContent = clubs.length;
        renderClubs(clubs);
    } catch (e) {
        console.error('loadClubs', e);
        grid.innerHTML = '<div class="col-12 text-danger">Ошибка загрузки клубов</div>';
        count.textContent = '0';
    }
}

/* --- Рендер карточек --- */
function renderClubs(clubs) {
    const grid = document.getElementById('deptClubsGrid');
    if (!clubs.length) {
        grid.innerHTML = '<div class="col-12 text-muted small">Нет клубов и кружков</div>';
        return;
    }

    grid.innerHTML = clubs.map(c => {
        const roomLabels = (c.rooms || []).map(r => r.title || '?').join(', ') || '—';
        const schedHtml = (c.schedules || []).map(s =>
            `<div class="small"><span class="fw-medium">${DAY_LABELS[s.dayOfWeek] || s.dayOfWeek}:</span> ${s.startTime} – ${s.endTime}</div>`
        ).join('') || '<div class="small text-muted">Расписание не указано</div>';

        const avatarUrl = c.avatar ? (cdn + c.avatar) : null;
        console.log("CDN: " + cdn)
        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="" class="rounded-circle object-fit-cover" style="width:64px;height:64px;">`
            : `<div class="rounded-circle bg-light d-flex align-items-center justify-content-center fw-bold text-secondary border" style="width:64px;height:64px;font-size:1.4rem;">${(c.name || '?')[0].toUpperCase()}</div>`;

        const typeBadge = c.type === 'SPORTS_CLUB'
            ? '<span class="badge bg-success me-1">Спорт</span>'
            : '<span class="badge bg-info me-1">Наука</span>';

        return `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100 rounded-3">
            <div class="card-body">
              <div class="d-flex gap-3 mb-3">
                ${avatarHtml}
                <div class="flex-grow-1 min-w-0">
                  <div class="fw-semibold text-truncate">${c.name || 'Без названия'}</div>
                  <div class="mt-1">${typeBadge}</div>
                  <div class="small text-muted mt-2">${schedHtml}</div>
                </div>
              </div>
              ${c.description ? `<div class="small mt-2 text-muted" style="line-height:1.4;">${c.description.substring(0, 120)}${c.description.length > 120 ? '...' : ''}</div>` : ''}
              <div class="small mt-2"><span class="text-muted">Аудитории:</span> ${roomLabels}</div>
              <div class="d-flex gap-1 mt-2 justify-content-end">
                <button class="btn btn-sm btn-outline-secondary edit-club-btn" data-uuid="${c.uuid}" title="Редактировать">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-club-btn" data-uuid="${c.uuid}" title="Удалить">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.edit-club-btn').forEach(btn =>
        btn.addEventListener('click', () => openClubModal(btn.dataset.uuid)));
    grid.querySelectorAll('.delete-club-btn').forEach(btn =>
        btn.addEventListener('click', () => deleteClub(btn.dataset.uuid)));
}

/* --- Модалка --- */
async function openClubModal(uuid) {
    const roomsDiv = document.getElementById('clubRooms');
    roomsDiv.innerHTML = allRooms.map(r =>
        `<div class="form-check form-check-inline">
           <input class="form-check-input club-room-cb" type="checkbox" value="${r.uuid}" id="cr-${r.uuid}" />
           <label class="form-check-label small" for="cr-${r.uuid}">${r.title || '?'}</label>
         </div>`
    ).join('') || '<span class="text-muted small">Нет аудиторий</span>';

    resetClubForm();
    document.getElementById('clubScheduleRows').innerHTML = '';

    if (uuid) {
        editingClubId = uuid;
        document.getElementById('clubModalTitle').textContent = 'Редактировать клуб / кружок';
        document.getElementById('clubEditId').value = uuid;
        try {
            const resp = await fetch('/api/club/' + uuid);
            if (resp.ok) {
                const club = await resp.json();
                document.getElementById('clubName').value = club.name || '';
                document.getElementById('clubType').value = club.type || 'SCIENCE_CLUB';
                document.getElementById('clubDescription').value = club.description || '';

                document.querySelectorAll('.club-room-cb').forEach(cb => {
                    cb.checked = (club.roomUuids || []).includes(cb.value);
                });

                // Аватарка
                if (club.avatar) {
                    document.getElementById('clubAvatarPreviewImg').src = cdn + club.avatar;
                    document.getElementById('clubAvatarPreview').style.display = '';
                    document.getElementById('clubAvatarDropZone').style.display = 'none';
                    document.getElementById('clubAvatarUrl').value = club.avatar;
                } else {
                    document.getElementById('clubAvatarPreview').style.display = 'none';
                    document.getElementById('clubAvatarDropZone').style.display = '';
                    document.getElementById('clubAvatarUrl').value = '';
                }

                (club.schedules || []).forEach(addScheduleRow);
            }
        } catch (e) {
            console.error('Failed to load club', e);
            alert('Не удалось загрузить данные клуба');
        }
    } else {
        editingClubId = null;
        document.getElementById('clubModalTitle').textContent = 'Новый клуб / кружок';
        document.getElementById('clubEditId').value = '';
        document.getElementById('clubAvatarPreview').style.display = 'none';
        document.getElementById('clubAvatarDropZone').style.display = '';
        document.getElementById('clubAvatarUrl').value = '';
        addScheduleRow();
    }

    new bootstrap.Modal(document.getElementById('clubModal')).show();
}

function resetClubForm() {
    document.getElementById('clubName').value = '';
    document.getElementById('clubType').value = 'SCIENCE_CLUB';
    document.getElementById('clubDescription').value = '';
    document.getElementById('clubAvatarPreview').style.display = 'none';
    document.getElementById('clubAvatarDropZone').style.display = '';
    document.getElementById('clubAvatarUrl').value = '';
    document.getElementById('clubEditId').value = '';
    document.getElementById('clubScheduleRows').innerHTML = '';
    document.getElementById('clubAvatarFileInput').value = '';
    editingClubId = null;
}

/* --- Аватарка (drag & drop) --- */
async function handleAvatarFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Выберите изображение');
        return;
    }
    // Показываем preview локально
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('clubAvatarPreviewImg').src = e.target.result;
        document.getElementById('clubAvatarPreview').style.display = '';
        document.getElementById('clubAvatarDropZone').style.display = 'none';
    };
    reader.readAsDataURL(file);

    try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error((await resp.text()) || 'Ошибка загрузки');
        const data = await resp.json();
        document.getElementById('clubAvatarUrl').value = data.url;
    } catch (e) {
        console.error('upload avatar', e);
        alert('Не удалось загрузить аватарку: ' + e.message);
        removeAvatar();
    }
}

function removeAvatar() {
    document.getElementById('clubAvatarPreview').style.display = 'none';
    document.getElementById('clubAvatarDropZone').style.display = '';
    document.getElementById('clubAvatarUrl').value = '';
    document.getElementById('clubAvatarFileInput').value = '';
}

/* --- Расписание --- */
function addScheduleRow(data) {
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 align-items-center mb-1 club-schedule-row';
    row.innerHTML = `
      <select class="form-select form-select-sm" style="width:80px;" name="dayOfWeek">
        <option value="1">Пн</option><option value="2">Вт</option><option value="3">Ср</option>
        <option value="4">Чт</option><option value="5">Пт</option><option value="6">Сб</option>
        <option value="7">Вс</option>
      </select>
      <input type="time" class="form-control form-control-sm" style="width:120px;" name="startTime" value="09:00" />
      <span class="small">–</span>
      <input type="time" class="form-control form-control-sm" style="width:120px;" name="endTime" value="10:30" />
      <button type="button" class="btn btn-sm btn-outline-danger club-schedule-remove">&times;</button>
    `;
    row.querySelector('.club-schedule-remove').addEventListener('click', () => row.remove());
    if (data) {
        row.querySelector('[name="dayOfWeek"]').value = data.dayOfWeek;
        row.querySelector('[name="startTime"]').value = data.startTime;
        row.querySelector('[name="endTime"]').value = data.endTime;
    }
    document.getElementById('clubScheduleRows').appendChild(row);
}

/* --- CRUD --- */
async function saveClub() {
    const name = document.getElementById('clubName').value.trim();
    const type = document.getElementById('clubType').value;
    const description = document.getElementById('clubDescription').value.trim();
    const avatar = document.getElementById('clubAvatarUrl').value;
    if (!name) return alert('Введите название');

    const roomUuids = [];
    document.querySelectorAll('.club-room-cb:checked').forEach(cb => roomUuids.push(cb.value));

    const schedules = [];
    document.querySelectorAll('.club-schedule-row').forEach(row => {
        const day = parseInt(row.querySelector('[name="dayOfWeek"]').value);
        const start = row.querySelector('[name="startTime"]').value;
        const end = row.querySelector('[name="endTime"]').value;
        if (start && end) schedules.push({ dayOfWeek: day, startTime: start, endTime: end });
    });

    const club = { name, type, avatar, description, roomUuids, departmentUuid: deptUuid };
    const payload = { club, schedules };

    const uuid = editingClubId;
    const url = uuid ? '/api/club/' + uuid : '/api/club';
    const method = uuid ? 'PUT' : 'POST';

    try {
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(text || 'Ошибка сохранения');
        }
        bootstrap.Modal.getInstance(document.getElementById('clubModal')).hide();
        await loadClubs();
    } catch (e) {
        console.error('saveClub', e);
        alert(e.message || 'Не удалось сохранить клуб');
    }
}

async function deleteClub(uuid) {
    if (!confirm('Удалить этот клуб / кружок?')) return;
    try {
        const resp = await fetch('/api/club/' + uuid, { method: 'DELETE' });
        if (!resp.ok) throw new Error(resp.statusText);
        await loadClubs();
    } catch (e) {
        console.error('deleteClub', e);
        alert('Не удалось удалить клуб');
    }
}
