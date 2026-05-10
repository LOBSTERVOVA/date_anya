// Публичная страница кружков и секций — просмотр с пагинацией
// Используется для страниц /community/sports-sections и /community/science-clubs
//
// Ожидает глобальные переменные (задаются в Thymeleaf-шаблоне):
//   window.__clubType = 'SPORTS_CLUB' | 'SCIENCE_CLUB'
//   window.__clubPageTitle = 'Спортивные секции' | 'Научные кружки'

(function () {
  'use strict';

  const PAGE_SIZE = 12;
  let currentPage = 0;
  let totalPages = 0;

  // Цвета и иконки по типу
  const TYPE_CONFIG = {
    SPORTS_CLUB: {
      accent: '#22c55e',
      accentLight: '#f0fdf4',
      icon: 'bi-trophy-fill',
      badge: 'Секция',
      badgeClass: 'bg-success',
    },
    SCIENCE_CLUB: {
      accent: '#3b82f6',
      accentLight: '#eff6ff',
      icon: 'bi-mortarboard-fill',
      badge: 'Кружок',
      badgeClass: 'bg-primary',
    },
  };

  const DAY_NAMES = ['', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

  // ====================== API ======================

  function fetchClubs(type, page) {
    return $.ajax({
      url: '/api/club',
      type: 'GET',
      dataType: 'json',
      data: { type, page, size: PAGE_SIZE },
    });
  }

  // ====================== Рендеринг ======================

  function renderCard(club) {
    const cfg = TYPE_CONFIG[club.type] || TYPE_CONFIG.SCIENCE_CLUB;
    const avatarUrl = club.avatar ? ((typeof cdn !== 'undefined' ? cdn : '') + club.avatar) : null;

    // Расписание: группируем дни по одинаковому времени
    let scheduleHtml = '';
    let daysCount = 0;
    if (club.schedules && club.schedules.length > 0) {
      const byTime = new Map(); // ключ "HH:MM–HH:MM" → Set<номер дня>
      club.schedules.forEach((s) => {
        const st = (s.startTime || '').replace(/:00$/, '');
        const et = (s.endTime || '').replace(/:00$/, '');
        const key = st && et ? `${st}–${et}` : '—';
        if (!byTime.has(key)) byTime.set(key, new Set());
        byTime.get(key).add(s.dayOfWeek);
      });
      const uniqueDays = new Set(club.schedules.map((s) => s.dayOfWeek));
      daysCount = uniqueDays.size;

      const rows = [];
      byTime.forEach((daySet, timeKey) => {
        const sorted = Array.from(daySet).sort((a, b) => a - b);
        const dayNames = sorted.map((d) => DAY_NAMES[d] || '—').join(', ');
        const minDay = sorted[0];
        rows.push({ days: dayNames, time: timeKey, minDay: minDay });
      });
      rows.sort((a, b) => a.minDay - b.minDay);

      scheduleHtml = rows
        .map((r) => `<div class="mb-1"><span class="text-secondary">${r.days}</span> — ${r.time}</div>`)
        .join('');
    }

    // Плашка «N дней в неделю»
    let daysBadgeHtml = '';
    if (daysCount > 0) {
      const word = daysCount === 1 ? 'день' : daysCount < 5 ? 'дня' : 'дней';
      daysBadgeHtml = `<span class="badge bg-dark bg-opacity-50 me-1" style="backdrop-filter: blur(4px)">${daysCount} ${word} в неделю</span>`;
    }

    // Аудитории
    let roomsHtml = '';
    if (club.rooms && club.rooms.length > 0) {
      const badges = Array.from(club.rooms)
        .map((r) => `<span class="badge bg-light text-dark border me-1 mb-1">${r.title}</span>`)
        .join('');
      roomsHtml = `<div class="mt-2">${badges}</div>`;
    }

    // Описание — обрезаем до ~120 символов
    const desc = club.description || '';
    const descShort = desc.length > 150 ? desc.substring(0, 150) + '…' : desc;
    const descFull = desc.length > 150 ? desc : '';

    // Фото или градиентный плейсхолдер
    const imageSection = avatarUrl
      ? `<div class="club-card-img" style="background-image: url('${avatarUrl}')"></div>`
      : `<div class="club-card-img club-card-img-placeholder" style="background: linear-gradient(135deg, ${cfg.accentLight}, #f8f9fa)">
           <i class="bi ${cfg.icon}" style="font-size: 48px; color: ${cfg.accent}; opacity: 0.5"></i>
         </div>`;

    return `
      <div class="col">
        <div class="card h-100 border-0 shadow-sm club-card overflow-hidden" style="transition: transform 0.2s ease, box-shadow 0.2s ease;">
          <!-- Фото-секция с оверлеем -->
          <div class="club-card-top position-relative" style="height: 180px; overflow: hidden;">
            ${imageSection}
            <div class="club-card-overlay position-absolute top-0 start-0 w-100 h-100"
                 style="background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.05) 100%)"></div>
            <!-- Бейдж типа -->
            <span class="badge ${cfg.badgeClass} position-absolute top-0 end-0 m-2" style="z-index:2">${cfg.badge}</span>
            <!-- Плашка дней -->
            ${daysBadgeHtml ? `<span class="position-absolute top-0 start-0 m-2" style="z-index:2">${daysBadgeHtml}</span>` : ''}
            <!-- Текст поверх -->
            <div class="position-absolute bottom-0 start-0 w-100 p-3" style="z-index:1">
              <h5 class="text-white fw-bold mb-1 text-truncate">${escapeHtml(club.name)}</h5>
              ${club.departmentName
                ? `<div class="text-white-50 small text-truncate" title="${escapeHtml(club.departmentName)}">
                    <i class="bi bi-building me-1"></i>${escapeHtml(club.departmentName)}
                  </div>`
                : ''}
            </div>
          </div>

          <!-- Нижняя часть: описание + расписание + аудитории -->
          <div class="card-body d-flex flex-column">
            ${desc
              ? `<div class="text-secondary small mb-2 flex-grow-1">
                  <span class="desc-short">${escapeHtml(descShort)}</span>
                  ${descFull ? `<span class="desc-full d-none">${escapeHtml(descFull)}</span>` : ''}
                  ${descFull ? `<button class="btn btn-link btn-sm p-0 desc-toggle" style="font-size:12px; color:${cfg.accent}">ещё</button>` : ''}
                </div>`
              : '<div class="flex-grow-1"></div>'}

            ${scheduleHtml ? `
              <div class="mt-2">
                <small class="text-secondary fw-semibold">Расписание</small>
                <div class="mt-1">${scheduleHtml}</div>
              </div>` : ''}
            ${roomsHtml}
          </div>
        </div>
      </div>`;
  }

  function renderPagination() {
    if (totalPages <= 1) return '';

    let items = '';
    const maxVisible = 7;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible);
    if (endPage - startPage < maxVisible) {
      startPage = Math.max(0, endPage - maxVisible);
    }

    if (startPage > 0) {
      items += `<li class="page-item"><button class="page-link page-btn" data-page="0">1</button></li>`;
      if (startPage > 1) {
        items += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      }
    }

    for (let i = startPage; i < endPage; i++) {
      items += `<li class="page-item ${i === currentPage ? 'active' : ''}">
        <button class="page-link page-btn" data-page="${i}">${i + 1}</button>
      </li>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      }
      items += `<li class="page-item"><button class="page-link page-btn" data-page="${totalPages - 1}">${totalPages}</button></li>`;
    }

    return `
      <nav class="mt-4" aria-label="Навигация по страницам">
        <ul class="pagination justify-content-center mb-0">
          <li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
            <button class="page-link page-btn" data-page="${currentPage - 1}" ${currentPage === 0 ? 'disabled' : ''}>
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>
          ${items}
          <li class="page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}">
            <button class="page-link page-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>`;
  }

  function renderPage(data) {
    currentPage = data.page;
    totalPages = data.totalPages;
    const container = document.getElementById('clubs-grid');

    if (!data.content || data.content.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-inbox display-1 text-secondary opacity-50"></i>
          <p class="mt-3 text-secondary">Пока ничего нет</p>
        </div>`;
    } else {
      container.innerHTML = data.content.map(renderCard).join('');
    }

    // Пагинация
    const pagContainer = document.getElementById('clubs-pagination');
    if (pagContainer) {
      pagContainer.innerHTML = renderPagination();
      // Обработчики кнопок пагинации
      pagContainer.querySelectorAll('.page-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
          const page = parseInt(this.dataset.page, 10);
          if (!isNaN(page) && page >= 0 && page < totalPages) {
            loadPage(page);
          }
        });
      });
    }

    // Обработчики «ещё» для описаний
    container.querySelectorAll('.desc-toggle').forEach((btn) => {
      btn.addEventListener('click', function () {
        const parent = this.parentElement;
        const short = parent.querySelector('.desc-short');
        const full = parent.querySelector('.desc-full');
        if (full.classList.contains('d-none')) {
          short.classList.add('d-none');
          full.classList.remove('d-none');
          this.textContent = 'свернуть';
        } else {
          short.classList.remove('d-none');
          full.classList.add('d-none');
          this.textContent = 'ещё';
        }
      });
    });

    // Прокрутка наверх
    document.getElementById('clubs-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ====================== Загрузка ======================

  function showLoading() {
    document.getElementById('clubs-grid').innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-secondary" role="status">
          <span class="visually-hidden">Загрузка…</span>
        </div>
      </div>`;
  }

  function showError(msg) {
    document.getElementById('clubs-grid').innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-triangle display-1 text-warning opacity-50"></i>
        <p class="mt-3 text-secondary">${escapeHtml(msg)}</p>
        <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">Попробовать снова</button>
      </div>`;
  }

  function loadPage(page) {
    currentPage = page;
    showLoading();
    const type = window.__clubType || 'SCIENCE_CLUB';

    fetchClubs(type, page)
      .done(renderPage)
      .fail(function (xhr) {
        const msg = xhr && xhr.responseJSON && xhr.responseJSON.message
          ? xhr.responseJSON.message
          : 'Не удалось загрузить данные';
        showError(msg);
      });
  }

  // ====================== Утилиты ======================

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ====================== Инициализация ======================

  function init() {
    const type = window.__clubType || 'SCIENCE_CLUB';
    const title = window.__clubPageTitle || (type === 'SPORTS_CLUB' ? 'Спортивные секции' : 'Научные кружки');
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.SCIENCE_CLUB;

    // Внедряем HTML
    const root = document.getElementById('clubs-root');
    if (!root) return;

    root.innerHTML = `
      <div id="clubs-section">
        <!-- Заголовок -->
        <div class="text-center mb-4">
          <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
               style="width:64px; height:64px; background: ${cfg.accentLight}; color: ${cfg.accent}; font-size: 28px;">
            <i class="bi ${cfg.icon}"></i>
          </div>
          <h2 class="fw-bold">${escapeHtml(title)}</h2>
          <p class="text-secondary">
            ${type === 'SPORTS_CLUB'
              ? 'Спортивные секции, доступные студентам университета'
              : 'Научные кружки и исследовательские объединения'}
          </p>
        </div>

        <!-- Сетка карточек -->
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3" id="clubs-grid">
          <!-- Заполняется JS -->
        </div>

        <!-- Пагинация -->
        <div id="clubs-pagination"></div>
      </div>

      <style>
        .club-card {
          border-radius: 12px;
        }
        .club-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0.75rem 1.5rem rgba(0,0,0,0.12) !important;
        }
        .club-card:hover .club-card-img {
          transform: scale(1.05);
        }
        .club-card-img {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background-size: cover;
          background-position: center;
          transition: transform 0.4s ease;
        }
        .club-card-img-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .club-card-top {
          border-radius: 12px 12px 0 0;
        }
        .page-link {
          border-radius: 8px;
          margin: 0 2px;
          border: none;
          color: #6b7280;
          background: transparent;
        }
        .page-item.active .page-link {
          background-color: ${cfg.accent};
          border-color: ${cfg.accent};
          color: #fff;
        }
        .page-link:hover {
          background-color: ${cfg.accentLight};
          color: ${cfg.accent};
        }
      </style>
    `;

    // Загружаем первую страницу
    loadPage(0);
  }

  // Запуск при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
