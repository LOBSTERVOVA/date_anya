// import {formatLectFio, formatEducationForm, showToast} from '../utils.js'
//
// /**
//  * Находит кафедру преподавателя по UUID
//  * @param {string} lecturerUuid - UUID преподавателя
//  * @returns {Object|null} - объект кафедры или null
//  */
// export function findDepartmentByLecturerUuid(lecturerUuid) {
//     for (const dept of window.selectedDepartments) {
//         if (dept.lecturers && dept.lecturers.some(lect => lect.uuid === lecturerUuid)) {
//             return dept;
//         }
//     }
//     return null;
// }
//
// /**
//  * Открывает модалку для создания/редактирования пары
//  * @param {jQuery} $cell - ячейка таблицы для которой открывается модалка
//  * @param {boolean} lockCell - блокировать ли ячейку от изменений другими пользователями
//  */
// export async function openPairModalForCell($cell, lockCell = false) {
//     console.log('openPairModalForCell START');
//
//     // Получаем данные ячейки
//     const lectUuid = $cell.data('lecturer-uuid');
//     const dayIdx = Number($cell.data('day-idx')) || 0;
//     const pairOrder = Number($cell.data('pair-order')) || 0;
//
//     if (!lectUuid) {
//         return;
//     }
//
//     // Ищем существующие пары для этой ячейки
//     const cellKeyStr = cellKey(lectUuid, dayIdx, pairOrder);
//     const existingPairs = window.currentTableData[cellKeyStr] || [];
//
//     // Находим модалку в DOM
//     const $modal = $('#pair-modal');
//     if (!$modal.length) {
//         return;
//     }
//
//     // Сохраняем данные в модалку
//     $modal.data('lectUuid', lectUuid);
//     $modal.data('dayIdx', dayIdx);
//     $modal.data('pairOrder', pairOrder);
//     $modal.data('existing', existingPairs);
//     $modal.data('lockCell', lockCell);
//
//     // Очищаем форму
//     clearPairModal();
//
//     // Устанавливаем кафедру текущего преподавателя
//     window.currentLecturerDepartment = findDepartmentByLecturerUuid(lectUuid);
//     console.log('Current lecturer department:', window.currentLecturerDepartment?.name);
//
//     // Инициализируем список групп (делаем это ПЕРЕД загрузкой существующих пар)
//     renderGroupsList(window.allGroups);
//
//     // Если есть существующие пары, загружаем их данные
//     if (existingPairs.length > 0) {
//         await loadExistingPairsToModal(existingPairs);
//     } else {
//         // Если ячейка пустая, добавляем преподавателя этой ячейки
//         const lecturer = findLecturerByUuid(lectUuid);
//         if (lecturer && !window.selectedLecturers.some(l => l.uuid === lectUuid)) {
//             window.selectedLecturers.push(lecturer);
//             updateSelectedLecturersDisplay();
//         }
//     }
//
//     // Загружаем свободные аудитории для выбранного времени
//     await loadFreeRoomsForTime(dayIdx, pairOrder);
//
//     // Инициализируем обработчики формы
//     initPairModalHandlers();
//
//     // Показываем модалку
//     $modal.modal('show');
//
//     window.currentModalCell = $cell;
//     console.log('Pair modal opened for cell:', cellKeyStr);
// }
//
// /**
//  * Очищает форму модалки
//  */
// export function clearPairModal() {
//     console.log('clearPairModal START');
//
//     // Очищаем поля
//     $('#pair-name').val('').removeAttr('data-selected-subject-uuid');
//     $('#pair-room-search').val('').removeAttr('data-selected-room-uuid');
//     $('#pair-groups-search').val('');
//     $('#lecturer-search').val('');
//
//     // Очищаем выбранных преподавателей
//     window.selectedLecturers = [];
//     updateSelectedLecturersDisplay();
//
//     // Очищаем выбранные группы
//     $('#pair-groups-list').empty();
//     $('#show-busy-groups').prop('checked', false);
//
//     // Очищаем выпадающие списки
//     $('#lecturer-dropdown-list').empty();
//     $('#pair-room-dropdown').empty();
//
//     // Очищаем кафедру преподавателя
//     window.currentLecturerDepartment = null;
//
//     // Сбрасываем ограничения групп
//     window.selectedCourse = null;
//     window.selectedEducationForm = null;
//
//     console.log('Pair modal cleared');
// }
//
// /**
//  * Загружает данные существующих пар в модалку
//  * @param {Array} pairs - массив существующих пар
//  */
// export async function loadExistingPairsToModal(pairs) {
//     console.log('loadExistingPairsToModal START, pairs:', pairs.length);
//
//     if (!pairs.length) return;
//
//     // Берем первую пару как основную
//     const mainPair = pairs[0];
//
//     // Загружаем название предмета
//     const subjectName = mainPair.subject?.name || mainPair.name || '';
//     $('#pair-name').val(subjectName);
//     if (mainPair.subject?.uuid) {
//         $('#pair-name').attr('data-selected-subject-uuid', mainPair.subject.uuid);
//     }
//
//     // Загружаем аудиторию
//     if (mainPair.room) {
//         const roomName = mainPair.room.name || mainPair.room.title || '';
//         $('#pair-room-search').val(roomName);
//         if (mainPair.room.uuid) {
//             $('#pair-room-search').attr('data-selected-room-uuid', mainPair.room.uuid);
//         }
//     }
//
//     // Собираем всех преподавателей из пар
//     const lecturerUuids = new Set();
//     pairs.forEach(pair => {
//         if (pair.lecturers && Array.isArray(pair.lecturers)) {
//             pair.lecturers.forEach(l => {
//                 if (l.uuid) lecturerUuids.add(l.uuid);
//             });
//         } else if (pair.lecturer && pair.lecturer.uuid) {
//             lecturerUuids.add(pair.lecturer.uuid);
//         }
//     });
//
//     // Находим и добавляем преподавателей
//     lecturerUuids.forEach(uuid => {
//         const lecturer = findLecturerByUuid(uuid);
//         if (lecturer && !window.selectedLecturers.some(l => l.uuid === uuid)) {
//             window.selectedLecturers.push(lecturer);
//         }
//     });
//
//     // Обновляем отображение преподавателей
//     updateSelectedLecturersDisplay();
//
//     // Выбираем группы
//     const groupUuids = new Set();
//     pairs.forEach(pair => {
//         // Проверяем разные возможные поля для UUID группы
//         if (pair.groupUuid) {
//             groupUuids.add(pair.groupUuid);
//         } else if (pair.group && pair.group.uuid) {
//             groupUuids.add(pair.group.uuid);
//         } else if (pair.groups && Array.isArray(pair.groups)) {
//             pair.groups.forEach(group => {
//                 if (group.uuid) groupUuids.add(group.uuid);
//             });
//         }
//     });
//
//     console.log('Found group UUIDs to select:', Array.from(groupUuids));
//
//     // Отмечаем группы в списке
//     let firstSelectedGroup = null;
//     groupUuids.forEach(uuid => {
//         const $groupItem = $(`#pair-groups-list [data-group-uuid="${uuid}"]`);
//         if ($groupItem.length) {
//             $groupItem.find('input[type="checkbox"]').prop('checked', true);
//             console.log(`Selected group: ${uuid}`);
//
//             // Запоминаем первую выбранную группу для установки ограничений
//             if (!firstSelectedGroup) {
//                 firstSelectedGroup = findGroupByUuid(uuid);
//             }
//         } else {
//             console.warn(`Group item not found for UUID: ${uuid}`);
//         }
//     });
//
//     // Устанавливаем ограничения на основе первой выбранной группы
//     if (firstSelectedGroup && groupUuids.size > 0) {
//         window.selectedCourse = firstSelectedGroup.course;
//         window.selectedEducationForm = firstSelectedGroup.educationForm;
//
//         // Применяем фильтрацию групп
//         filterGroupsByConstraints();
//     }
//
//     console.log('Loaded existing pairs to modal');
// }
//
// /**
//  * Инициализирует обработчики событий модалки
//  */
// export function initPairModalHandlers() {
//     console.log('initPairModalHandlers START');
//
//     // Обработчик сохранения
//     $('#pair-save').off('click').on('click', savePairModal);
//
//     // Обработчик закрытия
//     $('#pair-close').off('click').on('click', closePairModal);
//
//     // Поиск предметов
//     $('#pair-name').off('input').on('input', debounce(handleSubjectSearch, 300));
//
//     // Клик на поле предмета - показываем все предметы
//     $('#pair-name').off('focus').on('focus', handleSubjectFocus);
//
//     // Потеря фокуса - скрываем dropdown предмета
//     $('#pair-name').off('blur').on('blur', function() {
//         setTimeout(() => {
//             $('#pair-subject-dropdown').empty().hide();
//         }, 200); // Небольшая задержка чтобы успеть кликнуть на элемент
//     });
//
//     // Выбор предмета из dropdown
//     $(document).off('click', '#pair-subject-dropdown .dropdown-item').on('click', '#pair-subject-dropdown .dropdown-item', function() {
//         const uuid = $(this).data('subject-uuid');
//         const name = $(this).text().trim();
//         $('#pair-name').val(name).attr('data-selected-subject-uuid', uuid);
//         $('#pair-subject-dropdown').empty().hide();
//     });
//
//     // Поиск преподавателей
//     $('#lecturer-search').off('input').on('input', debounce(handleLecturerSearch, 300));
//
//     // Клик на поле преподавателей - показываем свободных преподавателей
//     $('#lecturer-search').off('focus').on('focus', handleLecturerFocus);
//
//     // Потеря фокуса - скрываем dropdown преподавателей
//     $('#lecturer-search').off('blur').on('blur', function() {
//         setTimeout(() => {
//             $('#lecturer-dropdown-list').empty().hide();
//         }, 200); // Небольшая задержка чтобы успеть кликнуть на элемент
//     });
//
//     // Поиск аудиторий
//     $('#pair-room-search').off('input').on('input', debounce(handleRoomSearch, 300));
//
//     // Клик на поле аудиторий - показываем свободные аудитории
//     $('#pair-room-search').off('focus').on('focus', handleRoomFocus);
//
//     // Потеря фокуса - скрываем dropdown аудиторий
//     $('#pair-room-search').off('blur').on('blur', function() {
//         setTimeout(() => {
//             $('#pair-room-dropdown').empty().hide();
//         }, 200); // Небольшая задержка чтобы успеть кликнуть на элемент
//     });
//
//     // Поиск групп
//     $('#pair-groups-search').off('input').on('input', debounce(handleGroupSearch, 300));
//
//     // Галочка «показывать занятые группы»
//     $('#show-busy-groups').off('change').on('change', function () {
//         const query = ($('#pair-groups-search').val() || '').trim().toLowerCase();
//         const groups = query
//             ? window.allGroups.filter(g => {
//                 const s = (g.groupName || g.name || g.specialization || g.faculty || g.direction || '').toLowerCase();
//                 return s.includes(query);
//               })
//             : window.allGroups;
//         renderGroupsList(groups);
//         filterGroupsByConstraints();
//     });
//
//     // Обработчики кликов на группы с ограничениями
//     $(document).off('change', '#pair-groups-list input[type="checkbox"]').on('change', '#pair-groups-list input[type="checkbox"]', function() {
//         const $checkbox = $(this);
//         const $groupItem = $checkbox.closest('[data-group-uuid]');
//         const groupUuid = $groupItem.data('group-uuid');
//         const isChecked = $checkbox.is(':checked');
//
//         if (isChecked) {
//             // При выборе группы - устанавливаем ограничения
//             const group = findGroupByUuid(groupUuid);
//             if (group) {
//                 if (!window.selectedCourse) {
//                     window.selectedCourse = group.course;
//                     window.selectedEducationForm = group.educationForm;
//                     // Фильтруем группы по новым ограничениям
//                     filterGroupsByConstraints();
//                 }
//             }
//         } else {
//             // При снятии галочки - проверяем нужно ли сбросить ограничения
//             const $checkedBoxes = $('#pair-groups-list input[type="checkbox"]:checked');
//             if ($checkedBoxes.length === 0) {
//                 window.selectedCourse = null;
//                 window.selectedEducationForm = null;
//                 console.log('Reset course and education form constraints');
//                 // Показываем все группы
//                 filterGroupsByConstraints();
//             }
//         }
//     });
//
//     // Выбор аудитории из dropdown
//     $(document).off('click', '#pair-room-dropdown .dropdown-item').on('click', '#pair-room-dropdown .dropdown-item', function() {
//         const uuid = $(this).data('room-uuid');
//         const name = $(this).text().trim();
//         $('#pair-room-search').val(name).attr('data-selected-room-uuid', uuid);
//         $('#pair-room-dropdown').empty().hide();
//     });
//
//     console.log('Pair modal handlers initialized');
// }
//
// /**
//  * Сохраняет пару из модалки — одна пара со всеми группами и преподавателями
//  */
// export async function savePairModal() {
//     console.log('savePairModal START');
//
//     const $modal = $('#pair-modal');
//     const dayIdx = Number($modal.data('dayIdx')) || 0;
//     const pairOrder = Number($modal.data('pairOrder')) || 0;
//     const existingPairs = $modal.data('existing') || [];
//
//     // Собираем данные
//     const subjectUuid = $('#pair-name').attr('data-selected-subject-uuid') || '';
//     const roomUuid = $('#pair-room-search').attr('data-selected-room-uuid') || '';
//     const lecturerUuids = window.selectedLecturers.map(l => l.uuid);
//     const groupUuids = getSelectedGroupUuids();
//     const date = getDateForDayIndex(dayIdx);
//
//     if (!subjectUuid) { showToast('Выберите предмет', 'warning'); return; }
//     if (!lecturerUuids.length) { showToast('Выберите минимум одного преподавателя', 'warning'); return; }
//
//     // Валидация: преподаватели
//     const busyLecs = getBusyLecturersForTime();
//     const conflictLecs = lecturerUuids.filter(u => busyLecs.has(u));
//     if (conflictLecs.length) {
//         const names = conflictLecs.map(u => {
//             const l = findLecturerByUuid(u);
//             return l ? `${l.lastName} ${l.firstName}` : u;
//         }).join(', ');
//         showToast(`Преподаватели заняты в это время: ${names}`, 'danger');
//         return;
//     }
//
//     // Валидация: группы
//     const busyGrps = getBusyGroupsForTime();
//     const conflictGrps = groupUuids.filter(u => busyGrps.has(u));
//     if (conflictGrps.length) {
//         const names = conflictGrps.map(u => {
//             const g = findGroupByUuid(u);
//             return g ? (g.groupName || g.name || u) : u;
//         }).join(', ');
//         showToast(`Группы заняты в это время: ${names}`, 'danger');
//         return;
//     }
//
//     // Валидация: аудитория
//     if (roomUuid) {
//         const busyRooms = getBusyRoomsForTime();
//         if (busyRooms.some(r => r.uuid === roomUuid)) {
//             const room = busyRooms.find(r => r.uuid === roomUuid);
//             showToast(`Аудитория занята в это время: ${room?.title || room?.name || roomUuid}`, 'danger');
//             return;
//         }
//     }
//
//     // Удаляем старые пары в этой ячейке
//     for (const p of existingPairs) {
//         try { await deletePair(p.uuid); } catch (e) { /* игнорируем */ }
//     }
//
//     // Создаём одну новую пару
//     const payload = {
//         subjectUuid,
//         pairOrder,
//         date,
//         roomUuid: roomUuid || null,
//         lecturerUuids,
//         groupUuids
//     };
//
//     try {
//         await createPair(payload);
//         closePairModal();
//         await loadPairsForWeek();
//         renderPairsIntoGrid();
//     } catch (e) {
//         showToast(`Ошибка сохранения: ${e.message || e}`, 'danger');
//     }
// }
//
// /**
//  * Закрывает модалку
//  */
// export function closePairModal() {
//     console.log('closePairModal START');
//
//     const $modal = $('#pair-modal');
//     $modal.modal('hide');
//
//     // Очищаем данные
//     clearPairModal();
//     window.currentModalCell = null;
//
//     console.log('Pair modal closed');
// }
//
// /**
//  * Находит группу по UUID
//  * @param {string} uuid - UUID группы
//  * @returns {Object|null} - объект группы или null
//  */
// export function findGroupByUuid(uuid) {
//     return window.allGroups.find(group => group.uuid === uuid) || null;
// }
//
// /**
//  * Фильтрует группы в списке по установленным ограничениям
//  */
// export function filterGroupsByConstraints() {
//     const $list = $('#pair-groups-list');
//
//     if (!window.selectedCourse && !window.selectedEducationForm) {
//         // Нет ограничений — показываем все, включая занятые
//         $list.find('[data-group-uuid]').show();
//         $list.find('[data-group-uuid] input[type="checkbox"]').prop('disabled', false);
//         return;
//     }
//
//     $list.find('[data-group-uuid]').each(function () {
//         const $groupItem = $(this);
//         const groupUuid = $groupItem.data('group-uuid');
//         const group = findGroupByUuid(groupUuid);
//         if (!group) { $groupItem.hide(); return; }
//
//         const $checkbox = $groupItem.find('input[type="checkbox"]');
//         const isCheckboxGroup = $checkbox.length > 0; // занятые группы без чекбокса
//
//         const matchesCourse = !window.selectedCourse || group.course === window.selectedCourse;
//         const matchesForm = !window.selectedEducationForm || group.educationForm === window.selectedEducationForm;
//
//         if (matchesCourse && matchesForm) {
//             $groupItem.show();
//             if (isCheckboxGroup) $checkbox.prop('disabled', false);
//         } else {
//             if (isCheckboxGroup && $checkbox.is(':checked')) {
//                 $checkbox.prop('checked', false);
//             }
//             $groupItem.hide();
//             if (isCheckboxGroup) $checkbox.prop('disabled', true);
//         }
//     });
// }
//
// /**
//  * Обрабатывает фокус на поле предмета - показывает предметы кафедры преподавателя
//  */
// export function handleSubjectFocus() {
//     const $dropdown = $('#pair-subject-dropdown');
//     if ($dropdown.is(':visible')) return;
//
//     // Получаем кафедру текущего преподавателя
//     if (!window.currentLecturerDepartment) {
//         $dropdown.append('<div class="dropdown-item text-muted">Кафедра преподавателя не определена</div>');
//         $dropdown.show();
//         return;
//     }
//
//     // Отображаем предметы только этой кафедры
//     renderSubjectDropdown(window.currentLecturerDepartment.subjects || []);
//     $dropdown.show();
// }
//
// /**
//  * Обрабатывает поиск предметов
//  * @param {Event} e - событие input
//  */
// export function handleSubjectSearch(e) {
//     const query = (e.target.value || '').trim().toLowerCase();
//     const $dropdown = $('#pair-subject-dropdown');
//
//     // Получаем кафедру текущего преподавателя
//     if (!window.currentLecturerDepartment) {
//         $dropdown.append('<div class="dropdown-item text-muted">Кафедра преподавателя не определена</div>');
//         $dropdown.show();
//         return;
//     }
//
//     // Фильтруем предметы кафедры
//     const allSubjects = window.currentLecturerDepartment.subjects || [];
//     const filtered = allSubjects.filter(subject => {
//         const name = (subject.name || '').toLowerCase();
//         return name.includes(query);
//     });
//
//     // Отображаем результаты
//     renderSubjectDropdown(filtered);
//     $dropdown.show();
// }
//
// /**
//  * Отображает dropdown предметов
//  * @param {Array} subjects - массив предметов
//  */
// export function renderSubjectDropdown(subjects) {
//     const $dropdown = $('#pair-subject-dropdown');
//     $dropdown.empty();
//
//     if (!subjects.length) {
//         $dropdown.append('<div class="dropdown-item text-muted">Предметы не найдены</div>');
//     } else {
//         subjects.forEach(subject => {
//             const $item = $(`
//         <div class="dropdown-item" data-subject-uuid="${subject.uuid}">
//           ${subject.name}
//         </div>
//       `);
//             $dropdown.append($item);
//         });
//     }
// }
//
// /**
//  * Обрабатывает фокус на поле аудиторий - показывает свободные аудитории
//  */
// export function handleRoomFocus() {
//     console.log('handleRoomFocus START');
//     const $dropdown = $('#pair-room-dropdown');
//     if ($dropdown.is(':visible')) return;
//
//     console.log('Free rooms available:', window.freeRooms.length);
//
//     // Получаем занятые аудитории
//     const busyRooms = getBusyRoomsForTime();
//     console.log('Busy rooms found:', busyRooms.length);
//
//     // Отображаем свободные и занятые аудитории
//     renderRoomDropdown(window.freeRooms, busyRooms);
//     $dropdown.show();
//
//     console.log('Room dropdown shown');
// }
//
// /**
//  * Обрабатывает фокус на поле преподавателей - показывает свободных преподавателей
//  */
// export function handleLecturerFocus() {
//     const $dropdown = $('#lecturer-dropdown-list');
//     if ($dropdown.is(':visible')) return;
//
//     // Получаем свободных преподавателей
//     const freeLecturers = getFreeLecturersForTime();
//
//     // Отображаем свободных преподавателей
//     renderLecturerDropdown(freeLecturers);
//     $dropdown.show();
// }
//
// /**
//  * Получает свободных преподавателей для текущего времени из кафедры текущего преподавателя
//  * @returns {Array} массив свободных преподавателей
//  */
// export function getFreeLecturersForTime() {
//     const $modal = $('#pair-modal');
//     const dayIdx = Number($modal.data('dayIdx')) || 0;
//     const pairOrder = Number($modal.data('pairOrder')) || 0;
//     const date = getDateForDayIndex(dayIdx);
//
//     const allLecturers = window.currentLecturerDepartment ? (window.currentLecturerDepartment.lecturers || []) : [];
//
//     const busyUuids = new Set();
//     (window.weekPairs || []).forEach(pair => {
//         if (pair.date === date && pair.pairOrder === pairOrder) {
//             (pair.lecturers || []).forEach(l => { if (l.uuid) busyUuids.add(l.uuid); });
//         }
//     });
//
//     return allLecturers.filter(l =>
//         !busyUuids.has(l.uuid) &&
//         !window.selectedLecturers.some(sl => sl.uuid === l.uuid)
//     );
// }
//
// /**
//  * Отображает dropdown преподавателей
//  * @param {Array} lecturers - массив преподавателей
//  */
// export function renderLecturerDropdown(lecturers) {
//     const $dropdown = $('#lecturer-dropdown-list');
//     $dropdown.empty();
//
//     if (!lecturers.length) {
//         $dropdown.append('<div class="dropdown-item text-muted">Свободные преподаватели не найдены</div>');
//     } else {
//         lecturers.forEach(lecturer => {
//             const $item = $(`
//         <div class="dropdown-item lecturer-dropdown-item" data-lecturer-uuid="${lecturer.uuid}">
//           ${formatLectFio(lecturer)}
//         </div>
//       `);
//
//             $item.on('click', function() {
//                 window.selectedLecturers.push(lecturer);
//                 updateSelectedLecturersDisplay();
//                 $('#lecturer-search').val('');
//                 $dropdown.empty().hide();
//             });
//
//             $dropdown.append($item);
//         });
//     }
// }
//
// /**
//  * Получает UUID выбранных групп из модалки
//  * @returns {Array} массив UUID групп
//  */
// export function getSelectedGroupUuids() {
//     const uuids = [];
//     $('#pair-groups-list input[type="checkbox"]:checked').each(function() {
//         const uuid = $(this).closest('[data-group-uuid]').data('group-uuid');
//         if (uuid) uuids.push(uuid);
//     });
//     return uuids;
// }
//
// /**
//  * Находит преподавателя по UUID
//  * @param {string} uuid - UUID преподавателя
//  * @returns {Object|null} объект преподавателя или null
//  */
// export function findLecturerByUuid(uuid) {
//     for (const dept of window.selectedDepartments) {
//         const lecturer = dept.lecturers.find(l => l.uuid === uuid);
//         if (lecturer) return lecturer;
//     }
//     return null;
// }
//
// /**
//  * Находит UUID предмета по названию
//  * @param {string} name - название предмета
//  * @returns {string|null} UUID предмета или null
//  */
// export function findSubjectUuidByName(name) {
//     for (const dept of window.selectedDepartments) {
//         const subject = dept.subjects.find(s => s.name === name);
//         if (subject) return subject.uuid;
//     }
//     return null;
// }
//
// /**
//  * Получает дату для индекса дня недели
//  * @param {number} dayIdx - индекс дня (0-6)
//  * @returns {string} дата в формате YYYY-MM-DD
//  */
// export function getDateForDayIndex(dayIdx) {
//     if (!window.weekStart) return null;
//
//     const date = new Date(window.weekStart);
//     date.setDate(date.getDate() + dayIdx);
//
//     const yyyy = date.getFullYear();
//     const mm = String(date.getMonth() + 1).padStart(2, '0');
//     const dd = String(date.getDate()).padStart(2, '0');
//
//     return `${yyyy}-${mm}-${dd}`;
// }
//
// /**
//  * Обновляет отображение выбранных преподавателей
//  */
// export function updateSelectedLecturersDisplay() {
//     const $container = $('#selected-lecturers');
//
//     if (!window.selectedLecturers.length) {
//         $container.html('<div class="text-muted small">Выбранные преподаватели появятся здесь</div>');
//         return;
//     }
//
//     $container.empty();
//     window.selectedLecturers.forEach((lecturer, index) => {
//         const $badge = $(`
//       <span class="badge bg-primary me-2 mb-2 d-inline-flex align-items-center">
//         ${formatLectFio(lecturer)}
//         <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.6em;" data-index="${index}"></button>
//       </span>
//     `);
//
//         // Обработчик удаления преподавателя
//         $badge.find('.btn-close').on('click', function() {
//             const idx = $(this).data('index');
//             window.selectedLecturers.splice(idx, 1);
//             updateSelectedLecturersDisplay();
//         });
//
//         $container.append($badge);
//     });
// }
//
// /**
//  * Обрабатывает поиск преподавателей (обновленная версия)
//  * @param {Event} e - событие input
//  */
// export function handleLecturerSearch(e) {
//     const query = (e.target.value || '').trim().toLowerCase();
//     const $dropdown = $('#lecturer-dropdown-list');
//
//     if (!query) {
//         // Показываем всех свободных преподавателей
//         const freeLecturers = getFreeLecturersForTime();
//         renderLecturerDropdown(freeLecturers);
//         $dropdown.show();
//         return;
//     }
//
//     // Получаем свободных преподавателей и фильтруем их
//     const freeLecturers = getFreeLecturersForTime();
//     const filtered = freeLecturers.filter(lecturer => {
//         const fio = formatLectFio(lecturer).toLowerCase();
//         return fio.includes(query);
//     });
//
//     // Отображаем результаты
//     renderLecturerDropdown(filtered);
//     $dropdown.show();
// }
//
// /**
//  * Обрабатывает поиск аудиторий с разделением на свободные и занятые
//  * @param {Event} e - событие input
//  */
// export function handleRoomSearch(e) {
//     const query = (e.target.value || '').trim().toLowerCase();
//     const $dropdown = $('#pair-room-dropdown');
//
//     if (!query) {
//         // Показываем все свободные аудитории
//         renderRoomDropdown(window.freeRooms, []);
//         $dropdown.show();
//         return;
//     }
//
//     // Фильтруем свободные аудитории
//     const filteredFree = window.freeRooms.filter(room => {
//         const name = (room.name || room.title || '').toLowerCase();
//         return name.includes(query);
//     });
//
//     // Ищем занятые аудитории
//     const busyRooms = getBusyRoomsForTime();
//     const filteredBusy = busyRooms.filter(room => {
//         const name = (room.name || room.title || '').toLowerCase();
//         return name.includes(query);
//     });
//
//     // Отображаем результаты с разделением
//     renderRoomDropdown(filteredFree, filteredBusy);
//     $dropdown.show();
// }
//
// /**
//  * Получает занятые аудитории для текущего времени
//  * @returns {Array} массив занятых аудиторий
//  */
// export function getBusyRoomsForTime() {
//     const $modal = $('#pair-modal');
//     const dayIdx = Number($modal.data('dayIdx')) || 0;
//     const pairOrder = Number($modal.data('pairOrder')) || 0;
//     const date = getDateForDayIndex(dayIdx);
//
//     const busyRooms = new Map();
//     (window.weekPairs || []).forEach(pair => {
//         if (pair.date === date && pair.pairOrder === pairOrder && pair.room && pair.room.uuid) {
//             busyRooms.set(pair.room.uuid, pair.room);
//         }
//     });
//
//     return Array.from(busyRooms.values());
// }
//
// /**
//  * Занятые группы (UUID) в текущий слот
//  * @returns {Set<string>}
//  */
// export function getBusyGroupsForTime() {
//     const $modal = $('#pair-modal');
//     const dayIdx = Number($modal.data('dayIdx')) || 0;
//     const pairOrder = Number($modal.data('pairOrder')) || 0;
//     const date = getDateForDayIndex(dayIdx);
//
//     const busy = new Set();
//     (window.weekPairs || []).forEach(pair => {
//         if (pair.date === date && pair.pairOrder === pairOrder) {
//             (pair.groups || []).forEach(g => { if (g.uuid) busy.add(g.uuid); });
//         }
//     });
//     return busy;
// }
//
// /**
//  * Занятые преподаватели (UUID) в текущий слот
//  * @returns {Set<string>}
//  */
// export function getBusyLecturersForTime() {
//     const $modal = $('#pair-modal');
//     const dayIdx = Number($modal.data('dayIdx')) || 0;
//     const pairOrder = Number($modal.data('pairOrder')) || 0;
//     const date = getDateForDayIndex(dayIdx);
//
//     const busy = new Set();
//     (window.weekPairs || []).forEach(pair => {
//         if (pair.date === date && pair.pairOrder === pairOrder) {
//             (pair.lecturers || []).forEach(l => { if (l.uuid) busy.add(l.uuid); });
//         }
//     });
//     return busy;
// }
//
// /**
//  * Отображает dropdown аудиторий с разделением на свободные и занятые
//  * @param {Array} freeRooms - свободные аудитории
//  * @param {Array} busyRooms - занятые аудитории
//  */
// export function renderRoomDropdown(freeRooms, busyRooms) {
//     const $dropdown = $('#pair-room-dropdown');
//     $dropdown.empty();
//
//     // Свободные аудитории
//     if (freeRooms.length > 0) {
//         const $freeHeader = $('<div class="dropdown-header text-success fw-semibold">Свободные аудитории:</div>');
//         $dropdown.append($freeHeader);
//
//         freeRooms.forEach(room => {
//             const $item = $(`
//         <div class="dropdown-item" data-room-uuid="${room.uuid}">
//           ${room.name || room.title}
//         </div>
//       `);
//             $dropdown.append($item);
//         });
//     }
//
//     // Занятые аудитории
//     if (busyRooms.length > 0) {
//         if (freeRooms.length > 0) {
//             $dropdown.append('<div class="dropdown-divider"></div>');
//         }
//
//         const $busyHeader = $('<div class="dropdown-header text-danger fw-semibold">Занятые аудитории:</div>');
//         $dropdown.append($busyHeader);
//
//         busyRooms.forEach(room => {
//             const $item = $(`
//         <div class="dropdown-item text-muted text-decoration-line-through" data-room-uuid="${room.uuid}" style="pointer-events: none; cursor: not-allowed;">
//           ${room.name || room.title}
//         </div>
//       `);
//             $dropdown.append($item);
//         });
//     }
//
//     // Если ничего не найдено
//     if (freeRooms.length === 0 && busyRooms.length === 0) {
//         $dropdown.append('<div class="dropdown-item text-muted">Аудитории не найдены</div>');
//     }
// }
//
// /**
//  * Обрабатывает поиск групп
//  * @param {Event} e - событие input
//  */
// export function handleGroupSearch(e) {
//     const query = (e.target.value || '').trim().toLowerCase();
//     const $list = $('#pair-groups-list');
//
//     if (!query) {
//         // Если запрос пустой, показываем все группы
//         renderGroupsList(window.allGroups);
//         return;
//     }
//
//     // Фильтруем группы по названию, специализации и другим полям
//     const filtered = window.allGroups.filter(group => {
//         const groupName = (group.groupName || group.name || '').toLowerCase();
//         const specialization = (group.specialization || '').toLowerCase();
//         const faculty = (group.faculty || '').toLowerCase();
//         const direction = (group.direction || '').toLowerCase();
//
//         return groupName.includes(query) ||
//                specialization.includes(query) ||
//                faculty.includes(query) ||
//                direction.includes(query);
//     });
//
//     // Отображаем отфильтрованные группы
//     renderGroupsList(filtered);
// }
//
// /**
//  * Отображает список групп с чекбоксами
//  * @param {Array} groups - массив групп для отображения
//  */
// export function renderGroupsList(groups) {
//     const $list = $('#pair-groups-list');
//     $list.empty();
//
//     if (!groups.length) {
//         $list.html('<div class="text-muted">Группы не найдены</div>');
//         return;
//     }
//
//     const showBusy = $('#show-busy-groups').is(':checked');
//     const busyUuids = getBusyGroupsForTime();
//
//     // Группируем по курсам, затем по формам обучения, затем по факультетам
//     const byCourse = {};
//     let hasVisible = false;
//     groups.forEach(group => {
//         const isBusy = busyUuids.has(group.uuid);
//         if (isBusy && !showBusy) return; // скрываем занятые если галка не выставлена
//         hasVisible = true;
//
//         const course = group.course || 0;
//         if (!byCourse[course]) byCourse[course] = {};
//
//         const form = formatEducationForm(group.educationForm);
//         if (!byCourse[course][form]) byCourse[course][form] = {};
//
//         const faculty = group.faculty || 'Не указан';
//         if (!byCourse[course][form][faculty]) byCourse[course][form][faculty] = [];
//
//         byCourse[course][form][faculty].push({ group, isBusy });
//     });
//
//     if (!hasVisible) {
//         $list.html('<div class="text-muted">Нет групп для отображения</div>');
//         return;
//     }
//
//     const sortedCourses = Object.keys(byCourse).map(Number).sort((a, b) => a - b);
//
//     sortedCourses.forEach(course => {
//         const $courseHeader = $('<div class="fw-bold text-primary mb-2 mt-3">').text(`Курс ${course}:`);
//         $list.append($courseHeader);
//
//         const sortedForms = Object.keys(byCourse[course]).sort();
//         sortedForms.forEach(form => {
//             const $formHeader = $('<div class="fw-semibold text-secondary mb-2 ms-3">').text(`Форма: ${form}`);
//             $list.append($formHeader);
//
//             const sortedFaculties = Object.keys(byCourse[course][form]).sort();
//             sortedFaculties.forEach(faculty => {
//                 const $facultyHeader = $('<div class="text-muted mb-1 ms-4">').text(`Факультет: ${faculty}`);
//                 $list.append($facultyHeader);
//
//                 const sortedGroups = byCourse[course][form][faculty].sort((a, b) => {
//                     const nameA = (a.group.groupName || a.group.name || '').toLowerCase();
//                     const nameB = (b.group.groupName || b.group.name || '').toLowerCase();
//                     return nameA.localeCompare(nameB, 'ru');
//                 });
//
//                 sortedGroups.forEach(({ group, isBusy }) => {
//                     if (isBusy) {
//                         // Занятая группа — серая, без чекбокса
//                         const $item = $(`
//                   <div class="mb-1 ms-5 text-muted" style="opacity: 0.5;" data-group-uuid="${group.uuid}">
//                     ${formatGroupLabel(group)} <span class="small">(занята)</span>
//                   </div>
//                 `);
//                         $list.append($item);
//                     } else {
//                         const $item = $(`
//                   <div class="form-check mb-1 ms-5" data-group-uuid="${group.uuid}">
//                     <input class="form-check-input" type="checkbox" id="group-${group.uuid}">
//                     <label class="form-check-label" for="group-${group.uuid}">
//                       ${formatGroupLabel(group)}
//                     </label>
//                   </div>
//                 `);
//                         $list.append($item);
//                     }
//                 });
//             });
//         });
//     });
// }
//
// /**
//  * Загружает свободные аудитории для указанного времени
//  * @param {number} dayIdx - индекс дня недели
//  * @param {number} pairOrder - номер пары
//  */
// export async function loadFreeRoomsForTime(dayIdx, pairOrder) {
//     console.log('loadFreeRoomsForTime START', { dayIdx, pairOrder });
//
//     try {
//         const date = getDateForDayIndex(dayIdx);
//         console.log('Calculated date:', date);
//         if (!date) {
//             console.error('No date calculated for dayIdx:', dayIdx);
//             return;
//         }
//
//         // Загружаем свободные аудитории
//         window.freeRooms = await fetchFreeRooms(date, pairOrder); // pairOrder передается как 'pair' в API
//         console.log('Loaded free rooms:', window.freeRooms.length);
//         console.log('Free rooms data:', window.freeRooms);
//
//     } catch (error) {
//         console.error('Error loading free rooms:', error);
//         window.freeRooms = [];
//     }
// }
//
// /**
//  * Загружает свободные аудитории
//  * @param {string} date - дата в формате YYYY-MM-DD
//  * @param {number} pair - номер пары
//  * @returns {Promise<Array>} массив свободных аудиторий
//  */
// export async function fetchFreeRooms(date, pair) {
//     const base = typeof window !== 'undefined' && window.mainUrl ? window.mainUrl : (typeof mainUrl !== 'undefined' ? mainUrl : '');
//     return new Promise((resolve, reject) => {
//         $.ajax({
//             url: '/api/room/free',
//             type: 'GET',
//             dataType: 'json',
//             headers: { 'Accept': 'application/json' },
//             data: { dateString: date, pair }, // Используем 'pair' вместо 'pairOrder'
//             success: (list) => resolve(list || []),
//             error: (xhr) => {
//                 console.error('Free rooms load error', xhr);
//                 reject(new Error('Failed to load free rooms'));
//             }
//         });
//     });
// }
//
// /**
//  * Создает новую пару
//  * @param {Object} payload - данные пары
//  * @returns {Promise<Object>} созданная пара
//  */
// export async function createPair(payload) {
//     const base = typeof window !== 'undefined' && window.mainUrl ? window.mainUrl : (typeof mainUrl !== 'undefined' ? mainUrl : '');
//
//     return new Promise((resolve, reject) => {
//         $.ajax({
//             url: '/api/pair',
//             type: 'POST',
//             contentType: 'application/json',
//             dataType: 'json',
//             data: JSON.stringify(payload),
//             success: (pair) => resolve(pair),
//             error: (xhr) => {
//                 console.error('Create pair error', xhr);
//                 reject(new Error('Failed to create pair'));
//             }
//         });
//     });
// }
//
// /**
//  * Обновляет существующую пару
//  * @param {string} pairUuid - UUID пары
//  * @param {Object} payload - данные для обновления
//  * @returns {Promise<Object>} обновленная пара
//  */
// export async function updatePair(pairUuid, payload) {
//     const base = typeof window !== 'undefined' && window.mainUrl ? window.mainUrl : (typeof mainUrl !== 'undefined' ? mainUrl : '');
//
//     return new Promise((resolve, reject) => {
//         $.ajax({
//             url: `/api/pair/${pairUuid}`,
//             type: 'PUT',
//             contentType: 'application/json',
//             dataType: 'json',
//             data: JSON.stringify(payload),
//             success: (pair) => resolve(pair),
//             error: (xhr) => {
//                 console.error('Update pair error', xhr);
//                 reject(new Error('Failed to update pair'));
//             }
//         });
//     });
// }
//
// /**
//  * Удаляет пару
//  * @param {string} pairUuid - UUID пары
//  * @returns {Promise} результат удаления
//  */
// export async function deletePair(pairUuid) {
//     const base = typeof window !== 'undefined' && window.mainUrl ? window.mainUrl : (typeof mainUrl !== 'undefined' ? mainUrl : '');
//
//     return new Promise((resolve, reject) => {
//         $.ajax({
//             url: `/api/pair/${pairUuid}`,
//             type: 'DELETE',
//             success: () => resolve(),
//             error: (xhr) => {
//                 console.error('Delete pair error', xhr);
//                 reject(new Error('Failed to delete pair'));
//             }
//         });
//     });
// }
//
// /**
//  * Функция debounce для ограничения частоты вызовов
//  * @param {Function} func - функция для вызова
//  * @param {number} delay - задержка в мс
//  * @returns {Function} обернутая функция
//  */
// export function debounce(func, delay) {
//     let timeoutId;
//     return function (...args) {
//         clearTimeout(timeoutId);
//         timeoutId = setTimeout(() => func.apply(this, args), delay);
//     };
// }
//
// export function cellKey(lecturerUuid, dayIdx, pairOrder) {
//     return `${lecturerUuid}_${dayIdx}_${pairOrder}`;
// }
//
// /**
//  * Формирует отображаемое название группы с названием и специализацией
//  * @param {Object} group - объект группы
//  * @returns {string} форматированное название группы
//  */
//
// export function formatGroupLabel(group) {
//     if (!group) return 'Нет группы';
//
//     const groupName = group.name || group.groupName || 'Без названия';
//     const specialization = group.specialization || '';
//     const direction = group.direction || '';
//     const educationForm = group.educationForm || '';
//
//     // Используем direction если specialization пустое
//     const specOrDirection = specialization || direction;
//
//     return `${groupName} ${specOrDirection} (${formatEducationForm(educationForm)})`;
// }