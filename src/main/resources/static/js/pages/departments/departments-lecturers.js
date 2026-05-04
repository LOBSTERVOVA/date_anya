/**
 * Страница списка кафедр
 */
(function () {
  const container = document.getElementById('departmentsList');
  const emptyEl = document.getElementById('deptEmpty');
  const totalEl = document.getElementById('dept-total');
  const searchInp = document.getElementById('deptSearch');
  if (!container) return;

  let allDepts = [];
  const priority = { PROFESSOR: 1, DOCENT: 2, SENIOR_LECTURER: 3, LECTURER: 4, EDUCATIONAL_METHODOLOGIST: 5 };

  function fmtLecturer(l) {
    const ln = (l.lastName || '').trim();
    const fi = l.firstName ? l.firstName.trim().charAt(0).toUpperCase() + '.' : '';
    const pi = l.patronymic ? l.patronymic.trim().charAt(0).toUpperCase() + '.' : '';
    return (ln + ' ' + [fi, pi].filter(Boolean).join('')).trim();
  }

  function isHead(l) { return (l && (l.isHead ?? l.head)) === true; }

  function sortLecturers(list) {
    const heads = list.filter(isHead);
    const ids = new Set(heads.map(h => h.uuid));
    const others = list.filter(l => !ids.has(l.uuid));
    others.sort((a, b) => {
      const pa = priority[a.academicTitle] || 9;
      const pb = priority[b.academicTitle] || 9;
      return pa !== pb ? pa - pb : fmtLecturer(a).localeCompare(fmtLecturer(b), 'ru');
    });
    return [...heads, ...others];
  }

  function render(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = allDepts.filter(d => d.name.toLowerCase().includes(q));
    if (totalEl) totalEl.textContent = `Всего кафедр: ${allDepts.length}` + (q ? `  •  найдено: ${filtered.length}` : '');

    if (!filtered.length) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    container.innerHTML = filtered.map(d => {
      const lecturers = Array.isArray(d.lecturers) ? d.lecturers : [];
      const sorted = sortLecturers(lecturers);
      const head = sorted.find(isHead);
      const preview = sorted.slice(0, 6).map(fmtLecturer).join(', ');
      const avatarLetter = (d.name || '').trim().charAt(0).toUpperCase();

      return `
        <div class="col-12 col-md-6 col-xl-4">
          <div class="dept-card p-3 h-100 d-flex flex-column" onclick="window.location.href='/departments/${d.uuid}/edit'">
            <div class="d-flex align-items-start gap-3 mb-2">
              <div class="card-avatar">${avatarLetter}</div>
              <div class="overflow-hidden flex-grow-1">
                <div class="card-title" title="${d.name}">${d.name}</div>
                ${head ? `<div class="text-muted small"><i class="bi bi-person-badge me-1"></i>Зав. кафедрой: <span class="fw-medium text-dark">${fmtLecturer(head)}</span></div>` : ''}
              </div>
            </div>
            <div class="card-lecturers mb-2 flex-grow-1" title="${sorted.map(fmtLecturer).join(', ')}">
              ${preview || '<span class="text-muted fst-italic">Нет преподавателей</span>'}
              ${sorted.length > 6 ? `<span class="text-muted"> и ещё ${sorted.length - 6}</span>` : ''}
            </div>
            <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
              <span class="badge-count"><i class="bi bi-people me-1"></i>${lecturers.length}</span>
              <button class="btn btn-outline-primary btn-edit" onclick="event.stopPropagation(); window.location.href='/departments/${d.uuid}/edit'">
                <i class="bi bi-pencil me-1"></i> Редактировать
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  fetch('/api/department')
    .then(r => r.json())
    .then(items => {
      allDepts = items || [];
      render('');
    })
    .catch(() => {
      container.innerHTML = '<div class="col-12 text-danger py-4 text-center">Не удалось загрузить список кафедр</div>';
    });

  if (searchInp) {
    searchInp.addEventListener('input', function () { render(this.value); });
  }
})();
