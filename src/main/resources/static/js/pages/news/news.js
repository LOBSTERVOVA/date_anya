// News page — full CRUD, pagination, beautiful modal with live card preview

(function () {
  const PAGE_ID = 'news-page';
  const openCreateBtnId = 'open-create-news';
  const modalId = 'create-news-modal';
  const modalCloseId = 'create-news-close';
  const modalCancelId = 'create-news-cancel';
  const modalSaveId = 'create-news-save';
  const newsListId = 'news-list';
  const newsTypePillsId = 'news-type-pills';
  const newsTitleId = 'news-title';
  const newsEditorId = 'news-editor';
  const editingUuidId = 'editing-news-uuid';
  const modalTitleId = 'news-modal-title';
  const paginationId = 'news-pagination';

  // Live preview elements
  const previewBadgeId = 'preview-type-badge';
  const previewTitleId = 'preview-title';
  const previewDateId = 'preview-date';
  const previewContentId = 'preview-content';

  // State
  let quill = null;
  let selectedType = 'OTHER';
  let currentPage = 0;
  let totalPages = 0;
  const pageSize = 8;
  let mainPhotoUrl = null;
  let galleryPhotos = [];
  let lightboxIdx = 0;

  // CDN-префикс (из глобальной переменной template.html)
  function cdnUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
    return (window.cdn || '') + path;
  }

  const NEWS_TYPES = [
    { value: 'APP_UPDATE',        label: 'Обновление приложения',  color: '#4A90D9' },
    { value: 'NEW_SECTION',       label: 'Новая секция',           color: '#27AE60' },
    { value: 'NEW_SCIENCE_CLUB',  label: 'Новый научный кружок',   color: '#8E44AD' },
    { value: 'NEW_LECTURER',      label: 'Новый преподаватель',    color: '#16A085' },
    { value: 'SPORT_ACHIEVEMENT', label: 'Спортивные достижения',  color: '#F39C12' },
    { value: 'SPORT_EVENT',       label: 'Спортивное мероприятие', color: '#E74C3C' },
    { value: 'IMPORTANT',         label: 'Важное',                 color: '#C0392B' },
    { value: 'INFORMATION',       label: 'Информационная справка',  color: '#5D6D7E' },
    { value: 'OTHER',             label: 'Прочее',                 color: '#95A5A6' },
  ];

  // ---- API ----
  async function fetchNews(page) {
    const resp = await fetch('/api/news?page=' + page + '&size=' + pageSize);
    if (!resp.ok) throw new Error('Ошибка загрузки новостей');
    const data = await resp.json();
    return { items: data.items || [], total: data.total || 0 };
  }

  async function saveNewsToServer(payload) {
    const resp = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || 'Ошибка сохранения');
    }
    return resp.json();
  }

  
  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!resp.ok) throw new Error('Ошибка загрузки файла');
    const data = await resp.json();
    return data.url || '';
  }
  async function deleteNewsFromServer(uuid) {
    const resp = await fetch('/api/news/' + uuid, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Ошибка удаления');
  }

  // ---- Утилиты ----
  function typeInfo(value) {
    return NEWS_TYPES.find(t => t.value === value) || { label: 'Новость', color: '#6c757d' };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }



  // ---- Основная фотография ----
  function resetMainPhoto() {
    mainPhotoUrl = null;
    const preview = document.getElementById('main-photo-preview');
    const placeholder = document.getElementById('main-photo-placeholder');
    const removeBtn = document.getElementById('main-photo-remove');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = '';
    if (removeBtn) removeBtn.style.display = 'none';
  }

  function setMainPhotoPreview(url) {
    mainPhotoUrl = url;
    const preview = document.getElementById('main-photo-preview');
    const placeholder = document.getElementById('main-photo-placeholder');
    const removeBtn = document.getElementById('main-photo-remove');
    if (preview) { preview.src = cdnUrl(url); preview.style.display = ''; }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = '';
  }

  async function handleMainPhotoFile(file) {
    const zone = document.getElementById('main-photo-upload-zone');
    const placeholder = document.getElementById('main-photo-placeholder');
    // Показываем спиннер
    if (placeholder) placeholder.innerHTML = '<span class="spinner-border text-secondary" style="width:2rem;height:2rem;" role="status"></span><p class="mb-0 mt-1" style="font-size:0.85rem;">Загрузка…</p>';
    try {
      const url = await uploadFile(file);
      setMainPhotoPreview(url);
    } catch (e) {
      alert('Ошибка загрузки фото: ' + e.message);
      if (placeholder) placeholder.innerHTML = '<i class="bi bi-cloud-arrow-up" style="font-size: 2rem;"></i><p class="mb-0 mt-1" style="font-size: 0.85rem;">Нажмите или перетащите фото</p>';
    }
  }

  // ---- Галерея ----
  function renderGalleryThumbs() {
    const container = document.getElementById('gallery-photos-container');
    if (!container) return;
    container.innerHTML = galleryPhotos.map((url, i) => `
      <div class="gallery-thumb-wrap">
        <img src="${cdnUrl(url)}" class="gallery-thumb" data-idx="${i}" alt="" />
        <button type="button" class="btn btn-sm btn-danger gallery-thumb-remove" data-idx="${i}" title="Удалить">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `).join('');
    container.querySelectorAll('.gallery-thumb').forEach(img => {
      img.addEventListener('click', () => openLightbox(parseInt(img.getAttribute('data-idx'))));
    });
    container.querySelectorAll('.gallery-thumb-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        galleryPhotos.splice(idx, 1);
        renderGalleryThumbs();
      });
    });
  }

  async function handleGalleryFiles(files) {
    const zone = document.getElementById('gallery-upload-zone');
    const origHtml = zone ? zone.querySelector('.text-center').innerHTML : '';
    // Показываем спиннер
    if (zone) {
      const tc = zone.querySelector('.text-center');
      if (tc) tc.innerHTML = '<span class="spinner-border spinner-border-sm text-secondary me-2" role="status"></span>Загрузка…';
    }
    for (const file of files) {
      try {
        const url = await uploadFile(file);
        galleryPhotos.push(url);
        renderGalleryThumbs();
      } catch (e) {
        console.error('Ошибка загрузки фото в галерею:', e);
      }
    }
    // Восстанавливаем
    if (zone) {
      const tc = zone.querySelector('.text-center');
      if (tc) tc.innerHTML = origHtml;
    }
  }

  function resetGallery() {
    galleryPhotos = [];
    renderGalleryThumbs();
  }
  // ---- Рендер карточек в списке ----
  function newsIconAndGradient(type) {
    const map = {
      APP_UPDATE:         { icon: 'bi-gear',             gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      NEW_SECTION:        { icon: 'bi-grid',             gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
      NEW_SCIENCE_CLUB:   { icon: 'bi-people',           gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
      NEW_LECTURER:       { icon: 'bi-person-badge',     gradient: 'linear-gradient(135deg, #16A085 0%, #2ECC71 100%)' },
      SPORT_ACHIEVEMENT:  { icon: 'bi-trophy',           gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)' },
      SPORT_EVENT:        { icon: 'bi-calendar-event',   gradient: 'linear-gradient(135deg, #E74C3C 0%, #c0392b 100%)' },
      IMPORTANT:          { icon: 'bi-exclamation-triangle', gradient: 'linear-gradient(135deg, #C0392B 0%, #8e1e1e 100%)' },
      INFORMATION:        { icon: 'bi-info-circle',      gradient: 'linear-gradient(135deg, #5D6D7E 0%, #34495E 100%)' },
      OTHER:              { icon: 'bi-newspaper',        gradient: 'linear-gradient(135deg, #95A5A6 0%, #7f8c8d 100%)' },
    };
    return map[type] || map.OTHER;
  }

  function stripHtml(html, maxLen) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    const text = div.textContent || div.innerText || '';
    return text.length > maxLen ? text.substring(0, maxLen).trim() + '…' : text;
  }

  function renderNewsCards(items) {
    const wrap = document.getElementById(newsListId);
    if (!wrap) return;
    if (!items.length) {
      wrap.innerHTML = '<div class="text-center text-muted py-5 fs-4">Новостей пока нет</div>';
      return;
    }
    wrap.innerHTML = items.map(n => {
      const ti = typeInfo(n.type);
      const dateStr = formatDate(n.updatedAt || n.createdAt);
      const desc = stripHtml(n.htmlContent, 220);
      const img = newsIconAndGradient(n.type);
      const isImportant = n.type === 'IMPORTANT';
      return `
        <div class="news-card bg-white p-3 p-md-4" data-uuid="${n.uuid}">
          <div class="row align-items-center g-3">
            <div class="col-lg-8">
              <span class="badge badge-category d-inline-flex align-items-center gap-1 mb-2"
                    style="background: ${ti.color}18; color: ${ti.color}; font-size: 0.85rem; padding: 0.5em 1em; border-radius: 2rem; font-weight: 500;">
                <i class="bi ${img.icon}"></i>${ti.label}
              </span>
              <h3 class="news-card-title">${escapeHtml(n.title)}</h3>
<!--              ${desc ? `<p class="news-card-desc">${escapeHtml(desc)}</p>` : ''}-->
              <div class="d-flex align-items-center flex-wrap gap-2 mt-2">
                <span class="news-meta">
                  <i class="bi bi-calendar me-1"></i>${dateStr}
                </span>
                <span class="text-muted">•</span>
                <span class="news-tag" style="color: ${isImportant ? '#C0392B' : '#059669'}; font-weight: 600; font-size: 0.875rem;">
                  ${isImportant ? 'Важно' : 'Для студентов'}
                </span>
              </div>
            </div>
            <div class="col-lg-4 text-lg-end mt-2 mt-lg-0">
              ${n.mainPhotoUrl ? `<img src="${cdnUrl(n.mainPhotoUrl)}" class="news-card-img" alt="${escapeHtml(n.title)}" />` : `<div class="news-card-icon d-inline-flex" style="background: ${img.gradient};"><i class="bi ${img.icon} text-white" style="font-size: 2.5rem;"></i></div>`}
              <div class="mt-2 d-flex gap-2 justify-content-lg-end">
                <button class="btn btn-sm btn-outline-secondary rounded-pill edit-news-btn" data-uuid="${n.uuid}">
                  <i class="bi bi-pencil me-1"></i>Изменить
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill delete-news-btn" data-uuid="${n.uuid}">
                  <i class="bi bi-trash me-1"></i>Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ---- Пагинация ----
  function renderPagination(total, page) {
    const nav = document.getElementById(paginationId);
    if (!nav) return;
    totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) { nav.innerHTML = ''; return; }

    let html = '';
    html += `<button class="btn btn-sm btn-outline-secondary rounded-pill pagination-btn" data-page="${page - 1}" ${page <= 0 ? 'disabled' : ''}>&laquo; Назад</button>`;

    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible);
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);

    for (let i = start; i < end; i++) {
      html += `<button class="btn btn-sm rounded-pill ${i === page ? 'btn-dark' : 'btn-outline-dark'} pagination-btn" data-page="${i}">${i + 1}</button>`;
    }

    html += `<button class="btn btn-sm btn-outline-secondary rounded-pill pagination-btn" data-page="${page + 1}" ${page >= totalPages - 1 ? 'disabled' : ''}>Вперёд &raquo;</button>`;

    nav.innerHTML = html;
  }

  async function loadNews(page) {
    try {
      const { items, total } = await fetchNews(page);
      currentPage = page;
      renderNewsCards(items);
      renderPagination(total, page);
      bindCardButtons();
    } catch (e) {
      console.error('loadNews:', e);
      document.getElementById(newsListId).innerHTML =
        '<div class="alert alert-danger rounded-3">Не удалось загрузить новости</div>';
    }
  }

  // ---- Тип-пилюли ---- //
  function renderTypePills() {
    const pills = document.getElementById(newsTypePillsId);
    if (!pills) return;
    pills.innerHTML = NEWS_TYPES.map(t => `
      <button type="button" class="type-pill-btn" data-value="${t.value}">${t.label}</button>
    `).join('');

    const setActive = (val) => {
      selectedType = val;
      Array.from(pills.querySelectorAll('button')).forEach(b => {
        const isActive = b.getAttribute('data-value') === val;
        b.classList.toggle('active-type', isActive);
      });
      // Update preview badge
      updatePreviewBadge();
    };
    setActive(selectedType);

    pills.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => setActive(btn.getAttribute('data-value')));
    });
  }

  function updatePreviewBadge() {
    const badge = document.getElementById(previewBadgeId);
    if (!badge) return;
    const ti = typeInfo(selectedType);
    badge.textContent = ti.label;
    badge.style.background = ti.color;
  }

  // ---- Quill ----
  function initQuill() {
    if (window.Quill) {
      const globalIR = (window.ImageResize || window.QuillImageResizeModule || {});
      const ImageResizeCtor = globalIR.default || globalIR;
      if (typeof ImageResizeCtor === 'function') {
        window.Quill.register('modules/imageResize', ImageResizeCtor);
      }
    }
    quill = new Quill('#' + newsEditorId, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
  }

  // ---- Живой предпросмотр карточки ---- //
  function stripQuillFonts(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('*').forEach(el => {
      el.classList.forEach(cls => { if (/^ql-font-/.test(cls)) el.classList.remove(cls); });
      const style = el.getAttribute('style');
      if (style && /font-family/i.test(style)) {
        const cleaned = style.split(';').map(s => s.trim())
          .filter(s => s && !/^font-family\s*:/.test(s.toLowerCase())).join('; ');
        if (cleaned) el.setAttribute('style', cleaned); else el.removeAttribute('style');
      }
    });
    return temp.innerHTML;
  }

  function syncPreview() {
    const titleInput = document.getElementById(newsTitleId);
    const titleEl = document.getElementById(previewTitleId);
    const contentEl = document.getElementById(previewContentId);
    const dateEl = document.getElementById(previewDateId);

    if (titleEl && titleInput) {
      titleEl.textContent = (titleInput.value || '').trim() || 'Заголовок новости';
    }
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (contentEl && quill) {
      const html = quill.root.innerHTML || '';
      if (!html) {
        contentEl.innerHTML = '<p class="text-muted mb-0">Содержимое появится по мере ввода…</p>';
      } else {
        contentEl.innerHTML = stripQuillFonts(html);
      }
    }
  }

  function bindLivePreview() {
    const titleInput = document.getElementById(newsTitleId);
    if (titleInput) titleInput.addEventListener('input', syncPreview);
    if (quill) quill.on('text-change', syncPreview);
    syncPreview();
  }

  // ---- Модалка ----
  function showNewsModal(show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = show ? 'block' : 'none';
    modal.classList.toggle('show', !!show);
    if (show) {
      modal.style.background = 'rgba(0,0,0,0.55)';
      modal.style.backdropFilter = 'blur(4px)';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.zIndex = '1055';
      document.body.style.overflow = 'hidden';
    } else {
      modal.style.background = '';
      modal.style.backdropFilter = '';
      document.body.style.overflow = '';
    }
  }

  function resetSaveButton() {
    const saveBtn = document.getElementById(modalSaveId);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Сохранить';
    }
  }

  function resetModal(isEdit) {
    document.getElementById(editingUuidId).value = '';
    document.getElementById(modalTitleId).textContent = isEdit ? 'Редактирование новости' : 'Создание новости';
    document.getElementById(newsTitleId).value = '';
    selectedType = 'OTHER';
    renderTypePills();
    if (quill) quill.root.innerHTML = '';
    syncPreview();
  }

  function openCreateModal() {
    resetModal(false);
    resetMainPhoto();
    resetGallery();
    resetSaveButton();
    showNewsModal(true);
    setTimeout(() => bindLivePreview(), 0);
  }

  function openEditModal(newsItem) {
    resetModal(true);
    document.getElementById(editingUuidId).value = newsItem.uuid;
    document.getElementById(newsTitleId).value = newsItem.title || '';
    if (newsItem.type) {
      selectedType = newsItem.type;
      renderTypePills();
    }
    if (quill) {
      quill.root.innerHTML = newsItem.htmlContent || '';
    }
    if (newsItem.mainPhotoUrl) {
      setMainPhotoPreview(newsItem.mainPhotoUrl);
    } else {
      resetMainPhoto();
    }
    galleryPhotos = Array.isArray(newsItem.galleryPhotos) ? [...newsItem.galleryPhotos] : [];
    renderGalleryThumbs();
    showNewsModal(true);
    setTimeout(() => bindLivePreview(), 0);
  }

  // ---- Сохранение ----
  async function handleSave() {
    const saveBtn = document.getElementById(modalSaveId);
    if (!saveBtn || saveBtn.disabled) return;

    const uuid = document.getElementById(editingUuidId).value || null;
    const title = document.getElementById(newsTitleId).value.trim();
    const htmlContent = quill ? quill.root.innerHTML : '';

    if (!title) {
      alert('Введите заголовок новости');
      return;
    }

    const payload = { title, htmlContent, type: selectedType, mainPhotoUrl: mainPhotoUrl || null, galleryPhotos: galleryPhotos.length ? galleryPhotos : null };
    if (uuid) payload.uuid = uuid;

    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Сохранение…';

    try {
      await saveNewsToServer(payload);
      resetSaveButton();
      showNewsModal(false);
      loadNews(currentPage);
    } catch (e) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
      alert('Ошибка: ' + e.message);
    }
  }

  // ---- Удаление ----
  async function handleDelete(uuid) {
    if (!confirm('Удалить эту новость?')) return;
    try {
      await deleteNewsFromServer(uuid);
      const { total } = await fetchNews(currentPage);
      if (currentPage > 0 && total <= currentPage * pageSize) currentPage--;
      loadNews(currentPage);
    } catch (e) {
      alert('Ошибка удаления: ' + e.message);
    }
  }



  // ---- Модалка просмотра ----
  function showViewModal(show) {
    const modal = document.getElementById('view-news-modal');
    if (!modal) return;
    modal.style.display = show ? 'block' : 'none';
    modal.classList.toggle('show', !!show);
    if (show) {
      modal.style.background = 'rgba(0,0,0,0.55)';
      modal.style.backdropFilter = 'blur(4px)';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.zIndex = '1055';
      document.body.style.overflow = 'hidden';
    } else {
      modal.style.background = '';
      modal.style.backdropFilter = '';
      document.body.style.overflow = '';
    }
  }

  function openViewModal(newsItem) {
    const ti = typeInfo(newsItem.type);
    document.getElementById('view-news-type-badge').textContent = ti.label;
    document.getElementById('view-news-type-badge').style.background = ti.color;
    document.getElementById('view-news-title').textContent = newsItem.title;
    document.getElementById('view-news-date').innerHTML = '<i class="bi bi-calendar me-1"></i>' + formatDate(newsItem.updatedAt || newsItem.createdAt);
    document.getElementById('view-news-content').innerHTML = newsItem.htmlContent || '<p class="text-muted">Нет содержимого</p>';

    const mainPhotoWrap = document.getElementById('view-news-main-photo');
    const mainPhotoImg = document.getElementById('view-news-main-photo-img');
    if (newsItem.mainPhotoUrl) {
      mainPhotoImg.src = cdnUrl(newsItem.mainPhotoUrl);
      mainPhotoWrap.style.display = '';
    } else {
      mainPhotoWrap.style.display = 'none';
    }

    const galleryWrap = document.getElementById('view-news-gallery');
    const galleryGrid = document.getElementById('view-news-gallery-grid');
    if (newsItem.galleryPhotos && newsItem.galleryPhotos.length > 0) {
      galleryWrap.style.display = '';
      galleryGrid.innerHTML = newsItem.galleryPhotos.map((url, i) => `
        <div class="col-6 col-md-4 col-lg-3">
          <img src="${cdnUrl(url)}" class="img-fluid rounded-3 shadow-sm gallery-view-thumb"
               data-idx="${i}" data-urls="${newsItem.galleryPhotos.map(u => cdnUrl(u)).join('|||')}"
               style="width:100%; height:180px; object-fit:cover; cursor:pointer; transition: transform 0.2s;"
               alt="Фото ${i+1}"
               onmouseover="this.style.transform='scale(1.03)'"
               onmouseout="this.style.transform='scale(1)'" />
        </div>
      `).join('');
      galleryGrid.querySelectorAll('.gallery-view-thumb').forEach(img => {
        img.addEventListener('click', () => {
          const urls = img.getAttribute('data-urls').split('|||');
          const idx = parseInt(img.getAttribute('data-idx'));
          openLightbox(urls, idx);
        });
      });
    } else {
      galleryWrap.style.display = 'none';
    }

    showViewModal(true);
  }

  // ---- Лайтбокс ----
  let currentLightboxUrls = [];

  function initLightbox() {
    if (document.getElementById('gallery-lightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'gallery-lightbox';
    lb.innerHTML = `
      <button class="lightbox-close">&times;</button>
      <button class="lightbox-prev">&lsaquo;</button>
      <img src="" alt="" />
      <button class="lightbox-next">&rsaquo;</button>
    `;
    document.body.appendChild(lb);

    const close = () => { lb.style.display = 'none'; document.body.style.overflow = ''; };
    lb.querySelector('.lightbox-close').addEventListener('click', close);
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lb.style.display === 'flex') close();
      if (lb.style.display === 'flex') {
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
      }
    });
    lb.querySelector('.lightbox-prev').addEventListener('click', () => navigateLightbox(-1));
    lb.querySelector('.lightbox-next').addEventListener('click', () => navigateLightbox(1));
  }

  function openLightbox(urls, idx) {
    if (Array.isArray(urls)) {
      currentLightboxUrls = urls;
      lightboxIdx = idx;
    }
    const lb = document.getElementById('gallery-lightbox');
    if (!lb || currentLightboxUrls.length === 0) return;
    lb.querySelector('img').src = currentLightboxUrls[lightboxIdx];
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function navigateLightbox(delta) {
    if (currentLightboxUrls.length === 0) return;
    lightboxIdx = (lightboxIdx + delta + currentLightboxUrls.length) % currentLightboxUrls.length;
    const lb = document.getElementById('gallery-lightbox');
    if (lb) lb.querySelector('img').src = currentLightboxUrls[lightboxIdx];
  }
  function bindCardButtons() {
    document.querySelectorAll('.news-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('button')) return;
        const uuid = card.getAttribute('data-uuid');
        try {
          const resp = await fetch('/api/news/' + uuid);
          if (!resp.ok) throw new Error('Новость не найдена');
          openViewModal(await resp.json());
        } catch (err) { console.error(err); }
      });
      card.style.cursor = 'pointer';
    });

    document.querySelectorAll('.edit-news-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uuid = btn.getAttribute('data-uuid');
        try {
          const resp = await fetch('/api/news/' + uuid);
          if (!resp.ok) throw new Error('Новость не найдена');
          openEditModal(await resp.json());
        } catch (e) {
          alert('Ошибка: ' + e.message);
        }
      });
    });
    document.querySelectorAll('.delete-news-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn.getAttribute('data-uuid')));
    });
  }

  // ---- Инициализация ----
  function bindUi() {
    const root = document.getElementById(PAGE_ID);
    if (!root) return;

    initQuill();
    loadNews(0);

    document.getElementById(openCreateBtnId)?.addEventListener('click', openCreateModal);
    document.getElementById(modalCloseId)?.addEventListener('click', () => showNewsModal(false));
    document.getElementById(modalCancelId)?.addEventListener('click', () => showNewsModal(false));
    document.getElementById(modalSaveId)?.addEventListener('click', handleSave);

    // Клик по backdrop закрывает модалку
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) showNewsModal(false);
      });
    }

    // Пагинация
    const pagNav = document.getElementById(paginationId);
    if (pagNav) {
      pagNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.pagination-btn');
        if (!btn || btn.disabled) return;
        const page = parseInt(btn.getAttribute('data-page'));
        if (!isNaN(page) && page >= 0 && page < totalPages) {
          loadNews(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // --- Основная фотография ---
    const mainPhotoZone = document.getElementById('main-photo-upload-zone');
    const mainPhotoInput = document.getElementById('main-photo-input');
    const mainPhotoRemove = document.getElementById('main-photo-remove');
    if (mainPhotoZone && mainPhotoInput) {
      mainPhotoZone.addEventListener('click', (e) => {
        if (e.target === mainPhotoRemove || e.target.closest('#main-photo-remove')) return;
        mainPhotoInput.click();
      });
      mainPhotoZone.addEventListener('dragover', (e) => { e.preventDefault(); mainPhotoZone.style.borderColor = '#FB820A'; });
      mainPhotoZone.addEventListener('dragleave', () => { mainPhotoZone.style.borderColor = '#d0d0d0'; });
      mainPhotoZone.addEventListener('drop', (e) => {
        e.preventDefault();
        mainPhotoZone.style.borderColor = '#d0d0d0';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleMainPhotoFile(file);
      });
      mainPhotoInput.addEventListener('change', () => {
        if (mainPhotoInput.files[0]) handleMainPhotoFile(mainPhotoInput.files[0]);
        mainPhotoInput.value = '';
      });
    }
    if (mainPhotoRemove) {
      mainPhotoRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        resetMainPhoto();
      });
    }

    // --- Галерея ---
    const galleryZone = document.getElementById('gallery-upload-zone');
    const galleryInput = document.getElementById('gallery-photos-input');
    if (galleryZone && galleryInput) {
      galleryZone.addEventListener('click', () => galleryInput.click());
      galleryZone.addEventListener('dragover', (e) => { e.preventDefault(); galleryZone.style.borderColor = '#FB820A'; });
      galleryZone.addEventListener('dragleave', () => { galleryZone.style.borderColor = '#d0d0d0'; });
      galleryZone.addEventListener('drop', (e) => {
        e.preventDefault();
        galleryZone.style.borderColor = '#d0d0d0';
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length) handleGalleryFiles(files);
      });
      galleryInput.addEventListener('change', () => {
        if (galleryInput.files.length) handleGalleryFiles(Array.from(galleryInput.files));
        galleryInput.value = '';
      });
    }

    // --- Модалка просмотра ---
    initLightbox();
    document.getElementById('view-news-close')?.addEventListener('click', () => showViewModal(false));
    const viewModalEl = document.getElementById('view-news-modal');
    if (viewModalEl) {
      viewModalEl.addEventListener('click', (e) => { if (e.target === viewModalEl) showViewModal(false); });
    }

    // Escape закрывает модалки
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const viewModal = document.getElementById('view-news-modal');
        if (viewModal && viewModal.classList.contains('show')) showViewModal(false);
        if (modal && modal.classList.contains('show')) showNewsModal(false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bindUi);
})();
