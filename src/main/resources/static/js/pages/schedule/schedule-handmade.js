import {
    fetchDepartments,
    fetchLecturers,
    fetchRooms,
    fetchGroups,
    fetchWeekPairsBatch
} from "./api.js"
import {showToast, getWeekStart, getWeekEnd, formatDateDDMM, formatLectFio, formatEducationForm, dateToIso} from "./utils.js";

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
    // // Инициализируем экспорт расписания
    // initExportSchedule();
    //
    // // Инициализируем импорт расписания
    // initImportSchedule();

    async function renderTable() {
        if (selectedDepartments.length === 0) console.log(`selectedDepartments.length ${selectedDepartments.length}`)
        if (selectedDepartments.length === 0) return;

        weekPairs = []
        weekPairs = await fetchWeekPairsBatch(dateToIso(weekStart));
        window.weekPairs = weekPairs;

        const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда',
            'Четверг', 'Пятница', 'Суббота'];

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
                $headerRow.append(`<th class="text-center overflow-hidden no-select p-0">${formatLectFio(l)}</th>`);
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
                        <td rowspan="${lessons.length}" class="align-middle text-center p-1">
                            <strong>${day.name}</strong><br>
                            <small class="text-muted">${day.dateString}</small>
                        </td>
                    `);
                }

                // Колонка номера пары и времени
                $row.append(`
                    <td class="text-center p-1" style="min-width: 86px; max-width: 86px; min-height: 40px; max-height: 70px;">
                        <strong>${lessonIndex + 1} пара</strong><br>
                        <small class="text-muted">${time}</small>
                    </td>
                `);

                // Колонки для преподов (пустые ячейки)
                selectedDepartments.forEach(dept => {
                    const deptLecturers = loadedLecturers.filter(l => l.department.uuid === dept.uuid)
                    deptLecturers.forEach(l => {
                        const $cell = $(`
                            <td class="lesson-cell p-1" 
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
    }

    async function renderWeekPairs() {

        weekPairs.forEach(pair => {
            pair.lecturers?.forEach(lecturer => {
                let newDate = new Date(pair.date)
                console.log(`#${newDate.getFullYear()}-${newDate.getMonth()}-${newDate.getDate()}-${pair.pairOrder}-${lecturer.uuid}`)
                $(`#${newDate.getFullYear()}-${newDate.getMonth()}-${newDate.getDate()}-${pair.pairOrder}-${lecturer.uuid}`)
                    .html(`
                        <div class="row d-flex" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Кубок России">
                            <div class="col-12 text-primary">
                                ${pair.subject?.name}
                            </div>
                            <div class="col-12 fs-6">
                                Групп: ${pair.groups.length}
                            </div>
                            <div class="col-12 text-muted fs-7">
                                Преподавателей: ${pair.lecturers.length}
                            </div>
                        </div>
                    `)
                    .addClass('has-pair');
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
        let filteredLecturers = loadedLecturers.filter(l => l.department.uuid === department.uuid)

        // Предзаполняем если редактируем
        if (pair) {
            $('#pair-name').val(pair.subject?.name || '');
            if (pair.room) $('#pair-room-search').val(pair.room.title || pair.room.name || '');
        } else {
            $('#pair-name').val('');
            $('#pair-room-search').val('');
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

        // Сохранение
        $('#pair-save').off('click').on('click', async function () {
            if (!selectedSubject) { showToast('Выберите предмет', 'warning'); return; }
            if (!selectedLecturers.length) { showToast('Выберите минимум одного преподавателя', 'warning'); return; }

            const roomUuid = selectedRoom?.uuid || null;
            const lecturerUuids = selectedLecturers.map(l => l.uuid);
            const groupUuids = [];
            $('#pair-groups-list input[type="checkbox"]:checked').each(function () {
                const uuid = $(this).closest('[data-group-uuid]').data('group-uuid');
                if (uuid) groupUuids.push(uuid);
            });

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

            // Отправляем
            const payload = {
                uuid: pair?.uuid || null,
                subjectUuid: selectedSubject.uuid || selectedSubject.id,
                pairOrder: pairPosition,
                date: dateIso,
                roomUuid,
                lecturerUuids,
                groupUuids
            };

            try {
                await $.ajax({
                    url: '/api/pair',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(payload)
                });
                $('#pair-modal').modal('hide');
                showToast('Пара сохранена', 'success');
                await renderTable();
            } catch (e) {
                const msg = e.responseJSON?.message || e.statusText || 'Ошибка сохранения';
                showToast(msg, 'danger');
            }
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
            console.log('firstLoadedRoom: ')
            console.log(loadedRooms[0]);
            console.log(weekPairs[0]);
            let freeRooms = weekPairs.length > 0 ? loadedRooms.filter(r => !weekPairs.some(p => p.room && p.room.uuid === r.uuid && p.date === dateToIso(date) && p.pairOrder === pairPosition && !(pair && p.uuid === pair.uuid))).filter(r => r.title.toLowerCase().includes(q.toLowerCase())) : loadedRooms;
            let busyRooms = weekPairs.length > 0 ?loadedRooms.filter(r => weekPairs.some(p => p.room && p.room.uuid === r.uuid && p.date === dateToIso(date) && p.pairOrder === pairPosition && !(pair && p.uuid === pair.uuid))).filter(r => r.title.toLowerCase().includes(q.toLowerCase())) : [];
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
                                <div class="form-check ms-5" data-group-uuid="${group.uuid}">
                                    <input class="form-check-input" type="checkbox" id="grp-${group.uuid}">
                                    <label class="form-check-label" for="grp-${group.uuid}">${group.groupName}</label>
                                </div>
                            `);
                        }
                    });
                });
            });

            // Отмечаем уже выбранные группы (если редактируем)
            if (pair?.groups) {
                pair.groups.forEach(g => {
                    $(`#grp-${g.uuid}`).prop('checked', true);
                });
            }
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
                const newWidth = Math.max(10, dragging.w + (e.pageX - dragging.x));
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

    console.log('init COMPLETE');
    console.log('Ready for work - departments:', loadedDepartments.length, 'rooms:', loadedRooms.length);
}

document.addEventListener('DOMContentLoaded', init);