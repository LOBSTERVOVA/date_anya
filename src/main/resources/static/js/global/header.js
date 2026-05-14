/**
 * header.js — полная отрисовка хедера (навбар + модалка логина) через JS.
 * Читает глобальные переменные: window.auth, window.user, window.csrf, window.cdn.
 * Активный пункт меню определяется по текущему URL (pathname).
 */
(function () {
    'use strict';

    // ========== CSS-стили хедера ==========
    const styles = `
        #mainHeader {
            background: rgba(255,255,255,.88);
            backdrop-filter: saturate(180%) blur(16px);
            -webkit-backdrop-filter: saturate(180%) blur(16px);
            border-bottom: 1px solid rgba(0,0,0,.06);
        }
        #mainHeader .navbar-brand { text-decoration: none; }
        #mainHeader .nav-link {
            color: #4b5563;
            font-size: .925rem;
            transition: color .2s, background .2s;
            letter-spacing: -.01em;
        }
        #mainHeader .nav-link:hover {
            color: #2563eb;
            background: rgba(37,99,235,.06);
        }
        #mainHeader .nav-link.active {
            color: #2563eb !important;
            background: rgba(37,99,235,.1);
            font-weight: 600;
        }
        #mainHeader .dropdown-item {
            font-size: .9rem;
            color: #374151;
            transition: background .15s;
        }
        #mainHeader .dropdown-item:hover {
            background: rgba(37,99,235,.06);
            color: #2563eb;
        }
        #mainHeader .dropdown-item i { font-size: 1rem; width: 20px; text-align: center; }
        .user-avatar {
            transition: transform .2s;
            user-select: none;
        }
        #user-avatar-btn:hover .user-avatar {
            transform: scale(1.08);
        }
        @media (max-width: 991.98px) {
            #mainHeader .navbar-collapse {
                background: #fff;
                border-radius: 1rem;
                padding: .5rem;
                margin-top: .5rem;
                box-shadow: 0 8px 32px rgba(0,0,0,.12);
            }
        }
    `;

    // ========== Определение активной страницы ==========
    function getActive() {
        const path = window.location.pathname;
        if (path.startsWith('/schedule')) return 'schedule';
        if (path.startsWith('/workload')) return 'workload';
        if (path.startsWith('/news')) return 'news';
        if (path.startsWith('/departments-lecturers') || path.startsWith('/departments')) return 'departments-lecturers';
        if (path.startsWith('/community')) return 'community';
        if (path.startsWith('/reference')) return 'reference';
        return '';
    }

    // ========== Nav-ссылки ==========
    function navLink(href, icon, label, active) {
        const isActive = active === href.replace(/^\/community.*/, 'community');
        const activeCls = isActive ? ' active' : '';
        // href нужно вычислить: для community без под-пути используем #
        const target = href.startsWith('/community') ? '#' : href;
        return `
            <a class="nav-link px-3 py-2 rounded-pill fw-medium${activeCls}"
               ${target === '#' ? 'role="button" data-bs-toggle="dropdown" aria-expanded="false"' : ''}
               href="${target}">
                <i class="bi bi-${icon} me-1 d-lg-none"></i>${label}
            </a>`;
    }

    // ========== Рендер HTML хедера ==========
    function renderHeader() {
        const auth = window.auth === true;
        const appUser = window.user;
        const active = getActive();

        // Данные пользователя
        let initials = '?';
        let displayName = '';
        let fullName = '';
        let roleLabel = '';

        if (appUser && appUser.username) {
            const fn = appUser.firstName || '';
            const ln = appUser.lastName || '';
            initials = (ln.charAt(0) + fn.charAt(0)).toUpperCase() || '?';
            displayName = (ln && fn) ? `${ln} ${fn.charAt(0)}.` : appUser.username;
            fullName = `${ln} ${fn}` + (appUser.patronymic ? ` ${appUser.patronymic}` : '');
            const roleMap = {
                ADMIN: 'Администратор',
                MODERATOR: 'Модератор',
                DEPARTMENT_ADMIN: 'Админ кафедры',
                LECTURER: 'Преподаватель',
                STUDENT: 'Студент'
            };
            roleLabel = roleMap[appUser.role] || appUser.role || '';
        }

        return `
        <nav class="navbar navbar-expand-lg fixed-top shadow-sm" id="mainHeader">
          <div class="container">
            <!-- Логотип -->
            <a class="navbar-brand d-flex align-items-center gap-2 me-4" href="/schedule">
              <div class="brand-icon rounded-3 d-flex align-items-center justify-content-center"
                   style="width:42px;height:42px;background:linear-gradient(135deg,#2563eb,#1d4ed8);">
                <i class="bi bi-building text-white fs-5"></i>
              </div>
              <div class="d-flex flex-column lh-sm">
                <span class="fw-bold text-dark" style="font-size:1.05rem;">Российский</span>
                <span class="text-muted" style="font-size:.7rem;">университет спорта</span>
              </div>
            </a>

            <!-- Бургер -->
            <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse"
                    data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Меню">
              <span class="navbar-toggler-icon"></span>
            </button>

            <!-- Навигация -->
            <div class="collapse navbar-collapse" id="mainNavbar">
              <ul class="navbar-nav align-items-lg-center gap-lg-1 ms-auto">
                <li class="nav-item">
                  ${navLink('/schedule', 'calendar-week', 'Расписание', active)}
                </li>
                <li class="nav-item">
                  ${navLink('/workload', 'graph-up', 'Нагрузка', active)}
                </li>
                <li class="nav-item">
                  ${navLink('/news', 'newspaper', 'Новости', active)}
                </li>
                <li class="nav-item">
                  ${navLink('/departments-lecturers', 'people', 'Кафедры', active)}
                </li>
                <li class="nav-item dropdown">
                  <a class="nav-link px-3 py-2 rounded-pill fw-medium dropdown-toggle${active === 'community' ? ' active' : ''}"
                     href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-people-fill me-1 d-lg-none"></i>Сообщество
                  </a>
                  <ul class="dropdown-menu dropdown-menu-end border-0 shadow-lg rounded-4 mt-2 p-2">
                    <li><a class="dropdown-item rounded-3 py-2 px-3" href="/community/sports-sections"><i class="bi bi-trophy me-2 text-primary"></i>Спортивные секции</a></li>
                    <li><a class="dropdown-item rounded-3 py-2 px-3" href="/community/science-clubs"><i class="bi bi-lightbulb me-2 text-warning"></i>Научные кружки</a></li>
                    <li><a class="dropdown-item rounded-3 py-2 px-3" href="/community/sport-events"><i class="bi bi-calendar-event me-2 text-success"></i>Спортивные мероприятия</a></li>
                    <li><hr class="dropdown-divider my-1" /></li>
                    <li><a class="dropdown-item rounded-3 py-2 px-3" href="/community/canteen-menu"><i class="bi bi-cup-hot me-2 text-danger"></i>Меню столовой</a></li>
                  </ul>
                </li>
                <li class="nav-item">
                  ${navLink('/reference', 'info-circle', 'Справка', active)}
                </li>
              </ul>

              <!-- Блок авторизации -->
              <div class="d-flex align-items-center ms-lg-3 mt-2 mt-lg-0">
                ${auth ? `
                <!-- Залогинен: аватарка + меню -->
                <div class="dropdown" id="header-user-menu">
                  <button class="btn btn-link text-decoration-none p-0 d-flex align-items-center gap-2 dropdown-toggle"
                          type="button" data-bs-toggle="dropdown" aria-expanded="false" id="user-avatar-btn">
                    <div class="user-avatar rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                         id="user-avatar-circle"
                         style="width:38px; height:38px; background:linear-gradient(135deg,#2563eb,#1d4ed8); font-size:0.85rem;">
                      ${initials}
                    </div>
                    <span class="d-none d-md-inline text-dark fw-medium" id="user-display-name" style="font-size:.9rem;">
                      ${displayName}
                    </span>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end border-0 shadow-lg rounded-3 mt-2 p-2" style="min-width:200px;">
                    <li>
                      <div class="px-3 py-2">
                        <div class="fw-medium text-dark" id="user-full-name-dropdown">${fullName}</div>
                        <div class="text-muted small" id="user-role-dropdown">${roleLabel}</div>
                      </div>
                    </li>
                    <li><hr class="dropdown-divider my-1" /></li>
                    <li>
                      <form action="/logout" method="post" class="m-0">
                        <input type="hidden" name="_csrf" value="${(window.csrf && window.csrf.token) || ''}" />
                        <button type="submit" class="dropdown-item rounded-3 py-2 px-3 text-danger">
                          <i class="bi bi-box-arrow-right me-2"></i>Выйти
                        </button>
                      </form>
                    </li>
                  </ul>
                </div>
                ` : `
                <!-- НЕ залогинен: кнопка Войти -->
                <div class="w-100 d-flex justify-content-lg-end">
                  <button class="btn btn-primary rounded-pill px-3 py-1 d-flex align-items-center gap-2" id="header-login-btn"
                          data-bs-toggle="modal" data-bs-target="#login-modal">
                    <i class="bi bi-box-arrow-in-right"></i>
                    <span class="d-none d-sm-inline">Войти</span>
                  </button>
                </div>
                `}
              </div>
            </div>
          </div>
        </nav>

        <!-- Отступ чтобы контент не залезал под fixed-хедер -->
        <div style="height:72px;"></div>

        <!-- ====== Модалка логина ====== -->
        <div class="modal fade" id="login-modal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content border-0 shadow-lg rounded-4">
              <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold">Вход</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body pt-2">
                <form id="login-form" action="/login" method="post">
                  <input type="hidden" name="_csrf" value="${(window.csrf && window.csrf.token) || ''}" />
                  <div class="mb-3">
                    <label for="login-username" class="form-label small fw-medium">Логин (email)</label>
                    <input type="text" class="form-control" id="login-username" name="username"
                           placeholder="admin@rus.ru" required autocomplete="username" autofocus />
                  </div>
                  <div class="mb-3">
                    <label for="login-password" class="form-label small fw-medium">Пароль</label>
                    <input type="password" class="form-control" id="login-password" name="password"
                           placeholder="••••••••" required autocomplete="current-password" />
                  </div>
                  <div id="login-error" class="alert alert-danger py-2 small d-none"></div>
                  <button type="submit" class="btn btn-primary w-100 rounded-pill py-2 fw-medium">
                    <i class="bi bi-box-arrow-in-right me-2"></i>Войти
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>`;
    }

    // ========== Инициализация ==========
    function init() {
        var container = document.getElementById('header-container');
        if (!container) return;

        // Добавляем стили в head (один раз)
        if (!document.getElementById('header-styles')) {
            var styleEl = document.createElement('style');
            styleEl.id = 'header-styles';
            styleEl.textContent = styles;
            document.head.appendChild(styleEl);
        }

        // Рендерим HTML
        container.innerHTML = renderHeader();

        // Показываем модалку логина при ?error в URL
        if (window.location.search.includes('error')) {
            setTimeout(function () {
                var modalEl = document.getElementById('login-modal');
                if (modalEl) {
                    var modal = new bootstrap.Modal(modalEl);
                    modal.show();
                    var errEl = document.getElementById('login-error');
                    if (errEl) {
                        errEl.textContent = 'Неверный логин или пароль';
                        errEl.classList.remove('d-none');
                    }
                }
            }, 200);
        }
    }

    // Запуск после готовности DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
