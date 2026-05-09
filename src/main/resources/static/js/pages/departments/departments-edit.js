/**
 * Страница редактирования кафедры
 */
(function () {
  const deptUuid = window.__deptUuid;
  if (!deptUuid) return;

  let initialDepartment = null;
  let quill = null;
  let editLecturerId = null;

  /* --- Утилиты --- */
  const priority = { PROFESSOR: 1, DOCENT: 2, SENIOR_LECTURER: 3, LECTURER: 4, EDUCATIONAL_METHODOLOGIST: 5 };

  function titleCase(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''; }

  function initials(l) {
    return ((l.lastName || '').charAt(0) + (l.firstName || '').charAt(0)).toUpperCase() || '?';
  }

  function nameWithInitials(l) {
    const ln = (l.lastName || '').trim();
    const fi = l.firstName ? l.firstName.trim().charAt(0).toUpperCase() + '.' : '';
    const pi = l.patronymic ? l.patronymic.trim().charAt(0).toUpperCase() + '.' : '';
    return [ln, [fi, pi].filter(Boolean).join('')].filter(Boolean).join(' ');
  }

  function isHead(l) { return (l && (l.isHead ?? l.head)) === true; }

  function roleBadge(l) {
    if (isHead(l)) return '<span class="badge badge-head ms-auto">Зав.</span>';
    const map = { PROFESSOR: 'badge-prof', DOCENT: 'badge-docent', SENIOR_LECTURER: 'badge-senior', LECTURER: 'badge-lect', EDUCATIONAL_METHODOLOGIST: 'badge-method' };
    const label = { PROFESSOR: 'Проф.', DOCENT: 'Доц.', SENIOR_LECTURER: 'Ст. преп.', LECTURER: 'Преп.', EDUCATIONAL_METHODOLOGIST: 'Методист' };
    const cls = map[l.academicTitle] || 'badge-lect';
    return `<span class="badge ${cls} ms-auto">${label[l.academicTitle] || ''}</span>`;
  }

  /* --- Quill --- */
  function initQuill() {
    const Size = Quill.import('attributors/style/size');
    Size.whitelist = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
    Quill.register(Size, true);
    const Font = Quill.import('attributors/class/font');
    Font.whitelist = ['roboto', 'arial', 'times', 'monospace'];
    Quill.register(Font, true);
    quill = new Quill('#descriptionEditor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          [{ font: Font.whitelist }],
          [{ size: Size.whitelist }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['link', 'clean']
        ]
      }
    });
  }

  /* --- Загрузка --- */
  function loadDepartment() {
    return fetch(`/api/department/${deptUuid}`)
      .then(r => r.json())
      .then(data => {
        initialDepartment = data;
        document.getElementById('deptTitle').textContent = titleCase(data.name || 'Кафедра');
        document.getElementById('description').value = data.description || '';

        const list = Array.isArray(data.lecturers) ? data.lecturers : [];

        // head selector
        const headSel = document.getElementById('headSelect');
        headSel.innerHTML = '<option value="">— Не выбран —</option>' + list.map(l =>
          `<option value="${l.uuid}" ${isHead(l) ? 'selected' : ''}>${nameWithInitials(l)}</option>`
        ).join('');
        const currentHead = list.find(isHead);
        headSel.value = currentHead ? currentHead.uuid : '';
        const statusEl = document.getElementById('headSaveStatus');
        if (statusEl) {
          statusEl.textContent = currentHead ? 'Текущий заведующий выбран' : 'Заведующий не выбран';
          statusEl.className = 'form-text ' + (currentHead ? 'text-muted' : 'text-warning');
        }
        headSel.onchange = saveHeadSelection;

        // lecturers count & cards
        document.getElementById('deptLecturersCount').textContent = list.length;
        renderLecturerCards(list);

        // Quill
        if (quill) quill.root.innerHTML = data.description || '';
      });
  }

  function renderLecturerCards(list) {
    const cont = document.getElementById('deptLecturersCards');
    const heads = list.filter(isHead);
    const ids = new Set(heads.map(h => h.uuid));
    const others = list.filter(l => !ids.has(l.uuid));

    others.sort((a, b) => {
      const pa = priority[a.academicTitle] || 9;
      const pb = priority[b.academicTitle] || 9;
      return pa !== pb ? pa - pb : nameWithInitials(a).localeCompare(nameWithInitials(b), 'ru');
    });

    const ordered = [...heads, ...others];

    cont.innerHTML = ordered.map(l => {
      const avatar = (l.avatar || '').trim();
      const avatarEl = avatar
        ? `<img src="${cdn}${avatar}" alt="" class="rounded-circle object-fit-cover" style="width:44px;height:44px;">`
        : `<div class="avatar-circle">${initials(l)}</div>`;

      return `
        <div class="dept-lecturer-card d-flex align-items-center gap-2 p-2">
          ${avatarEl}
          <div class="d-flex align-items-center flex-grow-1 gap-2 overflow-hidden">
            <span class="small fw-medium text-truncate">${nameWithInitials(l)}</span>
            ${roleBadge(l)}
            <div class="btn-group btn-group-sm ms-2 flex-shrink-0">
              <button class="btn btn-outline-secondary" title="Редактировать" onclick="window.__openEditLecturer('${l.uuid}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" title="Удалить" onclick="window.__deleteLecturer('${l.uuid}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>`;
    }).join('') || '<div class="text-muted small">Нет преподавателей</div>';
  }

  /* --- Зав. кафедрой --- */
  function saveHeadSelection() {
    const headSel = document.getElementById('headSelect');
    const statusEl = document.getElementById('headSaveStatus');
    const headUuid = headSel.value || null;
    if (!headUuid) {
      if (statusEl) { statusEl.textContent = 'Заведующий не выбран'; statusEl.className = 'form-text text-muted'; }
      return;
    }
    if (statusEl) { statusEl.textContent = 'Сохраняем...'; statusEl.className = 'form-text text-muted'; }
    fetch(`/api/lecturer/${headUuid}/make-head`, { method: 'POST' })
      .then(r => { if (!r.ok) throw new Error('fail'); return r.json(); })
      .then(() => {
        if (statusEl) { statusEl.textContent = 'Заведующий сохранён'; statusEl.className = 'form-text text-success'; }
        return loadDepartment();
      })
      .catch(() => {
        if (statusEl) { statusEl.textContent = 'Не удалось сохранить заведующего'; statusEl.className = 'form-text text-danger'; }
      });
  }

  /* --- Преподаватели --- */
  window.__openEditLecturer = function (uuid) {
    editLecturerId = uuid;
    const list = Array.isArray(initialDepartment?.lecturers) ? initialDepartment.lecturers : [];
    const l = list.find(ll => ll.uuid === uuid);
    if (!l) return;
    document.getElementById('editLastName').value = l.lastName || '';
    document.getElementById('editFirstName').value = l.firstName || '';
    document.getElementById('editPatronymic').value = l.patronymic || '';
    document.getElementById('editAcademicTitle').value = l.academicTitle || '';
    document.getElementById('editBirthDate').value = l.birthDate || '';
    document.getElementById('editAvatar').value = l.avatar || '';
    document.getElementById('editDescription').value = l.description || '';
    document.getElementById('editPhone').value = l.phone || '';
    document.getElementById('editEmail').value = l.email || '';
    document.getElementById('editRoom').value = l.room || '';
    document.getElementById('editAcademicDegree').value = l.academicDegree || '';
    document.getElementById('editLabHead').checked = !!l.isLabHead;
    new bootstrap.Modal(document.getElementById('editLecturerModal')).show();
  };

  window.__deleteLecturer = function (uuid) {
    if (!confirm('Удалить преподавателя безвозвратно?')) return;
    fetch(`/api/lecturer/${uuid}`, { method: 'DELETE' })
      .then(r => { if (!r.ok) throw new Error('fail'); })
      .then(() => loadDepartment())
      .catch(() => alert('Не удалось удалить преподавателя'));
  };

  function saveEditLecturer() {
    if (!editLecturerId) return;
    const body = {
      lastName: document.getElementById('editLastName').value.trim(),
      firstName: document.getElementById('editFirstName').value.trim(),
      patronymic: document.getElementById('editPatronymic').value.trim(),
      academicTitle: document.getElementById('editAcademicTitle').value || null,
      birthDate: document.getElementById('editBirthDate').value || null,
      avatar: document.getElementById('editAvatar').value || null,
      description: document.getElementById('editDescription').value || null,
      phone: document.getElementById('editPhone').value || null,
      email: document.getElementById('editEmail').value || null,
      room: document.getElementById('editRoom').value || null,
      academicDegree: document.getElementById('editAcademicDegree').value || null,
      isLabHead: !!document.getElementById('editLabHead').checked
    };
    if (!body.lastName || !body.firstName) { alert('Укажите имя и фамилию'); return; }
    fetch(`/api/lecturer/${editLecturerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => { if (!r.ok) throw new Error('fail'); return r.json(); })
      .then(() => {
        bootstrap.Modal.getInstance(document.getElementById('editLecturerModal')).hide();
        editLecturerId = null;
        return loadDepartment();
      })
      .catch(() => alert('Не удалось сохранить изменения'));
  }

  function createLecturer() {
    const body = {
      lastName: document.getElementById('newLastName').value.trim(),
      firstName: document.getElementById('newFirstName').value.trim(),
      patronymic: document.getElementById('newPatronymic').value.trim(),
      academicTitle: document.getElementById('newAcademicTitle').value || null,
      birthDate: document.getElementById('newBirthDate').value || null,
      avatar: document.getElementById('newAvatar').value || null,
      description: document.getElementById('newDescription').value || null,
      phone: document.getElementById('newPhone').value || null,
      email: document.getElementById('newEmail').value || null,
      room: document.getElementById('newRoom').value || null,
      academicDegree: document.getElementById('newAcademicDegree').value || null,
      isLabHead: !!document.getElementById('newLabHead').checked,
      departmentUuid: deptUuid
    };
    if (!body.lastName || !body.firstName) { alert('Укажите имя и фамилию'); return; }
    fetch('/api/lecturer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => { if (!r.ok) throw new Error('fail'); return r.json(); })
      .then(() => {
        bootstrap.Modal.getInstance(document.getElementById('createLecturerModal')).hide();
        ['newLastName','newFirstName','newPatronymic','newAcademicTitle','newBirthDate','newAvatar','newDescription','newPhone','newEmail','newRoom','newAcademicDegree'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('newLabHead').checked = false;
        return loadDepartment();
      })
      .catch(() => alert('Не удалось создать преподавателя'));
  }

  function saveDepartment() {
    const description = quill ? quill.root.innerHTML : document.getElementById('description').value;
    const list = Array.isArray(initialDepartment?.lecturers) ? initialDepartment.lecturers : [];
    const lecturerUuids = list.map(l => l.uuid);

    fetch(`/api/department/${deptUuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid: deptUuid,
        name: initialDepartment?.name || null,
        description,
        rooms: initialDepartment?.rooms || [],
        lecturerUuids
      })
    }).then(r => { if (!r.ok) throw new Error('fail'); return r.json(); })
      .then(() => showToastMsg('Сохранено', 'success'))
      .catch(() => alert('Не удалось сохранить изменения'));
  }

  function showToastMsg(msg, type) {
    const cont = document.getElementById('info-toast');
    if (!cont) return;
    const el = document.createElement('div');
    el.className = `toast show bg-${type} text-white p-3 rounded-3`;
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  /* --- Инициализация --- */
  document.addEventListener('DOMContentLoaded', () => {
    initQuill();
    loadDepartment();
    document.getElementById('saveBtn').addEventListener('click', saveDepartment);
    document.getElementById('createLecturerBtn').addEventListener('click', createLecturer);
    document.getElementById('editLecturerSaveBtn').addEventListener('click', saveEditLecturer);
  });
})();
