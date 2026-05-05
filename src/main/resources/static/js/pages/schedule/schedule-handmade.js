import {
    fetchDepartments,
    fetchLecturers,
    fetchRooms,
    fetchGroups,
    fetchWeekPairsBatch,
    exportScheduleExcel
} from "./api.js"
import {showToast, getWeekStart, getWeekEnd, formatDateDDMM, formatLectFio, formatEducationForm, dateToIso} from "./utils.js";
import {startOfWeekMonday, endOfWeekSunday, dateIsoFor} from "./date.js";

let loadedDepartments = [];
let loadedLecturers = [];
let loadedRooms = [];
let loadedGroups = [];

let selectedDepartments = [];
let weekStart = getWeekStart(null);

let weekPairs = [];

async function init() {
    console.log('init START HANDMADE');

    /**
     * Инициализация стартовых переменных
     */

    // Загружаем все кафедры
    try {
        loadedDepartments = await fetchDepartments('');
        loadedDepartments.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

        console.log('Loaded departments:', loadedDepartments.length);
        loadedDepartments.forEach(dep => {
            const depsDropdown = $('#additional-dept-dropdown');

        })

        populateDepartmentDropdown('')

        $('#additional-dept-search').on('input', function() {
            const searchTerm = $(this).val();
            populateDepartmentDropdown(searchTerm);

            // Показываем/скрываем выпадающий список
            const $dropdown = $('#additional-dept-dropdown');
            if (searchTerm.length > 0) {
                $dropdown.addClass('show');
            } else {
                $dropdown.removeClass('show');
            }
        });

        function populateDepartmentDropdown(search) {
            const $dropdown = $('#additional-dept-dropdown');
            $dropdown.empty();

            const filteredDepts = loadedDepartments.filter(dept =>
                dept.name.toLowerCase().includes(search.toLowerCase()) && !selectedDepartments.some(selected => selected.uuid === dept.uuid)
            );
            console.log('populateDepartmentDropdown')
            console.log(filteredDepts.length)
            if (filteredDepts.length > 0) {
                filteredDepts.forEach(dept => {
                    const $item = $(`
                        <div class="dropdown-item py-2 px-3 text-wrap">${dept.name}</div>
                        <hr class="m-0 p-0">
                    `)
                    $item.on('click', function (e) {
                        e.preventDefault();
                        selectedDepartments.push(dept);
                        console.log(selectedDepartments);
                        // после нажатия нужно переделать список дропдауна, чтобы в нем не было выбранной кафедры и очистить поле поиска кафедры
                        populateDepartmentDropdown('');
                        $('#additional-dept-search').val('')
                        $dropdown.removeClass('show');
                        $('#additional-department-modal').modal('hide');

                        // добавляем кафедру в контейнер
                        const $container = $('#additional-departments');
                        if (!$container.length) return;

                        const $deptEl = $(`
                            <div class="d-flex align-items-center gap-2 p-2 border rounded bg-light" id="dept-${dept.uuid}">
                                <span class="fw-medium">${dept.name}</span>
<!--                                <span class="text-muted small">(${dept.lecturers.length} преподавателей)</span>-->
                                <button class="btn btn-sm btn-outline-danger remove-dept-btn ms-auto" data-dept-id="dept-${dept.uuid}">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                        `);

                        // Добавляем обработчик удаления
                        $deptEl.find('.remove-dept-btn').on('click', function() {
                            selectedDepartments = selectedDepartments.filter(item => item.uuid !== dept.uuid);
                            $deptEl.fadeOut(300, function() {
                                $(this).remove();  // Удаляем сам элемент после анимации
                            });
                            console.log('Обновленный массив:', selectedDepartments);
                            populateDepartmentDropdown('');
                            renderTable();
                        });

                        $container.append($deptEl);

                        renderTable();
                    });
                    $dropdown.append($item);
                    console.log('adding department to dd')
                })
            } else {
                // Если ничего не найдено
                $dropdown.append($('<div>', {
                    class: 'dropdown-item text-muted py-2 px-3',
                    text: 'Кафедры не найдены'
                }));
            }
        }

    } catch (e) {
        console.error('Failed to load departments', e);
        showToast('Не удалось загрузить кафедры, перезагрузите страницу', 'danger', 'Ошибка');
        loadedDepartments = [];
    }

    // Загружаем всех преподавателей
    try {
        loadedLecturers = await fetchLecturers('');
        console.log('Loaded lecturers:', loadedLecturers.length);
    } catch (e) {
        console.error('Failed to load lecturers', e);
        showToast('Не удалось загрузить преподавателей, перезагрузите страницу', 'danger', 'Ошибка');
        loadedLecturers = [];
    }

    // Загружаем все аудитории
    try {
        loadedRooms = await fetchRooms();
        console.log('Загружено аудиторий:', loadedRooms.length);
    } catch (e) {
        showToast('Не удалось загрузить аудитории, перезагрузите страницу', 'danger', 'Ошибка');
        loadedRooms = [];
    }

    // Загружаем все группы
    try {
        loadedGroups = await fetchGroups('');
        window.allGroups = loadedGroups;
        console.log('Загружено групп:', loadedGroups);
        // Обновляем window.allGroups после загрузки
    } catch (e) {
        showToast('Не удалось загрузить группы, перезагрузите страницу', 'danger', 'Ошибка');
        loadedGroups = [];
    }



    // инициализируем отображение текущей недели и переключение недель
    initDates()
    function initDates() {
        console.log('=== initDates вызвана (проверка дублирования) ===');
        function updateDisplay() {
            const weekEnd = getWeekEnd(weekStart);
            $('#week-dates').text(`${formatDateDDMM(weekStart)} — ${formatDateDDMM(weekEnd)}`);
        }

        updateDisplay();

        // Предыдущая неделя - СОЗДАЕМ НОВЫЙ ОБЪЕКТ
        $('#week-prev').off('click').on('click', () => {
            weekStart = new Date(weekStart);
            weekStart.setDate(weekStart.getDate() - 7);

            updateDisplay();
            renderTable();
        });

        // Следующая неделя - СОЗДАЕМ НОВЫЙ ОБЪЕКТ
        $('#week-next').off('click').on('click', () => {

            weekStart = new Date(weekStart);
            weekStart.setDate(weekStart.getDate() + 7);

            updateDisplay();
            renderTable();
        });
        console.log('=== initDates завершена ===');
    }

    // Настраиваем обработчики
    // wireDepartmentSearch();
    //
    // // Обработчик кнопки добавления кафедры
    // const addDeptBtn = document.getElementById('add-department-btn');
    // if (addDeptBtn) {
    //     addDeptBtn.addEventListener('click', showAdditionalDepartmentModal);
    // }

    // Обработчики кнопок переключения недель
    // const prevWeekBtn = document.getElementById('week-prev');

    // Устанавливаем текущую неделю
    // setWeekUI();

    // Загружаем пары для всех групп на текущую неделю
    // await loadPairsForWeek();

    // // Инициализируем фиксированный ползунок прокрутки
    // initFixedScrollbar();
    //
    // Инициализируем экспорт расписания
    initExportSchedule();
    //
    // // Инициализируем импорт расписания
    // initImportSchedule();

    async function renderTable() {
        if (selectedDepartments.length === 0) console.log(`selectedDepartments.length ${selectedDepartments.length}`)
        if (selectedDepartments.length === 0) return;

        weekPairs = []
        weekPairs = await fetchWeekPairsBatch(dateToIso(weekStart));
        window.weekPairs = weekPairs;

        const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

        console.log('weekStart: ' + weekStart)
        // даты для дней недели
        const dates = Array.from({length: 7}, (_, i) => {
            const date = new Date(weekStart); // клонируем дату
            date.setDate(weekStart.getDate() + i); // добавляем дни
            console.log(date)

            return {
                name: daysOfWeek[date.getDay()],
                dateString: `${formatDateDDMM(date)}`,
                date: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
            };
        });

        const $tbody = $('#grid-body');
        const $headerRow = $('#grid-header-row');
        $tbody.empty();

        // Очищаем заголовки кроме первых двух
        $headerRow.find('th:gt(1)').remove();

        // Добавляем заголовки преподов
        selectedDepartments.forEach(dept => {
            const deptLecturers = loadedLecturers.filter(l => l.department.uuid === dept.uuid)
            console.log("dep: " + dept.name + " lecturers: " + deptLecturers.length)
            deptLecturers.forEach(l => {
                $headerRow.append(`<th class="text-center overflow-hidden no-select p-0" style="font-size:0.75rem">${formatLectFio(l)}</th>`);
            })
            $headerRow.append(`<th class="bg-secondary"></th>`);
        });

        // Время пар
        const lessons = [
            '8:50-10:20',
            '10:40-12:10',
            '13:00-14:30',
            '14:50-16:20',
            '16:40-18:10',
            '18:30-20:00',
            '20:20-21:50',
            '22:10-23:40'
        ];

        // Генерируем таблицу
        dates.forEach((day, dayIndex) => {
            lessons.forEach((time, lessonIndex) => {
                const $row = $('<tr></tr>');

                // Колонка дня (только для первой пары)
                if (lessonIndex === 0) {
                    $row.append(`
                        <td rowspan="${lessons.length}" class="align-middle text-center p-1" style="font-size:0.8rem;width:55px;min-width:55px;max-width:55px">
                            <strong>${day.name}</strong><br>
                            <small class="text-muted" style="font-size:0.65rem">${day.dateString}</small>
                        </td>
                    `);
                }

                // Колонка номера пары и времени
                $row.append(`
                    <td class="text-center p-1" style="min-width: 56px; max-width: 56px; min-height: 40px; max-height: 70px; font-size:0.7rem;">
                        <strong>${lessonIndex + 1} пара</strong><br>
                        <small class="text-muted" style="font-size:0.6rem">${time}</small>
                    </td>
                `);

                // Колонки для преподов (пустые ячейки)
                selectedDepartments.forEach(dept => {
                    const deptLecturers = loadedLecturers.filter(l => l.department.uuid === dept.uuid)
                    deptLecturers.forEach(l => {
                        const $cell = $(`
                            <td class="lesson-cell p-1 position-relative"
                                data-bs-toggle="modal"
                                data-bs-target="#pair-modal"
                                data-day="${dayIndex}" 
                                data-lesson="${lessonIndex}"
                                data-dept="${l.uuid}"
                                id="${day.date}-${lessonIndex+1}-${l.uuid}"
                                style="overflow-x: hidden; overflow-y: auto">
                                <!-- кликните для редактирования -->
                            </td>
                        `);

                        // Вешаем обработчик прямо на элемент
                        $cell.on('click', function() {
                            const date = new Date(weekStart);
                            date.setDate(weekStart.getDate() + dayIndex);

                            const pair = weekPairs.find(p =>
                                p.date === dateToIso(date) &&
                                p.pairOrder === lessonIndex + 1 &&
                                p.lecturers?.some(lec => lec.uuid === l.uuid)
                            );
                            console.log(`переданная дата: ${date} !!!!!!!!!!!!!!!!!!!!!!`)
                            setupPairModal(date, lessonIndex + 1, dept, l, pair);

                        });
                        $row.append($cell);

                    })
                    // ячейка-разделитель
                    $row.append(`
                        <td class="bg-secondary"></td>
                    `);
                });

                $tbody.append($row);
            });
        });

        await renderWeekPairs()
        makeTableResizable();
        if (typeof renderRoomsTable === 'function') renderRoomsTable(weekPairs, loadedRooms);
    }

    async function renderWeekPairs() {

        weekPairs.forEach(pair => {
            pair.lecturers?.forEach(lecturer => {
                let newDate = new Date(pair.date)
                const isLecture = pair.type === 'LECTURE';
                const typeBadge = `<span class="badge ${isLecture ? 'bg-primary' : 'bg-success'} position-absolute top-0 end-0 m-1 fw-normal" style="font-size:.6rem;">${isLecture ? 'Л' : 'П'}</span>`;
                console.log(`#${newDate.getFullYear()}-${newDate.getMonth()}-${newDate.getDate()}-${pair.pairOrder}-${lecturer.uuid}`)
                $(`#${newDate.getFullYear()}-${newDate.getMonth()}-${newDate.getDate()}-${pair.pairOrder}-${lecturer.uuid}`)
                    .html(`
                        ${typeBadge}
                        <div class="row d-flex" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Кубок России">
                            <div class="col-12 text-primary" style="font-size:0.75rem">
                                ${pair.subject?.name}
                            </div>
                            <div class="col-12 ${pair.groups.length === 0 ? 'text-danger' : ''}" style="font-size:0.7rem">
                                Групп: ${pair.groups.length}
                            </div>
                            <div class="col-12 text-muted" style="font-size:0.6rem">
                                Преподавателей: ${pair.lecturers.length}
                            </div>
                        </div>
                    `)
                    .addClass('has-pair')
                    .toggleClass('unapproved', !pair.isActive);
                // Если ячейки нет - jQuery ничего не сделает, ошибки не будет
            });
        });
    }

    // в кафедре модалки нет преподавателей по какой-то причине
    function setupPairModal(date, pairPosition, department, clickedLecturer, pair) {
        let subjects = department.subjects;
        let selectedSubject = pair ? pair.subject : null;
        let selectedRoom = pair ? pair.room : null;
        let selectedLecturers = pair ? loadedLecturers.filter(l => pair.lecturers.some(pl => pl.uuid === l.uuid)) : [clickedLecturer]
        let selectedGroupUuids = new Set(pair?.groups ? pair.groups.map(g => g.uuid) : []);
        let filteredLecturers = loadedLecturers.filter(l => l.department.uuid === department.uuid)

        // Предзаполняем если редактируем
        if (pair) {
            $('#pair-name').val(pair.subject?.name || '');
            if (pair.room) $('#pair-room-search').val(pair.room.title || pair.room.name || '');
            $(`input[name="pairType"][value="${pair.type || 'PRACTICE'}"]`).prop('checked', true);
        } else {
            $('#pair-name').val('');
            $('#pair-room-search').val('');
            $('#type-practice').prop('checked', true);
        }

        // Кнопка удаления: показываем только при редактировании
        const $delBtn = $('#pair-delete');
        if (pair) {
            $delBtn.show();
        } else {
            $delBtn.hide();
        }
        $delBtn.off('click').on('click', async function () {
            if (!pair?.uuid) return;
            try {
                await $.ajax({ url: `/api/pair/${pair.uuid}`, type: 'DELETE' });
                $('#pair-modal').modal('hide');
                showToast('Пара удалена', 'success');
                await renderTable();
            } catch (e) {
                const msg = e.responseJSON?.message || e.statusText || 'Ошибка удаления';
                showToast(msg, 'danger');
            }
        });

        // инициализация предметов
        initModalSubjects('', subjects)
        $('#pair-name').off('input').on('input', function () {
            initModalSubjects($(this).val(), subjects)
        })

        // инициализация комнат
        initModalRooms('');
        $('#pair-room-search').off('input').on('input', function () {
            initModalRooms($(this).val())
        })

        // инициализация преподавателей
        initModalLecturers('');
        $('#lecturer-search').off('input').on('input', function () {
            initModalLecturers($(this).val())
        })

        // инициализация групп
        initModalGroups('');
        $('#pair-groups-search').off('input').on('input', function () {
            initModalGroups($(this).val())
        })

        // Галочка «показывать занятые группы»
        $('#show-busy-groups').off('change').on('change', function () {
            initModalGroups($('#pair-groups-search').val() || '');
        })

        // --- Повтор по неделям ---
        const repeatList = $('#repeat-weeks-list');
        repeatList.empty();
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() + 7); // со следующей недели
        const endDate = new Date(startDate.getFullYear(), 7, 31); // 31 августа
        if (endDate < startDate) endDate.setFullYear(endDate.getFullYear() + 1);
        let hasAny = false;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
            hasAny = true;
            const iso = dateToIso(d);
            repeatList.append(`
                <div class="form-check">
                    <input class="form-check-input repeat-week-cb" type="checkbox" value="${iso}" id="rw-${iso}">
                    <label class="form-check-label" for="rw-${iso}">${formatDateDDMM(d)}</label>
                </div>
            `);
        }
        if (!hasAny) {
            repeatList.html('<div class="text-muted small">Нет доступных недель для повтора</div>');
        }
        $('#repeat-select-all').off('change').on('change', function () {
            $('.repeat-week-cb').prop('checked', this.checked);
        });

        // Синхронизация чекбоксов групп с selectedGroupUuids
        $(document).off('change', '#pair-groups-list input[type="checkbox"]').on('change', '#pair-groups-list input[type="checkbox"]', function () {
            const uuid = $(this).closest('[data-group-uuid]').data('group-uuid');
            if (!uuid) return;
            if (this.checked) {
                selectedGroupUuids.add(uuid);
            } else {
                selectedGroupUuids.delete(uuid);
            }
            renderGroupChips();
        });

        // Сохранение
        $('#pair-save').off('click').on('click', async function () {
            if (!selectedSubject) { showToast('Выберите предмет', 'warning'); return; }
            if (!selectedLecturers.length) { showToast('Выберите минимум одного преподавателя', 'warning'); return; }

            const roomUuid = selectedRoom?.uuid || null;
            const lecturerUuids = selectedLecturers.map(l => l.uuid);
            const groupUuids = [...selectedGroupUuids];

            // Валидация по weekPairs (исключаем саму себя при редактировании)
            const dateIso = dateToIso(date);
            const busyLecs = new Set();
            const busyGrps = new Set();
            const busyRoomUuids = new Set();
            weekPairs.forEach(p => {
                if (p.date === dateIso && p.pairOrder === pairPosition && !(pair && p.uuid === pair.uuid)) {
                    (p.lecturers || []).forEach(l => { if (l.uuid) busyLecs.add(l.uuid); });
                    (p.groups || []).forEach(g => { if (g.uuid) busyGrps.add(g.uuid); });
                    if (p.room?.uuid) busyRoomUuids.add(p.room.uuid);
                }
            });

            const conflictLec = lecturerUuids.find(u => busyLecs.has(u));
            if (conflictLec) {
                const l = loadedLecturers.find(ll => ll.uuid === conflictLec);
                showToast(`Преподаватель занят: ${l ? l.lastName + ' ' + l.firstName : conflictLec}`, 'danger');
                return;
            }

            const conflictGrp = groupUuids.find(u => busyGrps.has(u));
            if (conflictGrp) {
                const g = loadedGroups.find(gg => gg.uuid === conflictGrp);
                showToast(`Группа занята: ${g ? g.groupName : conflictGrp}`, 'danger');
                return;
            }

            if (roomUuid && busyRoomUuids.has(roomUuid)) {
                showToast(`Аудитория занята: ${selectedRoom.title || selectedRoom.name}`, 'danger');
                return;
            }

            const payload = {
                uuid: pair?.uuid || null,
                subjectUuid: selectedSubject.uuid || selectedSubject.id,
                pairOrder: pairPosition,
                date: dateIso,
                roomUuid,
                lecturerUuids,
                groupUuids,
                type: $('input[name="pairType"]:checked').val() || 'PRACTICE'
            };

            // Сохраняем основную пару
            try {
                await $.ajax({
                    url: '/api/pair',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(payload)
                });
            } catch (e) {
                const msg = e.responseJSON?.message || e.statusText || 'Ошибка сохранения';
                showToast(msg, 'danger');
                return;
            }

            // Повторы по неделям
            const repeatDates = $('.repeat-week-cb:checked').map(function () { return $(this).val(); }).get();
            let ok = 1, fail = 0;
            for (const rd of repeatDates) {
                const rp = { ...payload, uuid: null, date: rd };
                try {
                    await $.ajax({ url: '/api/pair', type: 'POST', contentType: 'application/json', data: JSON.stringify(rp) });
                    ok++;
                } catch (e) {
                    fail++;
                    const msg = e.responseJSON?.message || e.statusText || 'Ошибка';
                    showToast(`${formatDateDDMM(new Date(rd + 'T00:00:00'))}: ${msg}`, 'danger');
                }
            }

            $('#pair-modal').modal('hide');
            const sumMsg = `Сохранено пар: ${ok}` + (fail ? `, не сохранено: ${fail}` : '');
            showToast(sumMsg, fail ? 'warning' : 'success');
            await renderTable();
        });


        function initModalSubjects(q, subjects) {
            const filteredSubjects = subjects.filter(d => d.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
            let $subjectDd = $('#pair-subject-dropdown')
            $subjectDd.empty();
            if (filteredSubjects.length === 0) {
                $subjectDd.append(`
                    <div class="dropdown-item text-muted py-2 px-3">
                        Предметы не найдены
                    </div>
                `);
            } else {
                filteredSubjects.forEach(s => {
                    let $ddElement = $(`
                        <a href="#" class="dropdown-item py-2 px-3 text-wrap border"
                           data-subject-id="${s.id || s.uuid}">
                            ${s.name}
                        </a>
                    `);
                    // при нажатии добавляем предмет в выбранный и добавляем в инпут
                    $ddElement.off('click').on('click', function () {
                        $('#pair-name').val(s.name)
                        selectedSubject = s
                        console.log("выбрана пара: " + selectedSubject.name)
                    });
                    $subjectDd.append($ddElement);
                })
            }
        }
        function initModalRooms(q) {
            const natCmp = (a, b) => {
                const numA = parseInt(a.title, 10), numB = parseInt(b.title, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB || a.title.localeCompare(b.title, 'ru');
                return a.title.localeCompare(b.title, 'ru');
            };
            let freeRooms = weekPairs.length > 0 ? loadedRooms.filter(r => !weekPairs.some(p => p.room && p.room.uuid === r.uuid && p.date === dateToIso(date) && p.pairOrder === pairPosition && !(pair && p.uuid === pair.uuid))).filter(r => r.title.toLowerCase().includes(q.toLowerCase())) : loadedRooms;
            let busyRooms = weekPairs.length > 0 ? loadedRooms.filter(r => weekPairs.some(p => p.room && p.room.uuid === r.uuid && p.date === dateToIso(date) && p.pairOrder === pairPosition && !(pair && p.uuid === pair.uuid))).filter(r => r.title.toLowerCase().includes(q.toLowerCase())) : [];
            freeRooms.sort(natCmp);
            busyRooms.sort(natCmp);
            console.log(`свободно комнат: ${freeRooms.length}; занято комнат: ${busyRooms.length}`)
            let $roomsDd = $('#pair-room-dropdown')
            $roomsDd.empty();
            freeRooms.forEach(fr => {
                let $roomEl = $(`
                    <a href="#" class="dropdown-item py-2 px-3 text-wrap border">${fr.title}</a>
                `);
                $roomEl.off('click').on('click', function () {
                    $('#pair-room-search').val(fr.title);
                    selectedRoom = fr;
                });
                $roomsDd.append($roomEl);
            })
            if (busyRooms.length) {
                if (freeRooms.length) $roomsDd.append('<div class="dropdown-divider my-1"></div>');
                busyRooms.forEach(br => {
                    $roomsDd.append(`<div class="dropdown-item py-2 px-3 text-muted small" style="cursor:not-allowed">${br.title} 🔒</div>`);
                });
            }
        }

        function initModalLecturers(q) {
            console.log("lecturers for modal:")
            filteredLecturers.forEach(l => {
                console.log(l);
            })
            $('#selected-lecturers').empty()
            selectedLecturers.forEach(l => {
                const $chip = $(`
                    <span class="badge bg-primary me-2 mb-2 p-2 d-inline-flex align-items-center roboto-all-font fw-light lecturer-chip">
                        ${l.lastName} ${l.firstName[0]}.${l.patronymic[0]}.
                        <button type="button" class="btn-close btn-close-white ms-2" aria-label="Удалить"></button>
                    </span>
                `);

                $chip.find('.btn-close.btn-close-white').on('click', function () {
                    $(this).closest('.lecturer-chip').remove();
                    selectedLecturers = selectedLecturers.filter(sl => sl.uuid !== l.uuid)
                    initModalLecturers(q)
                })

                $('#selected-lecturers').append($chip);
            })

            $('#lecturer-dropdown-list').empty()
            filteredLecturers.filter(fl => !weekPairs.some(p => !(pair && p.uuid === pair.uuid) && p.lecturers.some(pl => fl.uuid === pl.uuid && p.date === dateToIso(date) && p.pairOrder === pairPosition))).filter(l => !selectedLecturers.some(sl => sl.uuid === l.uuid)).filter(l => `${l.lastName} ${l.firstName} ${l.patronymic}`.toLowerCase().includes(q.toLowerCase())).forEach(l => {
                let $ddElement = $(`
                    <a href="#" class="dropdown-item py-2 px-3 text-wrap border">${l.lastName} ${l.firstName} ${l.patronymic}</a>
                `);
                $ddElement.on('click', function () {
                    $('#lecturer-search').val('');
                    selectedLecturers.push(l)
                    initModalLecturers('')
                })
                $('#lecturer-dropdown-list').append($ddElement);
            })
        }

        function renderGroupChips() {
            const $cont = $('#modal-groups-container');
            $cont.empty();
            if (!selectedGroupUuids.size) {
                $cont.html('<div class="text-muted small">Выбранные группы появятся здесь</div>');
                return;
            }
            selectedGroupUuids.forEach(uuid => {
                const g = loadedGroups.find(gg => gg.uuid === uuid);
                const name = g ? (g.groupName || g.name || uuid) : uuid;
                const $chip = $(`
                    <span class="badge bg-success me-2 mb-2 p-2 d-inline-flex align-items-center group-chip fw-normal">
                        ${name}
                        <button type="button" class="btn-close btn-close-white ms-2" style="font-size:.5em;" aria-label="Удалить"></button>
                    </span>
                `);
                $chip.find('.btn-close').on('click', function () {
                    selectedGroupUuids.delete(uuid);
                    $(`#grp-${uuid}`).prop('checked', false);
                    renderGroupChips();
                });
                $cont.append($chip);
            });
        }

        function initModalGroups(q) {
            const showBusy = $('#show-busy-groups').is(':checked');

            // Занятые группы (UUID) в этот слот, исключая саму редактируемую пару
            const busyUuids = new Set();
            const dateIso = dateToIso(date);
            weekPairs.forEach(p => {
                if (p.date === dateIso && p.pairOrder === pairPosition && !(pair && p.uuid === pair.uuid)) {
                    (p.groups || []).forEach(g => { if (g.uuid) busyUuids.add(g.uuid); });
                }
            });

            const filteredLoadedGroups = loadedGroups.filter(g => {
                const s = `${g.course} курс ${formatEducationForm(g.educationForm)} ${g.faculty} ${g.direction} ${g.specialization} ${g.groupName}`.toLowerCase();
                return s.includes(q.toLowerCase());
            });

            let groupsByCourseAndForm = {};
            let hasVisible = false;

            filteredLoadedGroups.forEach(loadedGroup => {
                const isBusy = busyUuids.has(loadedGroup.uuid);
                if (isBusy && !showBusy) return; // скрываем занятые
                hasVisible = true;

                const course = loadedGroup.course;
                const educationForm = loadedGroup.educationForm;

                if (!groupsByCourseAndForm[course]) groupsByCourseAndForm[course] = {};
                if (!groupsByCourseAndForm[course][educationForm]) groupsByCourseAndForm[course][educationForm] = [];
                groupsByCourseAndForm[course][educationForm].push({ group: loadedGroup, isBusy });
            });

            let $groupsContainer = $('#pair-groups-list');
            $groupsContainer.empty();

            if (!hasVisible) {
                $groupsContainer.html('<div class="text-muted">Нет групп для отображения</div>');
                return;
            }

            const sortedCourses = Object.keys(groupsByCourseAndForm).map(Number).sort((a, b) => a - b);
            sortedCourses.forEach(course => {
                $groupsContainer.append(`<div class="fw-bold text-primary mt-2">${course} курс</div>`);
                const forms = groupsByCourseAndForm[course];
                Object.keys(forms).sort().forEach(formCode => {
                    $groupsContainer.append(`<div class="fw-semibold text-secondary ms-3">${formatEducationForm(formCode)}</div>`);
                    const groups = forms[formCode];
                    groups.sort((a, b) => (a.group.groupName || '').localeCompare(b.group.groupName || '', 'ru'));
                    groups.forEach(({ group, isBusy }) => {
                        if (isBusy) {
                            $groupsContainer.append(`
                                <div class="ms-5 text-muted ps-4 mb-1" style="opacity:0.5" data-group-uuid="${group.uuid}">
                                    ${group.groupName} <span class="small">(занята)</span>
                                </div>
                            `);
                        } else {
                            $groupsContainer.append(`
                                <div class="form-check ms-5 mb-1" data-group-uuid="${group.uuid}">
                                    <input class="form-check-input" type="checkbox" id="grp-${group.uuid}">
                                    <label class="form-check-label" for="grp-${group.uuid}"><b>${group.groupName}</b> ${group.specialization.length > 1 ? '— ' + group.specialization : ''} ${Array.from(group.kindsOfSports).join(', ').length > 0 ? '— ' + Array.from(group.kindsOfSports).join(', ') : ''} ${group.direction.length > 1 ? '— ' + group.direction : ''}</label>
                                </div>
                            `);
                        }
                    });
                });
            });

            // Восстанавливаем чекбоксы из состояния (переживают перерисовку)
            selectedGroupUuids.forEach(uuid => {
                $(`#grp-${uuid}`).prop('checked', true);
            });
            renderGroupChips();
        }

    }

    function makeTableResizable() {
        let dragging = null;

        // Добавляем курсор при наведении на правый край заголовков преподавателей
        $(document)
            .on('mouseenter', '#grid-header-row th.text-center.overflow-hidden', function() {
                $(this).css('cursor', 'col-resize');
            })
            .on('mousedown', '#grid-header-row th.text-center.overflow-hidden', function(e) {
                // Если клик в пределах 10px от правого края
                    dragging = {
                        el: this,
                        x: e.pageX,
                        w: $(this).width()
                    };
                    $('body').css('cursor', 'col-resize');
                    e.preventDefault();
                    return false; // Предотвращаем выделение текста

            })
            .on('mousemove', function(e) {
                if (!dragging) return;
                // Отключаем выделение текста при перетаскивании
                e.preventDefault();
                const newWidth = Math.max(5, dragging.w + (e.pageX - dragging.x));
                $(dragging.el).css({
                    'min-width': newWidth + 'px',
                    'max-width': newWidth + 'px',
                    'width': newWidth + 'px' // Добавляем width для надежности
                });
            })
            .on('mouseup', function() {
                if (dragging) {
                    $('body').css('cursor', '');
                    dragging = null;
                }
            });

        // Отключаем выделение текста при начале перетаскивания
        $('#grid-header-row').on('selectstart', '.text-center.overflow-hidden', function(e) {
            if (dragging) e.preventDefault();
        });
    }

    // --- Утверждение расписания ---
    $('#approve-schedule-btn').on('click', function () {
        const $list = $('#approve-dept-list');
        $list.empty();
        loadedDepartments.forEach(d => {
            $list.append(`
                <div class="form-check">
                    <input class="form-check-input approve-dept-cb" type="checkbox" value="${d.uuid}" id="appr-${d.uuid}" />
                    <label class="form-check-label" for="appr-${d.uuid}">${d.name}</label>
                </div>
            `);
        });
        $('#approve-select-all').prop('checked', false);
        new bootstrap.Modal(document.getElementById('approveScheduleModal')).show();
    });

    $('#approve-select-all').on('change', function () {
        $('.approve-dept-cb').prop('checked', this.checked);
    });

    $('#approve-confirm-btn').on('click', async function () {
        const uuids = $('.approve-dept-cb:checked').map(function () { return $(this).val(); }).get();
        if (!uuids.length) { showToast('Выберите хотя бы одну кафедру', 'warning'); return; }
        try {
            const resp = await $.ajax({
                url: '/api/pair/approve',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ departmentUuids: uuids })
            });
            bootstrap.Modal.getInstance(document.getElementById('approveScheduleModal')).hide();
            showToast(`Утверждено пар: ${resp}`, 'success');
            await renderTable();
        } catch (e) {
            showToast('Ошибка утверждения: ' + (e.responseJSON?.message || e.statusText), 'danger');
        }
    });

    console.log('init COMPLETE');
    console.log('Ready for work - departments:', loadedDepartments.length, 'rooms:', loadedRooms.length);
}

document.addEventListener('DOMContentLoaded', init);

// ========================== Export functions ==========================

function formatDateLocal(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toWeekStart(dateIso) {
    const date = new Date(dateIso);
    const monday = startOfWeekMonday(date);
    return formatDateLocal(monday);
}

function toWeekEnd(dateIso) {
    const date = new Date(dateIso);
    const sunday = endOfWeekSunday(date);
    return formatDateLocal(sunday);
}

function toggleExportModal(show) {
    const el = document.getElementById('export-modal');
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
        if (dialog) {
            dialog.style.marginTop = '5vh';
            dialog.style.maxWidth = '90%';
            dialog.style.width = '90%';
            dialog.style.maxHeight = '85vh';
        }
        const groupsList = el.querySelector('#export-groups-list');
        if (groupsList) {
            groupsList.style.maxHeight = '50vh';
            groupsList.style.overflowY = 'auto';
        }
    } else {
        el.style.background = '';
        const dialog = el.querySelector('.modal-dialog');
        if (dialog) {
            dialog.style.marginTop = '';
            dialog.style.maxWidth = '';
            dialog.style.width = '';
            dialog.style.maxHeight = '';
        }
    }
    try {
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    } catch (_) {}
}

function buildExportGroupsList(selectedUuids) {
    const listEl = document.getElementById('export-groups-list');
    if (!listEl) return;

    const selected = new Set(selectedUuids || []);
    listEl.innerHTML = '';

    const groups = loadedGroups;
    if (!groups.length) {
        listEl.innerHTML = '<div class="text-muted">Группы не загружены</div>';
        return;
    }

    // Группируем по курсу и форме обучения (как в модалке создания пары)
    const groupsByCourseAndForm = {};
    groups.forEach(g => {
        if (!g) return;
        const course = g.course ?? 0;
        const form = g.educationForm || 'FULL_TIME';
        if (!groupsByCourseAndForm[course]) groupsByCourseAndForm[course] = {};
        if (!groupsByCourseAndForm[course][form]) groupsByCourseAndForm[course][form] = [];
        groupsByCourseAndForm[course][form].push(g);
    });

    const sortedCourses = Object.keys(groupsByCourseAndForm).map(Number).sort((a, b) => a - b);
    sortedCourses.forEach(course => {
        const courseDiv = document.createElement('div');
        courseDiv.className = 'fw-bold text-primary mt-2';
        courseDiv.textContent = `${course} курс`;
        listEl.appendChild(courseDiv);

        const forms = groupsByCourseAndForm[course];
        Object.keys(forms).sort().forEach(formCode => {
            const formDiv = document.createElement('div');
            formDiv.className = 'fw-semibold text-secondary ms-3';
            formDiv.textContent = formatEducationForm(formCode);
            listEl.appendChild(formDiv);

            const groupList = forms[formCode];
            groupList.sort((a, b) => (a.groupName || '').localeCompare(b.groupName || '', 'ru'));
            groupList.forEach(group => {
                const item = document.createElement('div');
                item.className = 'form-check ms-5 mb-1';
                item.setAttribute('data-group-uuid', group.uuid);

                const checkbox = document.createElement('input');
                checkbox.className = 'form-check-input';
                checkbox.type = 'checkbox';
                checkbox.id = `export-group-${group.uuid}`;
                checkbox.checked = selected.has(group.uuid);

                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = `export-group-${group.uuid}`;

                // Формат как в модалке создания пары: <b>groupName</b> — specialization — kindsOfSports — direction
                let labelText = `<b>${group.groupName || ''}</b>`;
                if (group.specialization && group.specialization.length > 1) {
                    labelText += ` — ${group.specialization}`;
                }
                if (group.kindsOfSports && group.kindsOfSports.length > 0) {
                    labelText += ` — ${Array.from(group.kindsOfSports).join(', ')}`;
                }
                if (group.direction && group.direction.length > 1) {
                    labelText += ` — ${group.direction}`;
                }

                label.innerHTML = labelText;

                item.appendChild(checkbox);
                item.appendChild(label);
                listEl.appendChild(item);
            });
        });
    });
}

function filterExportGroups(query) {
    const listEl = document.getElementById('export-groups-list');
    if (!listEl) return;

    const q = (query || '').toLowerCase();
    const groupItems = listEl.querySelectorAll('[data-group-uuid]');
    groupItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = !q || text.includes(q) ? '' : 'none';
    });

    // Управляем видимостью заголовков курсов и форм обучения
    const allDivs = Array.from(listEl.children);
    allDivs.forEach(div => {
        if (div.classList.contains('fw-bold') || div.classList.contains('fw-semibold')) {
            // Проверяем следующие элементы до следующего заголовка того же или выше уровня
            let hasVisible = false;
            let next = div.nextElementSibling;
            while (next && !next.classList.contains('fw-bold')) {
                if (next.hasAttribute('data-group-uuid') && next.style.display !== 'none') {
                    hasVisible = true;
                    break;
                }
                const inner = next.querySelectorAll?.('[data-group-uuid]');
                if (inner) {
                    for (const ig of inner) {
                        if (ig.style.display !== 'none') { hasVisible = true; break; }
                    }
                    if (hasVisible) break;
                }
                next = next.nextElementSibling;
            }
            div.style.display = hasVisible || !q ? '' : 'none';
        }
    });
}

function getSelectedExportGroupUuids() {
    const checkboxes = document.querySelectorAll('#export-groups-list input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.closest('[data-group-uuid]').getAttribute('data-group-uuid'));
}

function initExportSchedule() {
    // Кнопка экспорта
    const exportBtn = document.getElementById('export-schedule');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const from = document.getElementById('export-from');
            const to = document.getElementById('export-to');

            const today = new Date();
            const monday = startOfWeekMonday(new Date(today));
            const sunday = endOfWeekSunday(new Date(today));

            if (from) from.value = formatDateLocal(monday);
            if (to) to.value = formatDateLocal(sunday);

            // Сбрасываем на режим «для студентов»
            document.getElementById('export-mode-students').checked = true;
            switchExportMode('students');

            buildExportGroupsList(getSelectedExportGroupUuids());
            toggleExportModal(true);
        });
    }

    // Переключатель режима
    document.querySelectorAll('input[name="export-mode"]').forEach(radio => {
        radio.addEventListener('change', function () {
            switchExportMode(this.value);
        });
    });

    function switchExportMode(mode) {
        const groupsWrap = document.getElementById('export-groups-wrap');
        const groupsSearch = document.getElementById('export-groups-search');
        const deptWrap = document.getElementById('export-department-wrap');
        const hint = document.getElementById('export-hint');

        if (mode === 'lecturers') {
            if (groupsWrap) groupsWrap.style.display = 'none';
            if (groupsSearch) groupsSearch.style.display = 'none';
            if (deptWrap) deptWrap.style.display = '';
            if (hint) hint.textContent = 'Будет выгружено расписание для преподавателей выбранной кафедры.';
            populateDepartmentDropdown();
        } else {
            if (groupsWrap) groupsWrap.style.display = '';
            if (groupsSearch) groupsSearch.style.display = '';
            if (deptWrap) deptWrap.style.display = 'none';
            if (hint) hint.textContent = 'Будет выгружено расписание для выбранных групп за указанный период.';
        }
    }

    function populateDepartmentDropdown() {
        const sel = document.getElementById('export-department');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Выберите кафедру --</option>';
        loadedDepartments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept.uuid;
            opt.textContent = dept.name || dept.uuid;
            sel.appendChild(opt);
        });
    }

    // Поиск групп
    const searchInput = document.getElementById('export-groups-search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => filterExportGroups(e.target.value), 300);
        });
    }

    // Кнопки модалки
    const exportClose = document.getElementById('export-close');
    const exportCancel = document.getElementById('export-cancel');
    const exportConfirm = document.getElementById('export-confirm');

    if (exportClose) exportClose.addEventListener('click', () => toggleExportModal(false));
    if (exportCancel) exportCancel.addEventListener('click', () => toggleExportModal(false));

    if (exportConfirm) {
        exportConfirm.addEventListener('click', async () => {
            const from = document.getElementById('export-from');
            const to = document.getElementById('export-to');
            const fromIso = from && from.value ? from.value : dateIsoFor(new Date());
            const toIso = to && to.value ? to.value : dateIsoFor(new Date());

            if (!fromIso || !toIso) {
                showToast('Укажите период экспорта', 'warning', 'Ошибка');
                return;
            }

            const mode = document.querySelector('input[name="export-mode"]:checked')?.value || 'students';
            let payload = { from: toWeekStart(fromIso), to: toWeekEnd(toIso) };

            if (mode === 'lecturers') {
                const deptSel = document.getElementById('export-department');
                const deptUuid = deptSel?.value;
                if (!deptUuid) {
                    showToast('Выберите кафедру для экспорта', 'warning', 'Ошибка');
                    return;
                }
                payload.departmentUuid = deptUuid;
            } else {
                const groupUuids = getSelectedExportGroupUuids();
                if (!groupUuids.length) {
                    showToast('Выберите хотя бы одну группу для экспорта', 'warning', 'Ошибка');
                    return;
                }
                payload.groups = groupUuids;
            }

            try {
                const { blob, filename } = await exportScheduleExcel(payload);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename || 'schedule.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toggleExportModal(false);
                showToast('Экспорт выполнен', 'success', 'Успех');
            } catch (e) {
                console.error('Export failed', e);
                showToast('Не удалось экспортировать расписание', 'danger', 'Ошибка');
            }
        });
    }

    // =========== Создание группы ===========
    async function loadFaculties() {
        try {
            const response = await fetch('/api/group/faculties');
            if (!response.ok) throw new Error('Failed to load faculties');
            const faculties = await response.json();
            const datalist = document.getElementById('faculty-datalist');
            datalist.innerHTML = '';
            faculties.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                datalist.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load faculties', e);
        }
    }

    async function createGroup() {
        const groupName = $('#group-name-input').val().trim();
        const course = parseInt($('#group-course-input').val(), 10);
        const educationForm = $('#group-eduform-input').val();
        const direction = $('#group-direction-input').val().trim();
        const faculty = $('#group-faculty-input').val().trim();
        const specialization = $('#group-specialization-input').val().trim();
        const sportsRaw = $('#group-sports-input').val().trim();

        if (!groupName || !course || !educationForm || !direction || !faculty) {
            showToast('Заполните все обязательные поля', 'warning', 'Ошибка');
            return;
        }

        const kindsOfSports = sportsRaw
            ? sportsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0)
            : [];

        const body = {
            groupName,
            course,
            educationForm,
            direction,
            faculty,
            specialization: specialization || null,
            kindsOfSports: kindsOfSports.length > 0 ? kindsOfSports : null
        };

        try {
            const response = await fetch('/api/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Ошибка создания группы');
            }
            const created = await response.json();
            showToast(`Группа «${created.groupName}» создана`, 'success', 'Успех');

            // Очищаем форму и закрываем модалку
            document.getElementById('create-group-form').reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('create-group-modal'));
            modal.hide();

            // Перезагружаем группы
            loadedGroups = await fetchGroups('');
            window.allGroups = loadedGroups;
        } catch (e) {
            console.error('Failed to create group', e);
            showToast(e.message || 'Не удалось создать группу', 'danger', 'Ошибка');
        }
    }

    // Привязываем события
    document.addEventListener('DOMContentLoaded', () => {
        const groupModal = document.getElementById('create-group-modal');
        if (groupModal) {
            groupModal.addEventListener('show.bs.modal', loadFaculties);
        }
    });

    $('#create-group-confirm-btn').on('click', createGroup);
}