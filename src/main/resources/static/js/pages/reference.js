// Reference page front-end
// - Renders themes as cards
// - Opens a theme to list all reference items
// - Provides a modal with Quill to create a new reference info
// Implementation uses innerHTML for clarity with explanatory comments

(function(){
  const PAGE_ID = 'reference-page';

  // UI ids
  const themesGridId = 'ref-themes-grid';
  const themeViewId = 'ref-theme-view';
  const themeTitleId = 'ref-theme-title';
  const itemsListId = 'ref-items-list';
  const backBtnId = 'ref-back-to-themes';
  const openCreateId = 'ref-open-create';
  const modalId = 'ref-create-modal';
  const modalTitleId = 'ref-modal-title';
  const modalSaveId = 'ref-create-save';
  const modalDeleteId = 'ref-create-delete';
  const themeInputId = 'ref-theme-input';
  const importanceId = 'ref-importance';
  const titleId = 'ref-title';
  const annotationId = 'ref-annotation';
  const editorId = 'ref-editor';
  const actualDatesAddId = 'ref-actualDates-add';
  const actualDatesListId = 'ref-actualDates-list';

  // API endpoints
  const apiBase = '/api/reference';

  // State
  let quill = null;
  let currentTheme = null;
  let themeCounts = {};
  // edit state
  let editMode = false;
  let editingUuid = null;
  // media state
  let mediaQueue = [];          // File objects to upload after save
  let existingMedia = [];       // ReferenceMedia objects loaded from server
  let deletedMediaUuids = [];   // UUIDs to delete on save (for edit mode)

  function getCsrfHeaders(){
    // Compatible with global getCsrf() (used elsewhere in project)
    try {
      const obj = (typeof getCsrf === 'function') ? getCsrf() : (window.csrf || null);
      const headers = {};
      if (obj && obj.headerName && obj.token) headers[obj.headerName] = obj.token;
      else if (obj && obj.token) headers['X-CSRF-TOKEN'] = obj.token;
      return headers;
    } catch { return {}; }
  }

  // Fetch themes list
  async function fetchThemes(){
    const r = await fetch(apiBase + '/themes');
    if (!r.ok) throw new Error(`themes: ${r.status}`);
    return r.json();
  }

  // Fetch items by theme
  async function fetchByTheme(theme){
    const url = theme ? apiBase + '?theme=' + encodeURIComponent(theme) : apiBase;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`byTheme: ${r.status}`);
    return r.json();
  }

  // Fetch counts per theme
  async function fetchThemeCounts(){
    const r = await fetch(apiBase + '/themes/counts');
    if (!r.ok) throw new Error(`counts: ${r.status}`);
    return r.json();
  }

  // Render themes as cards
  function renderThemes(themes){
    const grid = document.getElementById(themesGridId);
    if (!grid) return;
    if (!themes || !themes.length){
      grid.innerHTML = '<div class="col-12"><div class="alert alert-info">Темы пока не созданы. Нажмите "Новая справка" для добавления.</div></div>';
      return;
    }
    grid.innerHTML = themes.map(t => {
      const cnt = themeCounts && typeof themeCounts[t] !== 'undefined' ? themeCounts[t] : 0;
      return `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm hover-theme" data-theme="${t}">
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="m-0 fs-3">${t}</h5>
              <div class="d-flex align-items-center gap-2">
                <span class="badge text-bg-primary fs-5 fw-normal" title="Количество справок">${cnt}</span>
                <i class="bi bi-chevron-right"></i>
              </div>
            </div>
            <div class="text-muted small">Просмотреть все справки по теме</div>
          </div>
        </div>
      </div>
      `;
    }).join('');
    // Click handling
    Array.from(grid.querySelectorAll('.hover-theme')).forEach(card => {
      card.addEventListener('click', () => openTheme(card.getAttribute('data-theme')));
    });
  }

  // Show theme view and list items
  function openTheme(theme){
    currentTheme = theme;
    const grid = document.getElementById(themesGridId);
    const view = document.getElementById(themeViewId);
    const title = document.getElementById(themeTitleId);
    const back = document.getElementById(backBtnId);
    if (title) title.textContent = theme;
    if (grid) grid.classList.add('d-none');
    if (view) view.classList.remove('d-none');
    if (back) back.classList.remove('d-none');
    // Pre-fill theme in modal form when creating
    const themeInput = document.getElementById(themeInputId);
    if (themeInput) themeInput.value = theme;

    fetchByTheme(theme).then(items => renderItems(items));
  }

  function backToThemes(){
    currentTheme = null;
    const grid = document.getElementById(themesGridId);
    const view = document.getElementById(themeViewId);
    const back = document.getElementById(backBtnId);
    if (grid) grid.classList.remove('d-none');
    if (view) view.classList.add('d-none');
    if (back) back.classList.add('d-none');
  }

  // Render items list for a theme
  function renderItems(items){
    const list = document.getElementById(itemsListId);
    if (!list) return;
    if (!items || !items.length){
      list.innerHTML = '<div class="alert alert-warning">В этой теме пока нет справок.</div>';
      return;
    }
    list.innerHTML = items.map(it => `
      <div class="ref-item card shadow-sm">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between">
            <div class="ref-title fs-3 fw-normal">${escapeHtml(it.title)}</div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge text-bg-secondary fs-6 fw-normal">Важность: ${it.importanceLevel ?? 0}</span>
              <button class="btn btn-sm btn-outline-primary ref-edit" data-uuid="${it.uuid}" title="Редактировать"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger ref-delete" data-uuid="${it.uuid}" title="Удалить"><i class="bi bi-trash"></i></button>
            </div>
          </div>
          <div class="text-muted small my-2">Обновлено: ${formatDate(it.updatedAt)}</div>
          <div class="ref-html">${it.htmlText || ''}</div>
          ${renderMediaForItem(it.mediaFiles)}
        </div>
    `).join('');
    // bind edit/delete handlers
    list.querySelectorAll('.ref-edit').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.getAttribute('data-uuid')));
    });
    const deleteBtns = list.querySelectorAll('.ref-delete');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => doDelete(btn.getAttribute('data-uuid')));
    });
  }

  // Helpers
  function escapeHtml(str){
    return (str || '').replace(/[&<>\"]/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
  }

  function formatDate(iso){
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('ru-RU'); } catch { return iso; }
  }

  /// Рендерит блок медиафайлов для карточки справки в списке
  function renderMediaForItem(mediaFiles) {
    if (!mediaFiles || !mediaFiles.length) return '';
    const cdn = window.cdn || '';
    const cards = mediaFiles.map(m => {
      const info = getMediaTypeInfo(m.contentType, m.fileName);
      const isImage = (m.contentType || '').startsWith('image/');
      return `
        <a href="${cdn}${m.storagePath}" target="_blank" class="ref-item-media-card" title="${escapeHtml(m.fileName)}">
          ${isImage
            ? `<img src="${cdn}${m.storagePath}" alt="${escapeHtml(m.fileName)}" loading="lazy" />`
            : `<i class="bi ${info.icon}" style="color:${info.color}; font-size:28px;"></i>`
          }
          <span class="ref-item-media-label">${info.label}</span>
        </a>`;
    }).join('');
    return `<div class="ref-item-media mt-3"><div class="d-flex flex-wrap gap-2">${cards}</div></div>`;
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /// Определяет тип файла по MIME для иконки и бейджа
  function getMediaTypeInfo(contentType, fileName) {
    const mime = (contentType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();
    if (mime.startsWith('image/')) return { icon: 'bi-file-image', color: '#0d6efd', label: 'Фото' };
    if (mime.startsWith('video/')) return { icon: 'bi-file-play', color: '#6f42c1', label: 'Видео' };
    if (mime.includes('pdf')) return { icon: 'bi-file-pdf', color: '#dc3545', label: 'PDF' };
    if (mime.includes('spreadsheet') || mime.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls'))
      return { icon: 'bi-file-spreadsheet', color: '#198754', label: 'Excel' };
    if (mime.includes('word') || mime.includes('document') || name.endsWith('.docx') || name.endsWith('.doc'))
      return { icon: 'bi-file-word', color: '#0d6efd', label: 'Word' };
    return { icon: 'bi-file-earmark', color: '#6c757d', label: 'Файл' };
  }

  /// Рендерит карточку для загруженного с сервера медиафайла (ReferenceMedia)
  function renderExistingMediaCard(media) {
    const info = getMediaTypeInfo(media.contentType, media.fileName);
    const isImage = (media.contentType || '').startsWith('image/');
    const cdn = window.cdn || '';
    const previewHtml = isImage
      ? `<img src="${cdn}${media.storagePath}" alt="${escapeHtml(media.fileName)}" loading="lazy" />`
      : `<i class="bi ${info.icon} media-icon" style="color:${info.color}"></i>`;

    return `
      <div class="media-card" data-media-uuid="${media.uuid}">
        <div class="media-preview">${previewHtml}</div>
        <span class="media-type-badge">${info.label}</span>
        <button class="media-remove" title="Удалить файл" data-action="delete-existing">&times;</button>
        <div class="media-info">
          <div class="media-name" title="${escapeHtml(media.fileName)}">${escapeHtml(media.fileName)}</div>
          <div class="media-size">${formatFileSize(media.fileSize)}</div>
        </div>
      </div>`;
  }

  /// Рендерит карточку для нового файла из очереди (File object)
  function renderQueuedMediaCard(file, index) {
    const contentType = file.type || '';
    const info = getMediaTypeInfo(contentType, file.name);
    const isImage = contentType.startsWith('image/');
    const previewHtml = isImage
      ? `<img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)}" />`
      : `<i class="bi ${info.icon} media-icon" style="color:${info.color}"></i>`;

    return `
      <div class="media-card" data-queue-index="${index}">
        <div class="media-preview">${previewHtml}</div>
        <span class="media-type-badge">${info.label}</span>
        <button class="media-remove" title="Удалить файл" data-action="remove-queued">&times;</button>
        <div class="media-info">
          <div class="media-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
          <div class="media-size">${formatFileSize(file.size)}</div>
        </div>
      </div>`;
  }

  /// Перерисовывает всю область превью
  function refreshMediaPreview() {
    const container = document.getElementById('ref-media-preview');
    if (!container) return;
    let html = '';
    existingMedia.forEach(m => { html += renderExistingMediaCard(m); });
    mediaQueue.forEach((f, i) => { html += renderQueuedMediaCard(f, i); });
    container.innerHTML = html;
    bindMediaCardEvents(container);
  }

  /// Навешивает обработчики на кнопки удаления в карточках
  function bindMediaCardEvents(container) {
    container.querySelectorAll('.media-remove[data-action="delete-existing"]').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const card = this.closest('.media-card');
        const uuid = card.getAttribute('data-media-uuid');
        if (uuid) {
          deletedMediaUuids.push(uuid);
          existingMedia = existingMedia.filter(m => m.uuid !== uuid);
          refreshMediaPreview();
        }
      };
    });
    container.querySelectorAll('.media-remove[data-action="remove-queued"]').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const card = this.closest('.media-card');
        const idx = parseInt(card.getAttribute('data-queue-index'), 10);
        if (!isNaN(idx) && idx >= 0 && idx < mediaQueue.length) {
          mediaQueue.splice(idx, 1);
          refreshMediaPreview();
        }
      };
    });
  }

  /// Добавляет файлы в очередь
  function addFilesToQueue(files) {
    for (const f of files) {
      // Проверка размера (50 МБ)
      if (f.size > 50 * 1024 * 1024) {
        alert(`Файл "${f.name}" слишком большой (${formatFileSize(f.size)}). Максимум 50 МБ.`);
        continue;
      }
      mediaQueue.push(f);
    }
    refreshMediaPreview();
  }

  /// Загружает файлы из очереди на сервер
  async function uploadQueuedFiles(refUuid) {
    const headers = getCsrfHeaders();
    for (const file of mediaQueue) {
      const formData = new FormData();
      formData.append('file', file);
      await fetch(apiBase + '/' + refUuid + '/media', {
        method: 'POST',
        headers: headers,
        body: formData
      });
    }
  }

  /// Удаляет помеченные медиафайлы на сервере
  async function deleteMarkedMedia(refUuid) {
    const headers = getCsrfHeaders();
    for (const mediaUuid of deletedMediaUuids) {
      await fetch(apiBase + '/' + refUuid + '/media/' + mediaUuid, {
        method: 'DELETE',
        headers: headers
      });
    }
  }

  /// Сброс медиа-состояния
  function resetMediaState() {
    mediaQueue = [];
    existingMedia = [];
    deletedMediaUuids = [];
    const container = document.getElementById('ref-media-preview');
    if (container) container.innerHTML = '';
  }

  // Modal utilities — use Bootstrap modal API
  let bsModal = null;
  function getBsModal() {
    if (!bsModal) {
      const el = document.getElementById(modalId);
      if (el) bsModal = new bootstrap.Modal(el, { backdrop: true, keyboard: true });
    }
    return bsModal;
  }

  function showModal(show) {
    const m = getBsModal();
    if (!m) return;
    if (show) m.show(); else m.hide();
  }

  function initQuill(){
    const toolbar = [
      [{ header: [1,2,3,false] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold','italic','underline','strike'],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link','image'],
      ['clean']
    ];
    quill = new Quill('#' + editorId, { theme: 'snow', modules: { toolbar } });
  }

  function clearCreateForm(){
    const t = document.getElementById(themeInputId);
    const imp = document.getElementById(importanceId);
    const title = document.getElementById(titleId);
    const ann = document.getElementById(annotationId);
    if (t && !currentTheme) t.value = '';
    if (imp) imp.value = '1';
    if (title) title.value = '';
    if (ann) ann.value = '';
    if (quill) quill.root.innerHTML = '';
    const list = document.getElementById(actualDatesListId);
    if (list) list.innerHTML = '';
    const delBtn = document.getElementById(modalDeleteId);
    if (delBtn) delBtn.style.display = 'none';
    resetMediaState();
  }

  function openCreate(){
    // Prefill theme if coming from a theme view
    const t = document.getElementById(themeInputId);
    if (t && currentTheme) t.value = currentTheme;
    // reset edit state
    editMode = false; editingUuid = null;
    const titleEl = document.getElementById(modalTitleId);
    if (titleEl) titleEl.textContent = 'Создание справки';
    const saveBtn = document.getElementById(modalSaveId);
    if (saveBtn) saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Сохранить';
    const delBtn = document.getElementById(modalDeleteId);
    if (delBtn) delBtn.style.display = 'none';
    showModal(true);
    // Lazy init Quill once
    if (!quill) initQuill();
    // reset and add one empty date range row
    const list = document.getElementById(actualDatesListId);
    if (list) { list.innerHTML = ''; addDateRangeRow(); }
    resetMediaState();
  }

  function saveCreate(){
    const t = document.getElementById(themeInputId)?.value.trim();
    const impVal = parseInt(document.getElementById(importanceId)?.value ?? '1', 10);
    const titleVal = document.getElementById(titleId)?.value.trim();
    const annVal = document.getElementById(annotationId)?.value.trim();
    const html = quill ? quill.root.innerHTML : '';
    if (!t || !titleVal){ alert('Заполните тему и заголовок'); return; }

    const payload = {
      theme: t,
      importanceLevel: isNaN(impVal) ? 0 : impVal,
      title: titleVal,
      annotation: annVal || null,
      htmlText: html || '',
      actualDates: collectActualDates()
    };

    const headers = Object.assign({ 'Content-Type': 'application/json' }, getCsrfHeaders());
    const req = editMode && editingUuid
      ? fetch(apiBase + '/' + editingUuid, { method: 'PUT', headers, body: JSON.stringify(payload) })
      : fetch(apiBase, { method: 'POST', headers, body: JSON.stringify(payload) });
    req.then(r => { if (!r.ok) throw new Error('save failed: ' + r.status); return r.json(); })
      .then(async (saved) => {
        // Загружаем новые файлы и удаляем помеченные
        if (saved && saved.uuid) {
          if (deletedMediaUuids.length) await deleteMarkedMedia(saved.uuid);
          if (mediaQueue.length) await uploadQueuedFiles(saved.uuid);
        }
        showModal(false);
        clearCreateForm();
        return Promise.all([fetchThemes(), fetchThemeCounts()]);
      })
      .then(([themes, counts]) => {
        themeCounts = counts || {};
        renderThemes(themes);
        if (currentTheme) return fetchByTheme(currentTheme).then(renderItems);
      })
      .catch(e => { console.error('saveCreate:', e); alert('Не удалось сохранить справку'); });
  }

  function startEdit(uuid){
    Promise.all([
      fetch(apiBase + '/' + uuid).then(r => { if (!r.ok) throw new Error('not found'); return r.json(); }),
      fetch(apiBase + '/' + uuid + '/media').then(r => r.ok ? r.json() : []).catch(() => [])
    ])
      .then(([item, mediaList]) => {
        const titleEl = document.getElementById(modalTitleId);
        if (titleEl) titleEl.textContent = 'Редактирование справки';
        const delBtn = document.getElementById(modalDeleteId);
        if (delBtn) { delBtn.style.display = ''; delBtn.onclick = () => { showModal(false); doDelete(uuid); }; }
        showModal(true);
        if (!quill) initQuill();
        const t = document.getElementById(themeInputId);
        const imp = document.getElementById(importanceId);
        const title = document.getElementById(titleId);
        const ann = document.getElementById(annotationId);
        if (t) t.value = item.theme || '';
        if (imp) imp.value = String(item.importanceLevel ?? 1);
        if (title) title.value = item.title || '';
        if (ann) ann.value = item.annotation || '';
        if (quill) quill.root.innerHTML = item.htmlText || '';
        // populate actualDates
        const list = document.getElementById(actualDatesListId);
        if (list) {
          list.innerHTML = '';
          if (Array.isArray(item.actualDates) && item.actualDates.length){
            item.actualDates.forEach(r => {
              addDateRangeRow(r, r);
            });
          } else {
            addDateRangeRow();
          }
        }
        // Загружаем существующие медиафайлы
        existingMedia = Array.isArray(mediaList) ? mediaList : [];
        mediaQueue = [];
        deletedMediaUuids = [];
        refreshMediaPreview();

        editMode = true; editingUuid = item.uuid;
        const saveBtn = document.getElementById(modalSaveId);
        if (saveBtn) saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Обновить';
      })
      .catch(e => { console.error('startEdit:', e); alert('Не удалось загрузить справку'); });
  }

  // ----- Actual Dates handling (month-day only, no year) -----
  const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

  function daysInMonth(month) {
    // month: 1..12; February set to 29 for inclusivity in annual context
    if ([1,3,5,7,8,10,12].includes(month)) return 31;
    if ([4,6,9,11].includes(month)) return 30;
    if (month === 2) return 29;
    return 31;
  }

  function buildMonthSelect(className, value) {
    const sel = document.createElement('select');
    sel.className = `form-select ${className}`;
    sel.innerHTML = MONTHS_RU.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
    if (value && value >=1 && value <= 12) sel.value = String(value);
    return sel;
  }

  function buildDaySelect(className, month, value) {
    const sel = document.createElement('select');
    sel.className = `form-select ${className}`;
    const max = daysInMonth(month || 1);
    let opts = '';
    for (let d=1; d<=max; d++) opts += `<option value="${d}">${d}</option>`;
    sel.innerHTML = opts;
    if (value && value >=1 && value <= max) sel.value = String(value);
    return sel;
  }

  function updateDayOptions(daySelect, month) {
    const current = parseInt(daySelect.value || '1', 10);
    const max = daysInMonth(month);
    daySelect.innerHTML = Array.from({length:max}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    if (current <= max) daySelect.value = String(current); else daySelect.value = String(max);
  }

  function addDateRangeRow(prefillStart = null, prefillEnd = null){
    const list = document.getElementById(actualDatesListId);
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'date-range-row';
    const sm = prefillStart && prefillStart.startMonth ? prefillStart.startMonth : 1;
    const sd = prefillStart && prefillStart.startDay ? prefillStart.startDay : 1;
    const em = (prefillStart && prefillStart.endMonth) ? prefillStart.endMonth : (prefillEnd && prefillEnd.endMonth) ? prefillEnd.endMonth : sm;
    const ed = (prefillStart && prefillStart.endDay) ? prefillStart.endDay : (prefillEnd && prefillEnd.endDay) ? prefillEnd.endDay : sd;

    // Build Start group
    const startGroup = document.createElement('div');
    startGroup.className = 'input-group';
    startGroup.innerHTML = `<span class="input-group-text">Начало</span>`;
    const startMonthSel = buildMonthSelect('start-month', sm);
    const startDaySel = buildDaySelect('start-day', sm, sd);
    startGroup.appendChild(startMonthSel);
    startGroup.appendChild(startDaySel);

    // Build End group
    const endGroup = document.createElement('div');
    endGroup.className = 'input-group';
    endGroup.innerHTML = `<span class="input-group-text">Окончание</span>`;
    const endMonthSel = buildMonthSelect('end-month', em);
    const endDaySel = buildDaySelect('end-day', em, ed);
    endGroup.appendChild(endMonthSel);
    endGroup.appendChild(endDaySel);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-outline-danger remove-range';
    removeBtn.title = 'Удалить диапазон';
    removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
    removeBtn.addEventListener('click', () => row.remove());

    // Attach and wire month change -> update day options
    row.appendChild(startGroup);
    row.appendChild(endGroup);
    row.appendChild(removeBtn);

    startMonthSel.addEventListener('change', () => updateDayOptions(startDaySel, parseInt(startMonthSel.value, 10)));
    endMonthSel.addEventListener('change', () => updateDayOptions(endDaySel, parseInt(endMonthSel.value, 10)));

    list.appendChild(row);
  }

  function collectActualDates(){
    const list = document.getElementById(actualDatesListId);
    if (!list) return [];
    const rows = Array.from(list.querySelectorAll('.date-range-row'));
    const result = [];
    rows.forEach(row => {
      const startMonthSel = row.querySelector('select.start-month');
      const startDaySel = row.querySelector('select.start-day');
      const endMonthSel = row.querySelector('select.end-month');
      const endDaySel = row.querySelector('select.end-day');
      const startMonth = parseInt(startMonthSel?.value || '0', 10);
      const startDay = parseInt(startDaySel?.value || '0', 10);
      const endMonth = parseInt(endMonthSel?.value || String(startMonth), 10);
      const endDay = parseInt(endDaySel?.value || String(startDay), 10);
      if (startMonth >= 1 && startDay >= 1){
        // Normalize invalid day values just in case
        const maxStart = daysInMonth(startMonth);
        const maxEnd = daysInMonth(endMonth);
        const sDay = Math.min(startDay, maxStart);
        const eDay = Math.min(endDay, maxEnd);
        result.push({ startMonth, startDay: sDay, endMonth, endDay: eDay });
      }
    });
    return result;
  }

  function doDelete(uuid){
    if (!confirm('Удалить справку безвозвратно?')) return;
    const headers = getCsrfHeaders();
    fetch(apiBase + '/' + uuid, { method: 'DELETE', headers })
      .then(r => { if (!r.ok) throw new Error('delete failed'); })
      .then(() => {
        if (currentTheme) return fetchByTheme(currentTheme).then(renderItems);
        return Promise.all([fetchThemes(), fetchThemeCounts()])
          .then(([themes, counts]) => { themeCounts = counts || {}; renderThemes(themes); });
      })
      .catch(e => { console.error('doDelete:', e); alert('Не удалось удалить справку'); });
  }

  function bindUi(){
    const root = document.getElementById(PAGE_ID);
    if (!root) return;

    // Load and render themes with counts
    Promise.all([fetchThemes(), fetchThemeCounts()])
      .then(([themes, counts]) => { themeCounts = counts || {}; renderThemes(themes); })
      .catch(e => {
        console.error('bindUi:', e);
        const grid = document.getElementById(themesGridId);
        if (grid) grid.innerHTML = '<div class="col-12"><div class="alert alert-danger">Ошибка загрузки тем</div></div>';
      });

    // Controls
    const back = document.getElementById(backBtnId);
    const openBtn = document.getElementById(openCreateId);
    const saveBtn = document.getElementById(modalSaveId);
    const addBtn = document.getElementById(actualDatesAddId);

    if (back) back.addEventListener('click', backToThemes);
    if (openBtn) openBtn.addEventListener('click', openCreate);
    if (saveBtn) saveBtn.addEventListener('click', saveCreate);
    if (addBtn) addBtn.addEventListener('click', () => addDateRangeRow());

    // --- Медиафайлы: dropzone ---
    const dropzone = document.getElementById('ref-media-dropzone');
    const fileInput = document.getElementById('ref-media-input');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length) {
          addFilesToQueue(fileInput.files);
          fileInput.value = '';
        }
      });
      // Drag & drop
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          addFilesToQueue(e.dataTransfer.files);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', bindUi);
})();
