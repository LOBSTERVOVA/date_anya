import { cloneWeek } from './api.js';
import { showToast } from './utils.js';

/**
 * Инициализация модалки копирования недели
 */
export function initImportSchedule() {
    console.log('initImportSchedule START');

    // Кнопка «Скопировать расписание на текущую неделю»
    const copyWeekBtn = document.getElementById('copy-week-next');
    if (copyWeekBtn) {
        copyWeekBtn.addEventListener('click', () => {
            populateCopyDeptDropdown('');
            populateCopyWeekSelect();
            populateCopyDaysList();
            $('#copy-dept-search').val('');
            $('#copy-department-uuid').val('');
            $('#copy-source-date').val('');
            $('#copy-other-week-cb').prop('checked', false);
            $('#copy-other-week-wrap').hide();
            $('#copy-advanced-settings').hide();
            $('#copy-week-confirm').prop('disabled', true);
            $('#copy-advanced-toggle').prop('disabled', true);
            toggleCopyWeekModal(true);
        });
    }

    // Чекбокс «Другая неделя»
    const otherWeekCb = document.getElementById('copy-other-week-cb');
    if (otherWeekCb) {
        otherWeekCb.addEventListener('change', function () {
            const wrap = document.getElementById('copy-other-week-wrap');
            if (wrap) {
                wrap.style.display = this.checked ? '' : 'none';
            }
            // Сбрасываем выбор в селекторе при включении другой недели
            if (this.checked) {
                $('#copy-week-select').val('');
            } else {
                $('#copy-source-date').val('');
            }
        });
    }

    // Searchable dropdown кафедры
    const deptSearch = document.getElementById('copy-dept-search');
    if (deptSearch) {
        deptSearch.addEventListener('input', function () {
            populateCopyDeptDropdown(this.value);
            $('#copy-dept-dropdown').addClass('show');
        });
        deptSearch.addEventListener('focus', function () {
            populateCopyDeptDropdown(this.value);
            $('#copy-dept-dropdown').addClass('show');
        });
    }

    // Скрываем дропдаун при клике вне
    $(document).on('click', function (e) {
        const $wrap = $('#copy-week-modal .modal-body');
        if ($wrap.length && !$wrap.is(e.target) && $wrap.has(e.target).length === 0) {
            $('#copy-dept-dropdown').removeClass('show');
        }
    });

    // Расширенные настройки
    const advancedToggle = document.getElementById('copy-advanced-toggle');
    if (advancedToggle) {
        advancedToggle.addEventListener('click', () => {
            const settings = document.getElementById('copy-advanced-settings');
            if (settings) {
                const isVisible = settings.style.display !== 'none';
                settings.style.display = isVisible ? 'none' : '';
                advancedToggle.innerHTML = isVisible
                    ? '<i class="bi bi-gear me-1"></i>Расширенные настройки'
                    : '<i class="bi bi-gear me-1"></i>Скрыть настройки';
                if (!isVisible) {
                    populateCopyLecturersList();
                }
            }
        });
    }

    // Select all для преподавателей
    const selectAllLecturers = document.getElementById('copy-select-all-lecturers');
    if (selectAllLecturers) {
        selectAllLecturers.addEventListener('change', function () {
            const checked = this.checked;
            document.querySelectorAll('#copy-lecturers-list input[type="checkbox"]').forEach(cb => {
                cb.checked = checked;
            });
        });
    }

    // Select all для дней недели
    const selectAllDays = document.getElementById('copy-select-all-days');
    if (selectAllDays) {
        selectAllDays.addEventListener('change', function () {
            const checked = this.checked;
            document.querySelectorAll('#copy-days-list input[type="checkbox"]').forEach(cb => {
                cb.checked = checked;
            });
        });
    }

    // Кнопки модалки
    const copyWeekClose = document.getElementById('copy-week-close');
    const copyWeekCancel = document.getElementById('copy-week-cancel');
    const copyWeekConfirm = document.getElementById('copy-week-confirm');

    if (copyWeekClose) copyWeekClose.addEventListener('click', () => toggleCopyWeekModal(false));
    if (copyWeekCancel) copyWeekCancel.addEventListener('click', () => toggleCopyWeekModal(false));
    if (copyWeekConfirm) copyWeekConfirm.addEventListener('click', handleCopyWeekConfirm);

    // Кнопки модалки отчёта
    const reportClose = document.getElementById('clone-report-close');
    const reportOk = document.getElementById('clone-report-ok');
    if (reportClose) reportClose.addEventListener('click', () => toggleReportModal(false));
    if (reportOk) reportOk.addEventListener('click', () => toggleReportModal(false));

    console.log('initImportSchedule COMPLETE');
}

// ==================== Вспомогательные функции ====================

/**
 * Заполняет селектор недель: с 1 сентября текущего учебного года по текущую неделю.
 * Учебный год: если сейчас январь–август → с 1 сентября прошлого года;
 *             если сентябрь–декабрь → с 1 сентября текущего года.
 */
function populateCopyWeekSelect() {
    const sel = document.getElementById('copy-week-select');
    if (!sel) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    // Определяем год начала учебного года
    const academicYearStart = now.getMonth() >= 8 // сентябрь (8) или позже
        ? currentYear
        : currentYear - 1;

    // 1 сентября учебного года
    const sept1 = new Date(academicYearStart, 8, 1); // месяц 8 = сентябрь

    // Понедельник недели, содержащей 1 сентября
    const septMonday = new Date(sept1);
    const septDay = septMonday.getDay(); // 0 = вс, 1 = пн, ...
    const diffToMonday = septDay === 0 ? -6 : 1 - septDay; // дни до понедельника
    septMonday.setDate(septMonday.getDate() + diffToMonday);

    // Понедельник текущей недели
    const todayMonday = new Date(now);
    const todayDay = todayMonday.getDay();
    const todayDiff = todayDay === 0 ? -6 : 1 - todayDay;
    todayMonday.setDate(todayMonday.getDate() + todayDiff);
    todayMonday.setHours(0, 0, 0, 0);

    sel.innerHTML = '<option value="">-- Выберите неделю --</option>';

    // Генерируем недели от septMonday до todayMonday
    const iter = new Date(septMonday);
    while (iter <= todayMonday) {
        const monday = new Date(iter);
        const sunday = new Date(iter);
        sunday.setDate(sunday.getDate() + 6);

        const format = d => {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return dd + '.' + mm;
        };

        const label = format(monday) + ' — ' + format(sunday);
        const value = monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0');

        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        sel.appendChild(opt);

        iter.setDate(iter.getDate() + 7);
    }
}

function populateCopyDeptDropdown(search) {
    const $dropdown = $('#copy-dept-dropdown');
    $dropdown.empty();

    const depts = window.loadedDepartments || [];
    const q = (search || '').toLowerCase();
    const filtered = depts.filter(d => !q || (d.name || '').toLowerCase().includes(q));

    if (filtered.length > 0) {
        filtered.forEach(dept => {
            const $item = $('<div class="dropdown-item py-2 px-3 text-wrap"></div>').text(dept.name);
            $item.on('click', function (e) {
                e.preventDefault();
                $('#copy-department-uuid').val(dept.uuid);
                $('#copy-dept-search').val(dept.name);
                $dropdown.removeClass('show');
                $('#copy-week-confirm').prop('disabled', false);
                $('#copy-advanced-toggle').prop('disabled', false);
                populateCopyLecturersList();
            });
            $dropdown.append($item);
        });
    } else {
        $dropdown.append($('<div class="dropdown-item text-muted py-2 px-3">Кафедры не найдены</div>'));
    }
}

function populateCopyLecturersList() {
    const listEl = document.getElementById('copy-lecturers-list');
    if (!listEl) return;

    const deptUuid = document.getElementById('copy-department-uuid')?.value;
    const lecturers = window.loadedLecturers || [];

    const filtered = deptUuid
        ? lecturers.filter(l => l.department && l.department.uuid === deptUuid)
        : lecturers;

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="text-muted small">Преподаватели не найдены</div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.sort((a, b) => {
        const nameA = (a.lastName + ' ' + a.firstName).toLowerCase();
        const nameB = (b.lastName + ' ' + b.firstName).toLowerCase();
        return nameA.localeCompare(nameB, 'ru');
    });

    filtered.forEach(lec => {
        const fullName = [lec.lastName, lec.firstName, lec.patronymic].filter(Boolean).join(' ');
        const div = document.createElement('div');
        div.className = 'form-check mb-1';

        const input = document.createElement('input');
        input.className = 'form-check-input copy-lecturer-cb';
        input.type = 'checkbox';
        input.id = 'copy-lec-' + lec.uuid;
        input.value = lec.uuid;
        input.checked = true;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'copy-lec-' + lec.uuid;
        label.textContent = fullName;

        div.appendChild(input);
        div.appendChild(label);
        listEl.appendChild(div);
    });
}

function populateCopyDaysList() {
    const listEl = document.getElementById('copy-days-list');
    if (!listEl) return;

    const days = [
        { value: 'MONDAY', label: 'Пн' },
        { value: 'TUESDAY', label: 'Вт' },
        { value: 'WEDNESDAY', label: 'Ср' },
        { value: 'THURSDAY', label: 'Чт' },
        { value: 'FRIDAY', label: 'Пт' },
        { value: 'SATURDAY', label: 'Сб' },
        { value: 'SUNDAY', label: 'Вс' }
    ];

    listEl.innerHTML = '';
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'form-check form-check-inline';

        const input = document.createElement('input');
        input.className = 'form-check-input copy-day-cb';
        input.type = 'checkbox';
        input.id = 'copy-day-' + day.value;
        input.value = day.value;
        input.checked = true;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'copy-day-' + day.value;
        label.textContent = day.label;

        div.appendChild(input);
        div.appendChild(label);
        listEl.appendChild(div);
    });
}

function toggleCopyWeekModal(show) {
    const el = document.getElementById('copy-week-modal');
    if (!el) return;

    el.style.display = show ? 'block' : 'none';
    el.classList.toggle('show', !!show);

    if (show) {
        el.style.background = 'rgba(0,0,0,0.5)';
        el.style.position = 'fixed';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100%';
        el.style.height = '100%';
        const dialog = el.querySelector('.modal-dialog');
        if (dialog) dialog.style.marginTop = '5vh';
    } else {
        el.style.background = '';
    }
}

function toggleReportModal(show) {
    const el = document.getElementById('clone-report-modal');
    if (!el) return;

    el.style.display = show ? 'block' : 'none';
    el.classList.toggle('show', !!show);

    if (show) {
        el.style.background = 'rgba(0,0,0,0.5)';
        el.style.position = 'fixed';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100%';
        el.style.height = '100%';
        const dialog = el.querySelector('.modal-dialog');
        if (dialog) dialog.style.marginTop = '5vh';
    } else {
        el.style.background = '';
    }
}

async function handleCopyWeekConfirm() {
    const deptUuid = document.getElementById('copy-department-uuid')?.value;

    if (!deptUuid) {
        showToast('Выберите кафедру', 'warning');
        return;
    }

    // Исходная дата: либо из селектора недель, либо из datepicker «Другая неделя»
    const otherWeek = document.getElementById('copy-other-week-cb')?.checked;
    let sourceDate;

    if (otherWeek) {
        sourceDate = document.getElementById('copy-source-date')?.value;
    } else {
        sourceDate = document.getElementById('copy-week-select')?.value;
    }

    if (!sourceDate) {
        showToast('Выберите исходную неделю', 'warning');
        return;
    }

    // Целевая неделя — текущая открытая неделя
    const weekStart = window.weekStart;
    if (!weekStart) {
        showToast('Не удалось определить текущую неделю', 'danger');
        return;
    }
    let targetDate;
    if (weekStart instanceof Date) {
        targetDate = weekStart.getFullYear() + '-' + String(weekStart.getMonth() + 1).padStart(2, '0') + '-' + String(weekStart.getDate()).padStart(2, '0');
    } else {
        targetDate = String(weekStart).split('T')[0];
    }

    // Собираем выбранных преподавателей
    const lecturerCheckboxes = document.querySelectorAll('#copy-lecturers-list input.copy-lecturer-cb:checked');
    const lecturerUuids = Array.from(lecturerCheckboxes).map(cb => cb.value);

    // Собираем выбранные дни недели
    const dayCheckboxes = document.querySelectorAll('#copy-days-list input.copy-day-cb:checked');
    const daysOfWeek = Array.from(dayCheckboxes).map(cb => cb.value);

    if (lecturerUuids.length === 0) {
        showToast('Выберите хотя бы одного преподавателя', 'warning');
        return;
    }
    if (daysOfWeek.length === 0) {
        showToast('Выберите хотя бы один день недели', 'warning');
        return;
    }

    const payload = {
        departmentUuid: deptUuid,
        sourceDate: sourceDate,
        targetDate: targetDate,
        lecturerUuids: lecturerUuids,
        daysOfWeek: daysOfWeek
    };

    try {
        const response = await cloneWeek(payload);
        toggleCopyWeekModal(false);
        showCloneReport(response);

        if (typeof window.renderTable === 'function') {
            window.renderTable();
        }
    } catch (e) {
        console.error('Clone week failed', e);
        showToast(e.message || 'Не удалось скопировать расписание', 'danger');
    }
}

function showCloneReport(response) {
    const errorsDiv = document.getElementById('clone-report-errors');
    const summaryDiv = document.getElementById('clone-report-summary');

    if (!errorsDiv || !summaryDiv) return;

    const errors = response.errors || [];
    const successCount = response.successCount || 0;
    const total = successCount + errors.length;

    const dayLabels = {
        'MONDAY': 'Пн', 'TUESDAY': 'Вт', 'WEDNESDAY': 'Ср',
        'THURSDAY': 'Чт', 'FRIDAY': 'Пт', 'SATURDAY': 'Сб', 'SUNDAY': 'Вс'
    };

    if (errors.length === 0) {
        errorsDiv.innerHTML = '<div class="text-success mb-2">Все пары скопированы успешно</div>';
    } else {
        const grouped = {};
        errors.forEach(err => {
            const day = err.dayOfWeek;
            const order = err.pairOrder;
            if (!grouped[day]) grouped[day] = {};
            if (!grouped[day][order]) grouped[day][order] = [];
            grouped[day][order].push({ lecturer: err.lecturerName, reason: err.reason });
        });

        let html = '';
        const sortedDays = Object.keys(grouped).sort((a, b) => {
            const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
            return order.indexOf(a) - order.indexOf(b);
        });

        sortedDays.forEach(day => {
            html += '<div class="fw-bold mt-2">' + (dayLabels[day] || day) + ':</div>';
            const orders = grouped[day];
            const sortedOrders = Object.keys(orders).sort((a, b) => Number(a) - Number(b));
            sortedOrders.forEach(order => {
                html += '<div class="ms-3">' + order + ' пара:</div>';
                orders[order].forEach(err => {
                    html += '<div class="ms-5 text-danger">' + err.lecturer + ' - ' + err.reason + '</div>';
                });
            });
        });
        errorsDiv.innerHTML = html;
    }

    summaryDiv.innerHTML = 'Успешно создано ' + successCount + ' из ' + total + ' пар';

    toggleReportModal(true);
}
