// Front-end only news page logic
// - Renders a mock list of news
// - Opens a modal to create a news item
// - Initializes a Quill editor with fonts, sizes, alignment, images, links
// Implementation intentionally uses innerHTML-based rendering for readability

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
  const phonePreviewId = 'news-phone-preview';

  // Local state (front-end only)
  let quill = null;

  // Predefined news types for user-friendly pill selector
  const NEWS_TYPES = [
    { value: 'APP_UPDATE', label: 'Обновление приложения' },
    { value: 'NEW_SECTION', label: 'Новая секция' },
    { value: 'NEW_SCIENCE_CLUB', label: 'Новый научный кружок' },
    { value: 'NEW_LECTURER', label: 'Новый преподаватель' },
    { value: 'TRAGIC_EVENT', label: 'Трагическое событие' },
    { value: 'SPORT_ACHIEVEMENT', label: 'Спортивные достижения' },
    { value: 'SPORT_EVENT', label: 'Спортивное мероприятие' },
    { value: 'OTHER', label: 'Прочее' },
  ];

  // Render a few placeholder news cards for viewing
  function renderNewsList() {
    const wrap = document.getElementById(newsListId);
    if (!wrap) return;
    // Using innerHTML for clarity; in real app this would be a fetch to server
    wrap.innerHTML = [
      {
        title: 'Запуск новой версии расписания',
        type: 'APP_UPDATE',
        dateString: '2025-10-01',
        html: '<p>Новая версия приложения расписания с улучшенной навигацией и поиском.</p>'
      },
      {
        title: 'Открыт научный кружок по ИИ',
        type: 'NEW_SCIENCE_CLUB',
        dateString: '2025-10-03',
        html: '<p>Приглашаем студентов на встречи по машинному обучению. Подробности внутри.</p>'
      },
    ].map((n) => {
      const type = NEWS_TYPES.find(t => t.value === n.type)?.label || 'Новость';
      return `
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between">
              <h5 class="card-title m-0">${n.title}</h5>
              <span class="badge text-bg-secondary fs-5 fw-normal">${type}</span>
            </div>
            <div class="text-muted small mb-2">${n.dateString}</div>
            <div class="card-text">${n.html}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Build clickable pill buttons synced with the select
  function renderTypePills() {
    const pills = document.getElementById(newsTypePillsId);
    if (!pills) return;

    pills.innerHTML = NEWS_TYPES.map(t => `
      <button type="button" class="btn btn-outline-secondary btn-sm roboto-font" data-value="${t.value}">${t.label}</button>
    `).join('');

    // Initial active state from select
    let selected = 'OTHER';
    const setActive = (val) => {
      Array.from(pills.querySelectorAll('button')).forEach(b => {
        const active = b.getAttribute('data-value') === val;
        b.classList.toggle('btn-secondary', active);
        b.classList.toggle('btn-outline-secondary', !active);
      });
    };
    setActive(selected);

    // Click handler: update select and button styles
    pills.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-value');
        selected = v;
        setActive(selected);
      });
    });
  }

  // Initialize Quill with fonts, sizes, alignment, image, link
  function initQuill() {
    // Register image resize module if available (handle different UMD/global shapes)
    if (window.Quill) {
      const globalIR = (window.ImageResize || window.QuillImageResizeModule || {});
      const ImageResizeCtor = globalIR.default || globalIR; // some builds expose .default
      if (typeof ImageResizeCtor === 'function') {
        window.Quill.register('modules/imageResize', ImageResizeCtor);
      }
    }
    const toolbar = [
      [{ header: [1, 2, 3, false] }],
      [{ font: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ align: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean']
    ];
    const modulesCfg = { toolbar };
    // Add imageResize config only if registered
    if (window.Quill && window.Quill.import && (window.Quill.import('modules/imageResize') || null)) {
      modulesCfg.imageResize = { modules: ['Resize', 'DisplaySize', 'Toolbar'] };
    }
    quill = new Quill('#' + newsEditorId, { theme: 'snow', modules: modulesCfg });
  }

  // Live preview: sync title and content into the phone preview area
  function bindLivePreview() {
    const preview = document.getElementById(phonePreviewId);
    const titleInput = document.getElementById(newsTitleId);
    if (!preview || !titleInput || !quill) return;
    const titleEl = preview.querySelector('.preview-title');
    const contentEl = preview.querySelector('.preview-content');
    if (!titleEl || !contentEl) return;

    const updateTitle = () => {
      const t = (titleInput.value || '').trim();
      titleEl.textContent = t || 'Заголовок новости';
    };
    const updateContent = () => {
      // Take Quill rendered HTML
      const html = quill.root.innerHTML || '';
      if (!html) {
        contentEl.innerHTML = '<p class="mb-0 text-muted">Содержимое появится по мере ввода...</p>';
        return;
      }
      // Create a sandbox to safely adjust HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      // Walk all nodes and strip font families while preserving other formatting
      temp.querySelectorAll('*').forEach(el => {
        // Remove any ql-font-* classes
        el.classList.forEach(cls => {
          if (/^ql-font-/.test(cls)) el.classList.remove(cls);
        });
        // Remove inline font-family from style attribute, keep other styles
        const style = el.getAttribute('style');
        if (style && /font-family/i.test(style)) {
          // split by ; and rebuild without font-family
          const cleaned = style
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !/^font-family\s*:/.test(s.toLowerCase()))
            .join('; ');
          if (cleaned) el.setAttribute('style', cleaned);
          else el.removeAttribute('style');
        }
      });
      contentEl.innerHTML = temp.innerHTML;
    };

    // Initial paint
    updateTitle();
    updateContent();

    // Bind events
    titleInput.addEventListener('input', updateTitle);
    quill.on('text-change', updateContent);
  }

  // Simple modal controls without Bootstrap instance (mirror of other pages style)
  function showNewsModal(show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = show ? 'block' : 'none';
    modal.classList.toggle('show', !!show);
    if (show) {
      modal.style.background = 'rgba(0,0,0,0.5)';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      const dialog = modal.querySelector('.modal-dialog');
      if (dialog) dialog.style.marginTop = '8vh';
    } else {
      modal.style.background = '';
    }
  }

  function bindUi() {
    const root = document.getElementById(PAGE_ID);
    if (!root) return;

    // Render initial list
    renderNewsList();

    // Build type pills
    renderTypePills();

    // Init editor
    initQuill();
    // Bind live preview after Quill is ready
    bindLivePreview();

    // Hook buttons
    const openBtn = document.getElementById(openCreateBtnId);
    const closeBtn = document.getElementById(modalCloseId);
    const cancelBtn = document.getElementById(modalCancelId);
    if (openBtn) openBtn.addEventListener('click', () => {
      showNewsModal(true);
      // Ensure preview reflects current inputs when opening
      setTimeout(() => bindLivePreview(), 0);
    });
    if (closeBtn) closeBtn.addEventListener('click', () => showNewsModal(false));
    if (cancelBtn) cancelBtn.addEventListener('click', () => showNewsModal(false));

    // Note: save button remains disabled as per task (no persistence yet)
  }

  document.addEventListener('DOMContentLoaded', bindUi);
})();
