/**
 * users.js — управление пользователями (только ADMIN)
 */
(function () {
    'use strict';

    // Ждём загрузки Bootstrap (bootstrap.bundle.min.js — в конце body)
    if (typeof bootstrap === 'undefined') {
        document.addEventListener('DOMContentLoaded', function () {
            // Bootstrap ещё может не быть готов — даём небольшую задержку
            var check = setInterval(function () {
                if (typeof bootstrap !== 'undefined') {
                    clearInterval(check);
                    init();
                }
            }, 50);
        });
    } else {
        init();
    }

    function init() {
    'use strict';

    const container = document.getElementById('users-root');
    if (!container) return;

    // ==== Состояние ====
    let currentPage = 0;
    const pageSize = 15;
    let totalUsers = 0;
    let loadedDepartments = [];
    let searchTimeout = null;

    // ==== DOM-элементы ====
    const tbody = document.getElementById('users-tbody');
    const totalEl = document.getElementById('users-total');
    const paginationEl = document.getElementById('users-pagination');
    const searchInput = document.getElementById('users-search');
    const roleFilter = document.getElementById('users-role-filter');

    // Модалка создания/редактирования
    const editModal = new bootstrap.Modal(document.getElementById('user-edit-modal'));
    const editTitle = document.getElementById('user-edit-title');
    const editUuid = document.getElementById('user-edit-uuid');
    const editLastname = document.getElementById('user-edit-lastname');
    const editFirstname = document.getElementById('user-edit-firstname');
    const editPatronymic = document.getElementById('user-edit-patronymic');
    const editUsername = document.getElementById('user-edit-username');
    const editRole = document.getElementById('user-edit-role');
    const editBirth = document.getElementById('user-edit-birth');
    const editDeptBlock = document.getElementById('user-edit-dept-block');
    const editDeptSearch = document.getElementById('user-edit-dept-search');
    const editDeptDropdown = document.getElementById('user-edit-dept-dropdown');
    const editDeptHidden = document.getElementById('user-edit-department');
    const editPasswordBlock = document.getElementById('user-edit-password-block');
    const editPassword = document.getElementById('user-edit-password');
    const editPasswordToggle = document.getElementById('user-edit-password-toggle');
    const editError = document.getElementById('user-edit-error');
    const editSaveBtn = document.getElementById('user-edit-save-btn');

    // Модалка смены пароля
    const passModal = new bootstrap.Modal(document.getElementById('user-password-modal'));
    const passUuid = document.getElementById('user-password-uuid');
    const passName = document.getElementById('user-password-name');
    const passNew = document.getElementById('user-password-new');
    const passError = document.getElementById('user-password-error');
    const passSaveBtn = document.getElementById('user-password-save-btn');

    // ==== Ролевые метки ====
    const roleLabels = {
        ADMIN: 'Администратор',
        DEPARTMENT_ADMIN: 'Админ кафедры',
        MODERATOR: 'Модератор',
        LECTURER: 'Преподаватель',
        STUDENT: 'Студент'
    };
    const roleBadges = {
        ADMIN: 'bg-danger',
        DEPARTMENT_ADMIN: 'bg-warning text-dark',
        MODERATOR: 'bg-info text-dark',
        LECTURER: 'bg-primary',
        STUDENT: 'bg-secondary'
    };

    // ==== CSRF-токен из куки ====
    function getCsrfToken() {
        var match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : (window.csrf && window.csrf.token) || '';
    }

    function csrfHeaders() {
        var headers = { 'Content-Type': 'application/json' };
        var token = getCsrfToken();
        if (token) headers['X-XSRF-TOKEN'] = token;
        return headers;
    }

    // ==== Загрузка списка пользователей ====
    function loadUsers(page) {
        var search = searchInput.value.trim();
        var role = roleFilter.value;
        var url = '/api/users?page=' + page + '&size=' + pageSize +
                  '&search=' + encodeURIComponent(search) +
                  '&role=' + encodeURIComponent(role);

        fetch(url)
            .then(function (r) {
                if (!r.ok) throw new Error('Ошибка загрузки: ' + r.status);
                return r.json();
            })
            .then(function (data) {
                totalUsers = data.total;
                currentPage = data.page;
                renderTable(data.items);
                renderPagination();
                totalEl.textContent = 'Всего пользователей: ' + totalUsers;
            })
            .catch(function (err) {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Ошибка загрузки пользователей</td></tr>';
            });
    }

    // ==== Рендер таблицы ====
    function renderTable(users) {
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Пользователи не найдены</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(function (u) {
            var fn = u.firstName || '';
            var ln = u.lastName || '';
            var pt = u.patronymic || '';
            var fullName = [ln, fn, pt].filter(Boolean).join(' ') || '—';
            var initials = ((ln.charAt(0) || '') + (fn.charAt(0) || '')).toUpperCase() || '?';
            // Поиск названия кафедры
            var dept = null;
            if (u.departmentUuid) {
                for (var i = 0; i < loadedDepartments.length; i++) {
                    if (loadedDepartments[i].uuid === u.departmentUuid) {
                        dept = loadedDepartments[i];
                        break;
                    }
                }
            }
            var deptName = (dept && dept.name) || '';
            var deptDisplay = deptName
                ? (deptName.length > 30
                    ? '<span title="' + escapeHtml(deptName) + '" style="max-width:220px;" class="text-truncate d-inline-block align-bottom">' + escapeHtml(deptName) + '</span>'
                    : '<span class="text-muted small">' + escapeHtml(deptName) + '</span>')
                : '<span class="text-muted small">—</span>';

            return '<tr class="' + (!u.isActive ? 'table-secondary opacity-75' : '') + '">' +
                '<td class="ps-3">' +
                    '<div class="d-flex align-items-center gap-2">' +
                        '<div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0" ' +
                             'style="width:32px;height:32px;background:linear-gradient(135deg,#2563eb,#1d4ed8);font-size:0.75rem;">' +
                            escapeHtml(initials) +
                        '</div>' +
                        '<span class="fw-medium">' + escapeHtml(fullName) + '</span>' +
                    '</div>' +
                '</td>' +
                '<td><span class="text-muted small">' + escapeHtml(u.username || '') + '</span></td>' +
                '<td><span class="badge rounded-pill ' + (roleBadges[u.role] || 'bg-secondary') + '">' + (roleLabels[u.role] || u.role) + '</span></td>' +
                '<td>' + deptDisplay + '</td>' +
                '<td class="text-center">' +
                    '<div class="form-check form-switch d-inline-block">' +
                        '<input class="form-check-input" type="checkbox" role="switch" ' + (u.isActive ? 'checked' : '') +
                               ' onchange="window.__toggleUserActive(\x27' + u.uuid + '\x27)" />' +
                    '</div>' +
                '</td>' +
                '<td class="text-end pe-3">' +
                    '<div class="d-flex gap-1 justify-content-end">' +
                        '<button class="btn btn-sm btn-outline-secondary rounded-pill" title="Редактировать" ' +
                                'onclick="window.__editUser(\x27' + u.uuid + '\x27)">' +
                            '<i class="bi bi-pencil"></i>' +
                        '</button>' +
                        '<button class="btn btn-sm btn-outline-warning rounded-pill" title="Сменить пароль" ' +
                                'onclick="window.__changePassword(\x27' + u.uuid + '\x27)">' +
                            '<i class="bi bi-key"></i>' +
                        '</button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
        }).join('');
    }

    // ==== Пагинация ====
    function renderPagination() {
        var totalPages = Math.ceil(totalUsers / pageSize);
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        var html = '<span class="text-muted small">Стр. ' + (currentPage + 1) + ' из ' + totalPages + '</span>';
        html += '<div class="btn-group btn-group-sm">';
        html += '<button class="btn btn-outline-secondary" ' + (currentPage === 0 ? 'disabled' : '') +
                ' onclick="window.__goToPage(' + (currentPage - 1) + ')"><i class="bi bi-chevron-left"></i></button>';

        var startPage = Math.max(0, currentPage - 2);
        var endPage = Math.min(totalPages - 1, currentPage + 2);
        for (var p = startPage; p <= endPage; p++) {
            html += '<button class="btn ' + (p === currentPage ? 'btn-primary' : 'btn-outline-secondary') + '" ' +
                    'onclick="window.__goToPage(' + p + ')">' + (p + 1) + '</button>';
        }

        html += '<button class="btn btn-outline-secondary" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') +
                ' onclick="window.__goToPage(' + (currentPage + 1) + ')"><i class="bi bi-chevron-right"></i></button>';
        html += '</div>';

        paginationEl.innerHTML = html;
    }

    // ==== Загрузка списка кафедр ====
    function loadDepartments() {
        return fetch('/api/department')
            .then(function (r) { return r.json(); })
            .then(function (depts) {
                loadedDepartments = depts || [];
                loadedDepartments.sort(function (a, b) {
                    return a.name.localeCompare(b.name, 'ru');
                });
            })
            .catch(function (err) {
                console.error('Ошибка загрузки кафедр:', err);
            });
    }

    // ==== Рендер выпадающего списка кафедр ====
    function renderDeptDropdown(filter) {
        var dropdown = editDeptDropdown;
        dropdown.innerHTML = '';

        var q = (filter || '').toLowerCase();
        var filtered = loadedDepartments.filter(function (d) {
            return !q || d.name.toLowerCase().indexOf(q) !== -1;
        });

        if (filtered.length > 0) {
            filtered.forEach(function (dept) {
                var item = document.createElement('div');
                item.className = 'dropdown-item py-2 px-3';
                item.textContent = dept.name;
                item.style.cursor = 'pointer';
                item.addEventListener('mousedown', function (e) {
                    e.preventDefault(); // чтобы не уводил фокус с поля ввода
                    editDeptHidden.value = dept.uuid;
                    editDeptSearch.value = dept.name;
                    dropdown.classList.remove('show');
                });
                dropdown.appendChild(item);
            });
        } else {
            var empty = document.createElement('div');
            empty.className = 'dropdown-item text-muted py-2 px-3';
            empty.textContent = 'Кафедры не найдены';
            dropdown.appendChild(empty);
        }

        // показать/скрыть дропдаун
        if (filtered.length > 0 || q) {
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show');
        }
    }

    // ==== Показать/скрыть блок кафедры в зависимости от роли ====
    function toggleDeptBlock() {
        var role = editRole.value;
        if (role === 'DEPARTMENT_ADMIN' || role === 'LECTURER') {
            editDeptBlock.classList.remove('d-none');
        } else {
            editDeptBlock.classList.add('d-none');
            editDeptHidden.value = '';
            editDeptSearch.value = '';
        }
    }

    // ==== Открыть модалку создания ====
    function openCreateModal() {
        editTitle.textContent = 'Создать пользователя';
        editUuid.value = '';
        editLastname.value = '';
        editFirstname.value = '';
        editPatronymic.value = '';
        editUsername.value = '';
        editRole.value = 'STUDENT';
        editBirth.value = '';
        editDeptHidden.value = '';
        editDeptSearch.value = '';
        editPassword.value = '';
        editPasswordBlock.classList.remove('d-none');
        editPassword.required = true;
        editUsername.disabled = false;
        editError.classList.add('d-none');
        toggleDeptBlock();
        editModal.show();
    }

    // ==== Открыть модалку редактирования ====
    function openEditModal(uuid) {
        fetch('/api/users/' + uuid)
            .then(function (r) {
                if (!r.ok) throw new Error('Пользователь не найден');
                return r.json();
            })
            .then(function (u) {
                editTitle.textContent = 'Редактировать пользователя';
                editUuid.value = u.uuid;
                editLastname.value = u.lastName || '';
                editFirstname.value = u.firstName || '';
                editPatronymic.value = u.patronymic || '';
                editUsername.value = u.username || '';
                editUsername.disabled = true; // логин не меняется
                editRole.value = u.role || 'STUDENT';
                editBirth.value = u.birth || '';
                editDeptHidden.value = u.departmentUuid || '';
                // Показать название кафедры в поле поиска
                if (u.departmentUuid && loadedDepartments.length > 0) {
                    var dept = loadedDepartments.find(function (d) { return d.uuid === u.departmentUuid; });
                    editDeptSearch.value = dept ? dept.name : '';
                } else {
                    editDeptSearch.value = '';
                }
                editPassword.value = '';
                editPasswordBlock.classList.add('d-none');
                editPassword.required = false;
                editError.classList.add('d-none');
                toggleDeptBlock();
                editModal.show();
            })
            .catch(function (err) {
                console.error(err);
                alert('Ошибка загрузки пользователя');
            });
    }

    // ==== Сохранить (создать/обновить) ====
    function saveUser() {
        var isCreate = !editUuid.value;
        var payload = {
            firstName: editFirstname.value.trim(),
            lastName: editLastname.value.trim(),
            patronymic: editPatronymic.value.trim(),
            role: editRole.value,
            birth: editBirth.value || null,
            departmentUuid: editDeptHidden.value || null
        };

        if (isCreate) {
            payload.username = editUsername.value.trim();
            payload.password = editPassword.value;
        }

        // Валидация
        if (!payload.lastName || !payload.firstName) {
            editError.textContent = 'Фамилия и имя обязательны';
            editError.classList.remove('d-none');
            return;
        }
        if (isCreate && (!payload.username || !payload.password)) {
            editError.textContent = 'Логин и пароль обязательны при создании';
            editError.classList.remove('d-none');
            return;
        }
        if (isCreate && payload.password.length < 8) {
            editError.textContent = 'Пароль должен быть не менее 8 символов';
            editError.classList.remove('d-none');
            return;
        }
        // Проверка кафедры для DEPARTMENT_ADMIN и LECTURER
        if ((payload.role === 'DEPARTMENT_ADMIN' || payload.role === 'LECTURER') && !payload.departmentUuid) {
            editError.textContent = 'Для этой роли необходимо указать кафедру';
            editError.classList.remove('d-none');
            return;
        }

        editSaveBtn.disabled = true;
        var url = isCreate ? '/api/users' : '/api/users/' + editUuid.value;
        var method = isCreate ? 'POST' : 'PUT';

        fetch(url, {
            method: method,
            headers: csrfHeaders(),
            body: JSON.stringify(payload)
        })
        .then(function (r) {
            if (!r.ok) return r.text().then(function (t) { throw new Error(t || 'Ошибка сохранения'); });
            return r.json();
        })
        .then(function () {
            editModal.hide();
            loadUsers(currentPage);
        })
        .catch(function (err) {
            editError.textContent = err.message;
            editError.classList.remove('d-none');
        })
        .finally(function () {
            editSaveBtn.disabled = false;
        });
    }

    // ==== Сменить пароль ====
    function openPasswordModal(uuid) {
        fetch('/api/users/' + uuid)
            .then(function (r) { return r.json(); })
            .then(function (u) {
                var fn = u.firstName || '';
                var ln = u.lastName || '';
                passUuid.value = u.uuid;
                passName.textContent = 'Пользователь: ' + [ln, fn].filter(Boolean).join(' ') || u.username;
                passNew.value = '';
                passError.classList.add('d-none');
                passModal.show();
            });
    }

    function savePassword() {
        var newPass = passNew.value.trim();
        if (!newPass || newPass.length < 8) {
            passError.textContent = 'Пароль должен быть не менее 8 символов';
            passError.classList.remove('d-none');
            return;
        }

        passSaveBtn.disabled = true;
        fetch('/api/users/' + passUuid.value + '/password', {
            method: 'PUT',
            headers: csrfHeaders(),
            body: JSON.stringify({ password: newPass })
        })
        .then(function (r) {
            if (!r.ok) throw new Error('Ошибка смены пароля');
            passModal.hide();
        })
        .catch(function (err) {
            passError.textContent = err.message;
            passError.classList.remove('d-none');
        })
        .finally(function () {
            passSaveBtn.disabled = false;
        });
    }

    // ==== Переключить активность ====
    function toggleActive(uuid) {
        fetch('/api/users/' + uuid + '/toggle-active', {
            method: 'PUT',
            headers: csrfHeaders()
        })
        .then(function (r) {
            if (!r.ok) throw new Error('Ошибка переключения');
            loadUsers(currentPage);
        })
        .catch(function (err) {
            console.error(err);
            alert('Ошибка: ' + err.message);
        });
    }

    // ==== Escape HTML ====
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ==== Глобальные колбэки (для onclick в таблице) ====
    window.__editUser = openEditModal;
    window.__changePassword = openPasswordModal;
    window.__toggleUserActive = toggleActive;
    window.__goToPage = function (page) { loadUsers(page); };

    // ==== Обработчики событий ====
    document.getElementById('users-create-btn').addEventListener('click', openCreateModal);
    editSaveBtn.addEventListener('click', saveUser);
    passSaveBtn.addEventListener('click', savePassword);
    editRole.addEventListener('change', toggleDeptBlock);

    // Поиск с debounce 400ms
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
            loadUsers(0);
        }, 400);
    });

    // Фильтр по роли — сразу
    roleFilter.addEventListener('change', function () {
        loadUsers(0);
    });

    // ==== Searchable dropdown для кафедры ====
    editDeptSearch.addEventListener('input', function () {
        renderDeptDropdown(this.value);
    });

    // При фокусе — показать все кафедры
    editDeptSearch.addEventListener('focus', function () {
        renderDeptDropdown(this.value);
    });

    // Клик вне дропдауна — скрыть
    document.addEventListener('click', function (e) {
        if (!editDeptSearch.contains(e.target) && !editDeptDropdown.contains(e.target)) {
            editDeptDropdown.classList.remove('show');
        }
    });

    // ==== Инициализация ====
    // Сбрасываем автозаполнение браузера (может подставить логин в поле поиска)
    searchInput.value = '';
    loadDepartments().then(function () {
        loadUsers(0);
    });
    } // конец init()
})();
