// import { fetchDepartments, fetchLecturers, fetchGroups, fetchWeekPairs, fetchWeekPairsBatch, savePair, updatePair, deletePair, exportScheduleExcel, cloneWeek, fetchRooms, fetchPairsByTime } from './api.js';
// import locks from './locks.js';
// import { showToast } from './utils.js';
//
// // Страница расписания для работы через кафедры и преподавателей
// // Использует jQuery
//
// (function () {
//   console.log('SCHEDULE.JS START');
//
//   // Константы дней и пар
//   const DAYS = [
//     { idx: 0, title: 'Понедельник' },
//     { idx: 1, title: 'Вторник' },
//     { idx: 2, title: 'Среда' },
//     { idx: 3, title: 'Четверг' },
//     { idx: 4, title: 'Пятница' },
//     { idx: 5, title: 'Суббота' },
//     { idx: 6, title: 'Воскресенье' }
//   ];
//
//   const TIMES = [
//     { order: 1, label: '1 (08:50–10:20)' },
//     { order: 2, label: '2 (10:40–12:10)' },
//     { order: 3, label: '3 (13:00–14:30)' },
//     { order: 4, label: '4 (14:50–16:20)' },
//     { order: 5, label: '5 (16:40–18:10)' },
//     { order: 6, label: '6 (18:30–20:00)' }
//   ];
//
//   let selectedDepartment = null;   // текущая выбранная кафедра
//   let lecturers = [];              // преподаватели всех выбранных кафедр
//   let groups = [];                 // все группы (для модалки)
//   let pairsByCell = {};            // ключ "lectUuid|dayIdx|order" -> массив PairDto
//   let deptSubjects = [];           // предметы выбранной кафедры (из DepartmentDto)
//   let allRooms = [];               // все аудитории
//   let freeRooms = [];              // свободные аудитории для выбранной даты/пары
//   let occupiedRooms = [];          // занятые аудитории для выбранной даты/пары
//   let selectedLecturers = [];     // выбранные преподаватели для текущей пары
//   let availableLecturers = [];     // доступные преподаватели для добавления
//
//   // Управление несколькими кафедрами
//   let selectedDepartments = []; // массив выбранных кафедр
//   let departmentCounter = 0;    // счетчик для ID кафедр
//
//   // Глобальные переменные состояния
//   let weekStart = startOfWeekMonday(new Date()); // начало текущей недели (Date)
//   let weekEnd = null;   // конец текущей недели (Date)
//   let locks = null;     // сервис блокировок
//   let locksRefreshTimeout = null; // таймаут для обновления локов
//   let editingDotsTimer = null;
//   let editingDotsStep = 0;
//
//   // Schedule management
//   let schedules = [];
//   let currentScheduleId = null;
//
//   // ---------------- Вспомогательные функции ----------------
//
//   // Вспомогательный ключ для хранения пар в ячейках
//   function cellKey(lectUuid, dayIdx, order) {
//     return `${lectUuid}|${dayIdx}|${order}`;
//   }
//
//   // Структура ячейки для сервиса локов: блокируем по преподавателю/дню/паре
//   function buildLockCell(lectUuid, dayIdx, order) {
//     console.log('buildLockCell START');
//     const d = new Date(weekStart);
//     d.setDate(d.getDate() + dayIdx);
//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, '0');
//     const dd = String(d.getDate()).padStart(2, '0');
//     const dateIso = `${yyyy}-${mm}-${dd}`;
//     return {
//       lecturerUuid: lectUuid || '',
//       groupUuid: '',
//       dateIso,
//       pairOrder: order | 0
//     };
//   }
//
//   // --------- Работа с неделей и заголовками ---------
//
//   function startOfWeekMonday(date) {
//     const d = new Date(date);
//     const day = d.getDay();
//     const diff = (day === 0 ? -6 : 1) - day; // понедельник
//     d.setDate(d.getDate() + diff);
//     d.setHours(0, 0, 0, 0);
//     return d;
//   }
//
//   // в эту функцию передается дата начала недели
//   function weekRangeLabel(date) {
//     const start = new Date(date);
//     const end = new Date(date);
//     end.setDate(end.getDate() + 6);
//     const fmt = (d) => {
//       const dd = String(d.getDate()).padStart(2, '0');
//       const mm = String(d.getMonth() + 1).padStart(2, '0');
//       return `${dd}.${mm}`;
//     };
//     return `${fmt(start)} — ${fmt(end)}`;
//   }
//
//   function setWeekUI() {
//     console.log('setWeekUI START');
//     const dates = document.getElementById('week-dates');
//     if (dates) dates.textContent = weekRangeLabel(weekStart);
//   }
//
//   function dateIsoFor(dayIdx) {
//     console.log('dateIsoFor START');
//     const d = new Date(weekStart);
//     d.setDate(d.getDate() + dayIdx);
//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, '0');
//     const dd = String(d.getDate()).padStart(2, '0');
//     return `${yyyy}-${mm}-${dd}`;
//   }
//
//   function formatLectFio(l) {
//     console.log('formatLectFio START');
//     if (!l) return '';
//     // проверяем, что часть ФИО не пустая
//     return [l.lastName, l.firstName, l.patronymic].filter(Boolean).join(' ');
//   }
//
//   function formatGroupLabel(g) {
//     console.log('formatGroupLabel START');
//     if (!g) return '';
//     const base = g.groupName || '—';
//     const sports = Array.isArray(g.kindsOfSports) ? g.kindsOfSports.filter(Boolean) : [];
//
//     // Используем direction если specialization пустое
//     const specOrDirection = g.specialization || g.direction;
//     let spec = specOrDirection ? `спец.: ${specOrDirection}` : '';
//
//     if (spec && sports.length) {
//       spec = `${spec} (${sports.join(', ')})`;
//     } else if (!spec && sports.length) {
//       spec = `(${sports.join(', ')})`;
//     }
//     // В строке группы показываем название, специализацию/направление и (при наличии) виды спорта
//     return [base, spec].filter(Boolean).join(' • ');
//   }
//
//   function matchesGroupSearch(g, query) {
//     console.log('matchesGroupSearch START' + query.toLowerCase());
//     console.log('matcher groupname: ' + g.groupName.toLowerCase().includes(query.toLowerCase()))
//     if (!query) return true;
//     const q = query.toLowerCase();
//     const sports = Array.isArray(g.kindsOfSports) ? g.kindsOfSports : [];
//
//     // Ищем по названию группы, специализации, видам спорта, факультету и направлению
//     return !!(
//       (g.groupName && g.groupName.toLowerCase().includes(q)) ||
//       (g.name && g.name.toLowerCase().includes(q)) ||
//       (g.specialization && g.specialization.toLowerCase().includes(q)) ||
//       (g.faculty && g.faculty.toLowerCase().includes(q)) ||
//       (g.direction && g.direction.toLowerCase().includes(q)) ||
//       sports.some(s => s && s.toLowerCase().includes(q))
//     );
//   }
//
//   function showToastSimple(message, type) {
//     // минимальная версия тоста: используем общий showToast, при ошибке fallback на alert
//     try {
//       showToast(message, type || 'info');
//     } catch (_) {
//       alert(message);
//     }
//   }
//
//   // ---------------- Повторение по неделям ----------------
//
//   // Конец учебного года: 31 августа текущего или следующего года
//   function academicYearEndFor(base) {
//     console.log('academicYearEndFor START');
//     const y = base.getFullYear();
//     const cutoffYear = (base.getMonth() >= 8) ? (y + 1) : y; // если месяц >= сентябрь
//     return new Date(cutoffYear, 7, 31); // 31 августа
//   }
//
//   function renderRepeatWeeksList(dayIdx) {
//     console.log('renderRepeatWeeksList START');
//     const list = document.getElementById('repeat-weeks-list');
//     const selectAll = document.getElementById('repeat-select-all');
//     if (!list || !selectAll) return;
//     list.innerHTML = '';
//
//     const cutoff = academicYearEndFor(weekStart);
//     const items = [];
//     const cursor = new Date(weekStart);
//     cursor.setDate(cursor.getDate() + 7); // начинаем с недели после текущей
//
//     while (cursor <= cutoff) {
//       const d = new Date(cursor);
//       d.setDate(d.getDate() + dayIdx);
//       items.push(new Date(d));
//       cursor.setDate(cursor.getDate() + 7);
//     }
//
//     if (!items.length) {
//       const empty = document.createElement('div');
//       empty.className = 'text-muted small';
//       empty.textContent = 'Нет доступных недель для повторения';
//       list.appendChild(empty);
//     } else {
//       items.forEach(d => {
//         const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
//         const id = `repeat-week-${iso}`;
//         const wrap = document.createElement('div');
//         wrap.className = 'form-check';
//         const cb = document.createElement('input');
//         cb.type = 'checkbox';
//         cb.className = 'form-check-input';
//         cb.id = id;
//         cb.value = iso;
//         const lbl = document.createElement('label');
//         lbl.className = 'form-check-label';
//         lbl.htmlFor = id;
//         const dd = String(d.getDate()).padStart(2, '0');
//         const mm = String(d.getMonth() + 1).padStart(2, '0');
//         const yy = d.getFullYear();
//         lbl.textContent = `${dd}.${mm}.${yy}`;
//         wrap.appendChild(cb);
//         wrap.appendChild(lbl);
//         list.appendChild(wrap);
//       });
//     }
//
//     selectAll.checked = false;
//     selectAll.onchange = () => {
//       const boxes = list.querySelectorAll('input[type="checkbox"]');
//       boxes.forEach(b => { b.checked = selectAll.checked; });
//     };
//   }
//
//   function collectRepeatDates(dayIdx) {
//     console.log('collectRepeatDates START');
//     const list = document.getElementById('repeat-weeks-list');
//     const wrap = document.getElementById('repeat-weeks-wrap');
//     if (!list || !wrap || wrap.classList.contains('d-none')) return [];
//     const boxes = list.querySelectorAll('input[type="checkbox"]:checked');
//     const dates = [];
//     boxes.forEach(cb => dates.push(cb.value));
//     return dates;
//   }
//
//   // ---------------- Автодополнение для предмета ----------------
//
//   function ensureSubjectDropdown() {
//     console.log('ensureSubjectDropdown START');
//     const input = document.getElementById('pair-name');
//     if (!input) return;
//     if (document.getElementById('pair-name-dropdown')) return;
//     const wrap = document.createElement('div');
//     wrap.className = 'dropdown w-100';
//     input.parentNode.insertBefore(wrap, input);
//     wrap.appendChild(input);
//     const dd = document.createElement('div');
//     dd.id = 'pair-name-dropdown';
//     dd.className = 'dropdown-menu w-100';
//     dd.style.maxHeight = '320px';
//     dd.style.overflow = 'auto';
//     wrap.appendChild(dd);
//   }
//
//   function renderSubjectDropdown(items) {
//     console.log('renderSubjectDropdown START');
//     const dd = document.getElementById('pair-name-dropdown');
//     if (!dd) return;
//     dd.innerHTML = '';
//     const list = Array.isArray(items) ? items : [];
//     if (!list.length) {
//       const empty = document.createElement('div');
//       empty.className = 'dropdown-item text-muted';
//       empty.textContent = 'Ничего не найдено';
//       dd.appendChild(empty);
//       dd.classList.add('show');
//       return;
//     }
//     list.forEach(s => {
//       const btn = document.createElement('button');
//       btn.type = 'button';
//       btn.className = 'dropdown-item text-wrap';
//       const name = s && s.name ? s.name : '';
//       btn.textContent = name || 'Предмет';
//       btn.addEventListener('click', () => {
//         const input = document.getElementById('pair-name');
//         if (input) {
//           input.value = name;
//           try {
//             input.setAttribute('data-selected-subject-uuid', (s && s.uuid) ? (s.uuid || '') : '');
//           } catch (_) {}
//         }
//         dd.classList.remove('show');
//       });
//       dd.appendChild(btn);
//     });
//     dd.classList.add('show');
//   }
//
//   function wireSubjectAutocomplete() {
//     console.log('wireSubjectAutocomplete START');
//     ensureSubjectDropdown();
//     const input = document.getElementById('pair-name');
//     const dd = document.getElementById('pair-name-dropdown');
//     if (!input || !dd) return;
//
//     input.addEventListener('input', () => {
//       try { input.removeAttribute('data-selected-subject-uuid'); } catch (_) {}
//     });
//
//     const run = () => {
//       const q = (input.value || '').trim().toLowerCase();
//       let base = Array.isArray(deptSubjects) ? deptSubjects : [];
//       const filtered = base
//         .filter(s => s && s.name && (!q || s.name.toLowerCase().includes(q)));
//       renderSubjectDropdown(filtered);
//     };
//
//     input.addEventListener('focus', run);
//     input.addEventListener('input', run);
//     document.addEventListener('click', (e) => {
//       if (!dd.contains(e.target) && e.target !== input) dd.classList.remove('show');
//     });
//   }
//
//   // ---------------- Загрузка данных ----------------
//
//   async function loadAllGroupsOnce() {
//     console.log('loadAllGroupsOnce START');
//     try {
//       groups = await fetchGroups('');
//     } catch (e) {
//       groups = [];
//       console.error('Failed to load groups', e);
//     }
//   }
//
//   async function loadLecturersForDepartment(dep) {
//     console.log('loadLecturersForDepartment START');
//     // Очищаем текущее состояние
//     lecturers = [];
//     selectedDepartments = [];
//
//     // Загружаем преподавателей основной кафедры
//     try {
//       const fromDep = Array.isArray(dep.lecturers) ? dep.lecturers : [];
//       if (fromDep.length > 0) {
//         lecturers = fromDep;
//       } else {
//         const all = await fetchLecturers('');
//         lecturers = (all || []).filter(l => l && l.department && l.department.uuid === dep.uuid);
//       }
//     } catch (e) {
//       console.error('Failed to load lecturers', e);
//       lecturers = [];
//     }
//
//     // Очищаем контейнер дополнительных кафедр
//     const container = document.getElementById('additional-departments');
//     if (container) container.innerHTML = '';
//   }
//
//   // ---------------- Предметы кафедры ----------------
//
//   function setDepartmentSubjectsFromDto(dep) {
//     console.log('setDepartmentSubjectsFromDto START');
//     try {
//       deptSubjects = Array.isArray(dep.subjects) ? (dep.subjects || []) : [];
//     } catch (_) {
//       deptSubjects = [];
//     }
//   }
//
//   async function loadPairsForWeek() {
//     console.log('loadPairsForWeek START');
//     pairsByCell = {};
//     if (!lecturers.length) return;
//
//     // Берём понедельник из состояния weekStart
//     const monday = new Date(weekStart);
//
//     function dateIsoFor(dayIdx) {
//       const d = new Date(monday);
//       d.setDate(d.getDate() + dayIdx);
//       const yyyy = d.getFullYear();
//       const mm = String(d.getMonth() + 1).padStart(2, '0');
//       const dd = String(d.getDate()).padStart(2, '0');
//       return `${yyyy}-${mm}-${dd}`;
//     }
//
//     const fromIso = dateIsoFor(0);
//     const toIso = dateIsoFor(6);
//
//     // Оптимизированная загрузка: один запрос для всех групп
//     const validGroups = (groups || []).filter(g => g.uuid);
//
//     if (validGroups.length > 0) {
//       try {
//         const allPairs = await fetchWeekPairsBatch(fromIso, toIso);
//         console.log(`Loaded ${allPairs.length} pairs for all groups in single request`);
//
//         // Раскладываем все пары по ячейкам преподавателей/дней/порядка
//         allPairs.forEach(p => {
//           if (!p || !p.pairOrder || !p.dateString) return;
//
//           // Если у пары есть несколько преподавателей, добавляем ее в ячейку каждого преподавателя
//           if (p.lecturers && Array.isArray(p.lecturers) && p.lecturers.length > 0) {
//             p.lecturers.forEach(lecturer => {
//               if (lecturer && lecturer.uuid) {
//                 const lUuid = lecturer.uuid;
//                 const date = new Date(p.dateString + 'T00:00:00');
//                 const dayIdx = Math.floor((date - monday) / (24 * 60 * 60 * 1000));
//                 const order = p.pairOrder | 0;
//                 if (dayIdx >= 0 && dayIdx <= 6) {
//                   const key = cellKey(lUuid, dayIdx, order);
//                   if (!pairsByCell[key]) pairsByCell[key] = [];
//                   pairsByCell[key].push(p);
//                 }
//               }
//             });
//           } else if (p.lecturer && p.lecturer.uuid) {
//             // Обратная совместимость для старых пар с одним преподавателем
//             const lUuid = p.lecturer.uuid;
//             const date = new Date(p.dateString + 'T00:00:00');
//             const dayIdx = Math.floor((date - monday) / (24 * 60 * 60 * 1000));
//             const order = p.pairOrder | 0;
//             if (dayIdx >= 0 && dayIdx <= 6) {
//               const key = cellKey(lUuid, dayIdx, order);
//               if (!pairsByCell[key]) pairsByCell[key] = [];
//               pairsByCell[key].push(p);
//             }
//           }
//         });
//       } catch (e) {
//         console.error('Failed to load pairs in batch, falling back to individual loading:', e);
//         // Fallback к старому методу в случае ошибки
//         for (const g of validGroups) {
//           try {
//             const list = await fetchWeekPairs(g.uuid, fromIso, toIso);
//             list.forEach(p => {
//               if (!p || !p.pairOrder || !p.dateString) return;
//
//               if (p.lecturers && Array.isArray(p.lecturers) && p.lecturers.length > 0) {
//                 p.lecturers.forEach(lecturer => {
//                   if (lecturer && lecturer.uuid) {
//                     const lUuid = lecturer.uuid;
//                     const date = new Date(p.dateString + 'T00:00:00');
//                     const dayIdx = Math.floor((date - monday) / (24 * 60 * 60 * 1000));
//                     const order = p.pairOrder | 0;
//                     if (dayIdx >= 0 && dayIdx <= 6) {
//                       const key = cellKey(lUuid, dayIdx, order);
//                       if (!pairsByCell[key]) pairsByCell[key] = [];
//                       pairsByCell[key].push(p);
//                     }
//                   }
//                 });
//               } else if (p.lecturer && p.lecturer.uuid) {
//                 const lUuid = p.lecturer.uuid;
//                 const date = new Date(p.dateString + 'T00:00:00');
//                 const dayIdx = Math.floor((date - monday) / (24 * 60 * 60 * 1000));
//                 const order = p.pairOrder | 0;
//                 if (dayIdx >= 0 && dayIdx <= 6) {
//                   const key = cellKey(lUuid, dayIdx, order);
//                   if (!pairsByCell[key]) pairsByCell[key] = [];
//                   pairsByCell[key].push(p);
//                 }
//               }
//             });
//           } catch (fallbackError) {
//             console.error('Fallback failed for group', g.uuid, fallbackError);
//           }
//         }
//       }
//     }
//   }
//
//   // ---------------- Построение сетки ----------------
//
//   function buildGrid() {
//     console.log('buildGrid START');
//     console.log('Total lecturers:', lecturers.length);
//     console.log('Selected departments:', selectedDepartments.length);
//
//     const $table = $('#schedule-grid-table');
//     if (!$table.length) return;
//
//     const $thead = $table.find('thead');
//     const $tbody = $table.find('tbody');
//     $thead.empty();
//     $tbody.empty();
//
//     // Группируем преподавателей по кафедрам
//     const lecturersByDepartment = [];
//
//     // Добавляем основную кафедру
//     if (selectedDepartment && lecturers.length > 0) {
//       const mainDeptLecturers = lecturers.filter(l => !selectedDepartments.some(d => d.lecturers.some(dl => dl.uuid === l.uuid)));
//       console.log('Main department lecturers:', mainDeptLecturers.length);
//       if (mainDeptLecturers.length > 0) {
//         lecturersByDepartment.push({
//           name: selectedDepartment.name,
//           lecturers: mainDeptLecturers,
//           isMain: true
//         });
//       }
//     }
//
//     // Добавляем дополнительные кафедры
//     selectedDepartments.forEach(dept => {
//       console.log('Additional department:', dept.name, 'lecturers:', dept.lecturers.length);
//       if (dept.lecturers.length > 0) {
//         lecturersByDepartment.push({
//           name: dept.name,
//           lecturers: dept.lecturers,
//           isMain: false
//         });
//       }
//     });
//
//     console.log('Total departments in grid:', lecturersByDepartment.length);
//
//     // Заголовок: День | Пара | Преподаватели...
//     const $headRow = $('<tr>');
//     $headRow.append('<th id="resizeableTh-day" style="width: 120px; max-width: 120px;">День</th>');
//     $headRow.append('<th id="resizeableTh-pair" style="width: 135px; max-width: 135px;">Пара</th>');
//
//     let lecturerIndex = 0;
//     lecturersByDepartment.forEach(dept => {
//       dept.lecturers.forEach((l, idx) => {
//         const fio = formatLectFio(l) || 'Преподаватель';
//         const $th = $('<th class="text-nowrap lecturer-table-header">').text(fio).attr('data-lecturer-uuid', l.uuid || '');
//         $th.attr('id', `resizeableTh-lecturer-${lecturerIndex}`);
//         $th.attr('data-department', dept.name);
//         $headRow.append($th);
//         lecturerIndex++;
//       });
//
//       // Добавляем разделитель между кафедрами (кроме последней)
//       if (lecturersByDepartment.indexOf(dept) < lecturersByDepartment.length - 1) {
//         const $separator = $('<th class="department-separator">').css({
//           width: '8px',
//           maxWidth: '8px',
//           backgroundColor: '#000',
//           border: 'none'
//         });
//         $separator.attr('id', `resizeableTh-separator-${lecturerIndex}`);
//         $headRow.append($separator);
//         lecturerIndex++;
//       }
//     });
//     $thead.append($headRow);
//
//     // Тело: по дням и парам
//     DAYS.forEach(day => {
//       TIMES.forEach((t, timeIdx) => {
//         const $tr = $('<tr>');
//         if (timeIdx === 0) {
//           const $dayTd = $('<td class="align-middle fw-semibold text-primary resizeableTd-day overflow-hidden">').text(day.title);
//           $dayTd.css({ width: '120px', maxWidth: '120px' });
//           $dayTd.attr('rowspan', TIMES.length);
//           $tr.append($dayTd);
//         }
//         const $timeTd = $('<td class="text-muted text-nowrap resizeableTd-pair overflow-hidden">').text(t.label);
//         $timeTd.css({ width: '135px', maxWidth: '135px' });
//         $tr.append($timeTd);
//
//         lecturerIndex = 0;
//         lecturersByDepartment.forEach(dept => {
//           dept.lecturers.forEach((l, idx) => {
//             const $cell = $('<td class="schedule-cell-simple resizeableTd-lecturer-' + lecturerIndex + '">');
//             $cell.css({ width: '220px', maxWidth: '220px' });
//             $cell.attr('data-lecturer-uuid', l.uuid || '');
//             $cell.attr('data-day-idx', day.idx);
//             $cell.attr('data-pair-order', t.order);
//             $cell.text('—');
//             $cell.on('click', () => tryOpenCell($cell));
//             $tr.append($cell);
//             lecturerIndex++;
//           });
//
//           // Добавляем ячейку-разделитель между кафедрами
//           if (lecturersByDepartment.indexOf(dept) < lecturersByDepartment.length - 1) {
//             const $separatorCell = $('<td class="department-separator-cell">').css({
//               width: '8px',
//               maxWidth: '8px',
//               backgroundColor: '#000',
//               border: 'none'
//             });
//             $tr.append($separatorCell);
//             lecturerIndex++;
//           }
//         });
//
//         $tbody.append($tr);
//       });
//     });
//
//     // После построения сетки отрендерим текущие пары в ячейки
//     renderPairsIntoGrid();
//
//     // Сделаем колонки изменяемыми по ширине
//     makeTableColumnsResizable('schedule-grid-table');
//   }
//
//   function renderPairsIntoGrid() {
//     console.log('renderPairsIntoGrid START');
//     $('#schedule-grid-table td.schedule-cell-simple').each(function () {
//       const $cell = $(this);
//       $cell.addClass('pe-0');
//       const lectUuid = $cell.data('lecturer-uuid');
//       const dayIdx = Number($cell.data('day-idx')) | 0;
//       const order = Number($cell.data('pair-order')) | 0;
//       const key = cellKey(lectUuid, dayIdx, order);
//       const list = pairsByCell[key] || [];
//
//       let isLocked = false;
//       try {
//         if (locks) {
//           const lockCell = buildLockCell(lectUuid, dayIdx, order);
//           isLocked = locks.isLocked(lockCell);
//         }
//       } catch (_) {
//         isLocked = false;
//       }
//
//       if (!list.length && !isLocked) {
//         $cell.text('—');
//         $cell.removeClass('cell-locked');
//         return;
//       }
//
//       $cell.empty();
//
//       if (isLocked) {
//         const $edit = $('<div class="text-primary small mb-1">')
//           .html('Редактируется<span class="editing-dots">...</span>');
//         $cell.append($edit);
//         $cell.addClass('cell-locked');
//       } else {
//         $cell.removeClass('cell-locked');
//       }
//
//       if (list.length) {
//         const first = list[0];
//         const title = (first.subject && first.subject.name) ? first.subject.name : (first.name || '');
//
//         // Собираем всех преподавателей из всех пар
//         const allLecturers = new Set();
//         list.forEach(p => {
//           if (p.lecturers && Array.isArray(p.lecturers)) {
//             p.lecturers.forEach(l => {
//               if (l.uuid) allLecturers.add(formatLectFio(l));
//             });
//           } else if (p.lecturer && p.lecturer.uuid) {
//             allLecturers.add(formatLectFio(p.lecturer));
//           }
//         });
//
//         const lecturerLines = Array.from(allLecturers).join('\n');
//         const groupLines = list
//           .map(p => p.group)
//           .filter(Boolean)
//           .map(g => formatGroupLabel(g))
//           .join('\n');
//
//         const $wrap = $('<div class="cell-scroll">');
//         const $title = $('<div class="fw-semibold overflow-hidden text-nowrap">').text(title);
//         const $lecturers = $('<div class="small text-primary mb-1">').html(
//           lecturerLines.replace(/\n/g, '<br>')
//         );
//         const $groups = $('<div class="small text-muted cell-text-groups">').html(
//           groupLines.replace(/\n/g, '<br>')
//         );
//         $wrap.append($title).append($lecturers).append($groups);
//         $cell.append($wrap);
//       }
//     });
//
//     if (!editingDotsTimer) {
//       editingDotsTimer = setInterval(() => {
//         try {
//           const nodes = document.querySelectorAll('.editing-dots');
//           editingDotsStep = (editingDotsStep + 1) % 3;
//           const dots = editingDotsStep === 0 ? '.' : (editingDotsStep === 1 ? '..' : '...');
//           nodes.forEach(node => { node.textContent = dots; });
//         } catch (_) {}
//       }, 450);
//     }
//   }
//
//   // ---------------- Модалка пары ----------------
//
//   function buildGroupsListInModal(selectedUuids) {
//     console.log('buildGroupsListInModal START');
//     const $list = $('#pair-groups-list');
//     if (!$list.length) return;
//     const selected = new Set(selectedUuids || []);
//     $list.empty();
//
//     // Ограничения: одна пара -> один курс, одна форма, один факультет
//     let baseCourse = null;
//     let baseForm = null;
//     let baseFaculty = null;
//
//     // Если уже были выбранные группы, фиксируем базовые значения по первой
//     if (selected.size > 0) {
//       const firstUuid = Array.from(selected)[0];
//       const g0 = (groups || []).find(g => g && g.uuid === firstUuid);
//       if (g0) {
//         baseCourse = g0.course ?? null;
//         baseForm = g0.educationForm || null;
//         baseFaculty = g0.faculty || null;
//       }
//     }
//
//     // Фильтрация по строке поиска (название, специализация, виды спорта)
//     const searchInput = document.getElementById('pair-groups-search');
//     const q = searchInput ? (searchInput.value || '').trim().toLowerCase() : '';
//     const source = (groups || []).filter(g => matchesGroupSearch(g, q));
//
//     // Сортируем группы: курс -> факультет -> форма, но внутри факультета по названию
//     const sorted = source.slice().sort((a, b) => {
//       const ca = Number(a.course || 0), cb = Number(b.course || 0);
//       if (ca !== cb) return ca - cb;
//       const facA = String(a.faculty || ''), facB = String(b.faculty || '');
//       if (facA !== facB) return facA.localeCompare(facB, 'ru');
//       const fa = String(a.educationForm || ''), fb = String(b.educationForm || '');
//       if (fa !== fb) return fa.localeCompare(fb);
//       // Внутри одного факультета и формы сортируем по названию группы
//       const nameA = String(a.groupName || a.name || ''), nameB = String(b.groupName || b.name || '');
//       return nameA.localeCompare(nameB, 'ru');
//     });
//
//     let lastCourse = null;
//     let lastFaculty = null;
//     let lastForm = null;
//
//     sorted.forEach(g => {
//       const course = g.course || 0;
//       const form = g.educationForm || '';
//       const faculty = g.faculty || '';
//
//       // Заголовки для смены курса / факультета / формы
//       if (lastCourse !== course) {
//         lastCourse = course;
//         lastFaculty = null;
//         lastForm = null;
//         const $h = $('<div class="mt-2 fw-bold">').text(`Курс ${course || '?'}:`);
//         $list.append($h);
//       }
//       if (lastFaculty !== faculty) {
//         lastFaculty = faculty;
//         lastForm = null;
//         const $h = $('<div class="pt-1 ms-2 fst-italic">').text(faculty || 'Факультет не указан');
//         $list.append($h);
//       }
//       if (lastForm !== form) {
//         lastForm = form;
//         const formLabel = form === 'FULL_TIME' ? 'очная' : (form === 'PART_TIME' ? 'заочная' : (form === 'MIXED' ? 'очно-заочная' : form || 'форма не указана'));
//         const $h = $('<div class="ms-4 fw-semibold">').text(formLabel);
//         $list.append($h);
//       }
//
//       const $wrap = $('<div class="form-check ms-5">');
//       const id = 'g_' + g.uuid;
//       const $cb = $('<input type="checkbox" class="form-check-input">')
//         .attr('id', id)
//         .attr('data-group-uuid', g.uuid || '');
//       $cb.prop('checked', selected.has(g.uuid));
//
//       // Обработчик выбора с учётом ограничений
//       $cb.on('change', () => {
//         if ($cb.prop('checked')) {
//           // Если базовые значения ещё не зафиксированы — фиксируем по первой выбранной
//           if (baseCourse == null && !baseForm && !baseFaculty) {
//             baseCourse = g.course ?? null;
//             baseForm = g.educationForm || null;
//             baseFaculty = g.faculty || null;
//             selected.add(g.uuid);
//             return;
//           }
//           const sameCourse = (baseCourse == null) || (Number(g.course || 0) === Number(baseCourse));
//           const sameForm = (!baseForm) || (String(g.educationForm || '') === String(baseForm));
//           const sameFaculty = (!baseFaculty) || (String(g.faculty || '') === String(baseFaculty));
//           if (!sameCourse || !sameForm || !sameFaculty) {
//             // запрещаем выбор групп с другим курсом/формой/факультетом
//             $cb.prop('checked', false);
//             showToastSimple('Для одной пары можно выбрать только группы одного курса, формы обучения и факультета', 'warning');
//             return;
//           }
//           selected.add(g.uuid);
//         } else {
//           selected.delete(g.uuid);
//           if (selected.size === 0) {
//             baseCourse = null;
//             baseForm = null;
//             baseFaculty = null;
//           }
//         }
//       });
//
//       const labelText = formatGroupLabel(g);
//       const $lbl = $('<label class="form-check-label">').attr('for', id).text(labelText);
//       $wrap.append($cb).append($lbl);
//       $list.append($wrap);
//     });
//   }
//
//   function getSelectedGroupUuidsFromModal() {
//     console.log('getSelectedGroupUuidsFromModal START');
//     const res = [];
//     $('#pair-groups-list input[type="checkbox"][data-group-uuid]:checked').each(function () {
//       const gid = $(this).data('group-uuid');
//       if (gid) res.push(gid);
//     });
//     return res;
//   }
//
//   function wireGroupSearch() {
//     console.log();
//     console.log('wireGroupSearch START');
//     console.log();
//
//     const input = document.getElementById('pair-groups-search');
//     if (!input) return;
//     input.addEventListener('input', () => {
//       console.log("pair-groups-search input works")
//       const selected = getSelectedGroupUuidsFromModal();
//       buildGroupsListInModal(selected);
//     });
//   }
//
//   // ---------------- Работа с аудиториями ----------------
//
//   async function loadAllRooms() {
//     console.log('loadAllRooms START');
//
//     try {
//       allRooms = await fetchRooms('');
//     } catch (e) {
//       allRooms = [];
//       console.error('Failed to load rooms', e);
//     }
//   }
//
//   async function loadRoomsForTime(date, pair) {
//     console.log('loadRoomsForTime START');
//
//     try {
//       freeRooms = await fetchFreeRooms(date, pair);
//       const allPairs = await fetchPairsByTime(date, pair);
//       occupiedRooms = allPairs
//         .filter(p => p.room)
//         .map(p => ({
//           ...p.room,
//           occupiedBy: {
//             subject: p.subject?.name || '',
//             lecturer: p.lecturer ? formatLectFio(p.lecturer) : ''
//           }
//         }));
//     } catch (e) {
//       freeRooms = [];
//       occupiedRooms = [];
//       console.error('Failed to load rooms for time', e);
//     }
//   }
//
//   function renderRoomDropdown(searchQuery = '') {
//     console.log('renderRoomDropdown START');
//
//     const dropdown = document.getElementById('pair-room-dropdown');
//     const input = document.getElementById('pair-room-search');
//     if (!dropdown || !input) return;
//
//     dropdown.innerHTML = '';
//
//     const q = (searchQuery || '').trim().toLowerCase();
//
//     // Фильтруем свободные аудитории
//     const filteredFree = freeRooms.filter(room =>
//       room.title && room.title.toLowerCase().includes(q)
//     );
//
//     // Фильтруем занятые аудитории
//     const filteredOccupied = occupiedRooms.filter(room =>
//       room.title && room.title.toLowerCase().includes(q)
//     );
//
//     // Добавляем свободные аудитории
//     if (filteredFree.length > 0) {
//       const freeHeader = document.createElement('div');
//       freeHeader.className = 'dropdown-header text-success fw-semibold';
//       freeHeader.textContent = 'Свободные аудитории';
//       dropdown.appendChild(freeHeader);
//
//       filteredFree.forEach(room => {
//         const item = document.createElement('button');
//         item.type = 'button';
//         item.className = 'dropdown-item d-flex justify-content-between align-items-center';
//         item.innerHTML = `
//           <span>${room.title}</span>
//           <span class="badge bg-success">Свободна</span>
//         `;
//         item.addEventListener('click', () => {
//           input.value = room.title;
//           input.setAttribute('data-selected-room-uuid', room.uuid || '');
//           dropdown.classList.remove('show');
//         });
//         dropdown.appendChild(item);
//       });
//     }
//
//     // Добавляем занятые аудитории
//     if (filteredOccupied.length > 0) {
//       if (filteredFree.length > 0) {
//         const divider = document.createElement('hr');
//         divider.className = 'dropdown-divider';
//         dropdown.appendChild(divider);
//       }
//
//       const occupiedHeader = document.createElement('div');
//       occupiedHeader.className = 'dropdown-header text-danger fw-semibold';
//       occupiedHeader.textContent = 'Занятые аудитории';
//       dropdown.appendChild(occupiedHeader);
//
//       filteredOccupied.forEach(room => {
//         const item = document.createElement('div');
//         item.className = 'dropdown-item disabled text-danger d-flex justify-content-between align-items-center';
//         item.innerHTML = `
//           <div>
//             <div>${room.title}</div>
//             <small class="text-muted">${room.occupiedBy.subject} - ${room.occupiedBy.lecturer}</small>
//           </div>
//           <span class="badge bg-danger">Занята</span>
//         `;
//         dropdown.appendChild(item);
//       });
//     }
//
//     if (filteredFree.length === 0 && filteredOccupied.length === 0) {
//       const empty = document.createElement('div');
//       empty.className = 'dropdown-item text-muted';
//       empty.textContent = 'Аудитории не найдены';
//       dropdown.appendChild(empty);
//     }
//
//     dropdown.classList.add('show');
//   }
//
//   function wireRoomSearch() {
//     console.log('wireRoomSearch START');
//
//     const input = document.getElementById('pair-room-search');
//     const dropdown = document.getElementById('pair-room-dropdown');
//     if (!input || !dropdown) return;
//
//     input.addEventListener('input', () => {
//       try { input.removeAttribute('data-selected-room-uuid'); } catch (_) {}
//       renderRoomDropdown(input.value);
//     });
//
//     input.addEventListener('focus', () => {
//       renderRoomDropdown(input.value);
//     });
//
//     document.addEventListener('click', (e) => {
//       if (!dropdown.contains(e.target) && e.target !== input) {
//         dropdown.classList.remove('show');
//       }
//     });
//   }
//
//   // ---------------- Работа с преподавателями ----------------
//
//   /**
//    * Отображает выбранных преподавателей в виде чипов с кнопками удаления
//    */
//   function renderSelectedLecturers() {
//     console.log('renderSelectedLecturers START');
//     const container = document.getElementById('selected-lecturers');
//     if (!container) return;
//
//     container.innerHTML = '';
//
//     if (selectedLecturers.length === 0) {
//       const empty = document.createElement('div');
//       empty.className = 'text-muted small';
//       empty.textContent = 'Выбранные преподаватели появятся здесь';
//       container.appendChild(empty);
//       return;
//     }
//
//     selectedLecturers.forEach(lecturer => {
//       const chip = document.createElement('div');
//       chip.className = 'd-inline-flex align-items-center bg-primary text-white rounded-pill px-2 py-1 me-2 mb-2';
//       chip.setAttribute('data-lecturer-uuid', lecturer.uuid);
//
//       const name = document.createElement('span');
//       name.textContent = formatLectFio(lecturer);
//       name.className = 'me-1';
//
//       const removeBtn = document.createElement('button');
//       removeBtn.type = 'button';
//       removeBtn.className = 'btn btn-sm btn-link text-white p-0 m-0';
//       removeBtn.innerHTML = '<i class="bi bi-x"></i>';
//       removeBtn.style.fontSize = '12px';
//       removeBtn.addEventListener('click', () => removeLecturer(lecturer.uuid));
//
//       chip.appendChild(name);
//       chip.appendChild(removeBtn);
//       container.appendChild(chip);
//     });
//
//     updateAvailableLecturers();
//   }
//
//   /**
//    * Удаляет преподавателя из списка выбранных
//    * @param {string} lecturerUuid - UUID преподавателя для удаления
//    */
//   function removeLecturer(lecturerUuid) {
//     console.log('removeLecturer START');
//     selectedLecturers = selectedLecturers.filter(l => l.uuid !== lecturerUuid);
//     renderSelectedLecturers();
//   }
//
//   /**
//    * Обновляет список доступных преподавателей, фильтруя занятых и уже выбранных
//    */
//   function updateAvailableLecturers() {
//     console.log('updateAvailableLecturers START');
//     const dayIdx = Number($('#pair-modal').data('dayIdx')) | 0;
//     const order = Number($('#pair-modal').data('order')) | 0;
//     const date = dateIsoFor(dayIdx);
//
//     // Фильтруем преподавателей кафедры
//     availableLecturers = (lecturers || []).filter(deptLecturer => {
//       // Исключаем уже выбранных
//       if (selectedLecturers.some(selected => selected.uuid === deptLecturer.uuid)) {
//         return false;
//       }
//
//       // Проверяем, не занят ли преподаватель в это время
//       const key = cellKey(deptLecturer.uuid, dayIdx, order);
//       const existingPairs = pairsByCell[key] || [];
//
//       // Проверяем все пары в ячейке - если хотя бы одна содержит этого преподавателя, он занят
//       return !existingPairs.some(pair => {
//         if (pair.lecturers && Array.isArray(pair.lecturers)) {
//           return pair.lecturers.some(l => l.uuid === deptLecturer.uuid);
//         } else if (pair.lecturer && pair.lecturer.uuid) {
//           return pair.lecturer.uuid === deptLecturer.uuid;
//         }
//         return false;
//       });
//     });
//   }
//
//   /**
//    * Рендерит выпадающий список доступных преподавателей с фильтрацией
//    * @param {string} searchQuery - поисковый запрос для фильтрации
//    */
//   function renderLecturerDropdown(searchQuery = '') {
//     console.log('renderLecturerDropdown START');
//     const dropdown = document.getElementById('lecturer-dropdown-list');
//     const searchInput = document.getElementById('lecturer-search');
//     if (!dropdown || !searchInput) return;
//
//     dropdown.innerHTML = '';
//
//     const q = (searchQuery || '').trim().toLowerCase();
//
//     // Отладочная информация
//     console.log('renderLecturerDropdown called with query:', q);
//     console.log('availableLecturers count:', availableLecturers.length);
//     console.log('availableLecturers:', availableLecturers);
//
//     // Фильтруем доступных преподавателей по поисковому запросу
//     const filtered = availableLecturers.filter(lecturer => {
//       const fio = formatLectFio(lecturer).toLowerCase();
//       const matches = fio.includes(q);
//       console.log(`Checking lecturer ${formatLectFio(lecturer)} against query "${q}": ${matches}`);
//       return matches;
//     });
//
//     console.log('Filtered lecturers count:', filtered.length);
//
//     if (filtered.length === 0) {
//       const empty = document.createElement('div');
//       empty.className = 'dropdown-item text-muted';
//       empty.textContent = q ? 'Преподаватели не найдены' : 'Нет доступных преподавателей';
//       dropdown.appendChild(empty);
//     } else {
//       filtered.forEach(lecturer => {
//         const item = document.createElement('button');
//         item.type = 'button';
//         item.className = 'dropdown-item';
//         item.textContent = formatLectFio(lecturer);
//         item.setAttribute('data-lecturer-uuid', lecturer.uuid);
//         item.addEventListener('click', () => selectLecturerFromDropdown(lecturer));
//         dropdown.appendChild(item);
//       });
//     }
//
//     dropdown.classList.add('show');
//     console.log('Dropdown shown with class:', dropdown.className);
//   }
//
//   /**
//    * Добавляет преподавателя из выпадающего списка в список выбранных
//    * @param {Object} lecturer - объект преподавателя
//    */
//   function selectLecturerFromDropdown(lecturer) {
//     console.log('selectLecturerFromDropdown START');
//     const searchInput = document.getElementById('lecturer-search');
//     const dropdown = document.getElementById('lecturer-dropdown-list');
//
//     if (lecturer && !selectedLecturers.some(selected => selected.uuid === lecturer.uuid)) {
//       selectedLecturers.push(lecturer);
//       renderSelectedLecturers();
//     }
//
//     if (searchInput) searchInput.value = '';
//     if (dropdown) dropdown.classList.remove('show');
//   }
//
//   /**
//    * Обновляет состояние кнопки "Добавить" (больше не используется, оставлена для совместимости)
//    */
//   function updateAddLecturerButton() {
//     console.log('updateAddLecturerButton START');
//     const addBtn = document.getElementById('add-lecturer-btn');
//     const searchInput = document.getElementById('lecturer-search');
//     if (!addBtn || !searchInput) return;
//
//     const hasText = searchInput.value.trim().length > 0;
//     const hasAvailable = availableLecturers.length > 0;
//
//     addBtn.disabled = !hasText || !hasAvailable;
//   }
//
//   /**
//    * Настраивает обработчики событий для поиска преподавателей
//    */
//   function wireLecturerSearch() {
//     console.log('wireLecturerSearch START');
//     const searchInput = document.getElementById('lecturer-search');
//     const dropdown = document.getElementById('lecturer-dropdown-list');
//
//     if (!searchInput || !dropdown) return;
//
//     // Показываем дропдаун только при клике на инпут
//     searchInput.addEventListener('click', (e) => {
//       console.log('Search input clicked, current value:', searchInput.value);
//       renderLecturerDropdown(searchInput.value);
//     });
//
//     // При вводе текста фильтруем, но не показываем дропдаун если он уже не показан
//     searchInput.addEventListener('input', () => {
//       if (dropdown.classList.contains('show')) {
//         renderLecturerDropdown(searchInput.value);
//       }
//     });
//
//     // Скрываем дропдаун при потере фокуса
//     searchInput.addEventListener('blur', () => {
//       // Небольшая задержка, чтобы успеть кликнуть на элемент дропдауна
//       setTimeout(() => {
//         dropdown.classList.remove('show');
//       }, 150);
//     });
//
//     document.addEventListener('click', (e) => {
//       if (!dropdown.contains(e.target) && e.target !== searchInput) {
//         dropdown.classList.remove('show');
//       }
//     });
//   }
//
//   // ---------------- Экспорт расписания: выбор групп в модалке ----------------
//
//   function buildExportGroupsList(selectedUuids) {
//     console.log('buildExportGroupsList START');
//
//     const listEl = document.getElementById('export-groups-list');
//     if (!listEl) return;
//     const selected = new Set(selectedUuids || []);
//     listEl.innerHTML = '';
//
//     let baseCourse = null;
//     let baseForm = null;
//     let baseFaculty = null;
//
//     if (selected.size > 0) {
//       const firstUuid = Array.from(selected)[0];
//       const g0 = (groups || []).find(g => g && g.uuid === firstUuid);
//       if (g0) {
//         baseCourse = g0.course ?? null;
//         baseForm = g0.educationForm || null;
//         baseFaculty = g0.faculty || null;
//       }
//     }
//
//     const searchInput = document.getElementById('export-groups-search');
//     const q = searchInput ? (searchInput.value || '').trim().toLowerCase() : '';
//     const source = (groups || []).filter(g => matchesGroupSearch(g, q));
//
//     const sorted = source.slice().sort((a, b) => {
//       const ca = Number(a.course || 0), cb = Number(b.course || 0);
//       if (ca !== cb) return ca - cb;
//       const facA = String(a.faculty || ''), facB = String(b.faculty || '');
//       if (facA !== facB) return facA.localeCompare(facB, 'ru');
//       const fa = String(a.educationForm || ''), fb = String(b.educationForm || '');
//       if (fa !== fb) return fa.localeCompare(fb);
//       const na = String(a.groupName || ''), nb = String(b.groupName || '');
//       return na.localeCompare(nb, 'ru');
//     });
//
//     let lastCourse = null;
//     let lastFaculty = null;
//     let lastForm = null;
//
//     function formLabel(form) {
//       if (form === 'FULL_TIME') return 'очная';
//       if (form === 'PART_TIME') return 'заочная';
//       if (form === 'MIXED') return 'очно-заочная';
//       return form || 'форма не указана';
//     }
//
//     function formatExportGroupLabel(g) {
//       const base = g.groupName || '—';
//       const tail = [];
//       if (g.direction) tail.push(g.direction);
//       if (g.course) tail.push('курс ' + g.course);
//       if (g.educationForm) tail.push(formLabel(g.educationForm));
//       if (g.faculty) tail.push(g.faculty);
//       const t = tail.join(' • ');
//       return t ? `${base} — ${t}` : base;
//     }
//
//     sorted.forEach(g => {
//       const course = g.course || 0;
//       const form = g.educationForm || '';
//       const faculty = g.faculty || '';
//
//       if (lastCourse !== course) {
//         lastCourse = course;
//         lastFaculty = null;
//         lastForm = null;
//         const h = document.createElement('div');
//         h.className = 'mt-2 fw-bold';
//         h.textContent = 'Курс ' + (course || '?') + ':';
//         listEl.appendChild(h);
//       }
//       if (lastFaculty !== faculty) {
//         lastFaculty = faculty;
//         lastForm = null;
//         const h = document.createElement('div');
//         h.className = 'pt-1 ms-2 fst-italic';
//         h.textContent = faculty || 'Факультет не указан';
//         listEl.appendChild(h);
//       }
//       if (lastForm !== form) {
//         lastForm = form;
//         const h = document.createElement('div');
//         h.className = 'ms-4 fw-semibold';
//         h.textContent = formLabel(form);
//         listEl.appendChild(h);
//       }
//
//       const wrap = document.createElement('div');
//       wrap.className = 'form-check ms-5';
//       const id = 'eg_' + g.uuid;
//       const cb = document.createElement('input');
//       cb.type = 'checkbox';
//       cb.className = 'form-check-input';
//       cb.id = id;
//       cb.setAttribute('data-group-uuid', g.uuid || '');
//       cb.checked = selected.has(g.uuid);
//       cb.addEventListener('change', () => {
//         if (cb.checked) {
//           if (baseCourse == null && !baseForm && !baseFaculty) {
//             baseCourse = g.course ?? null;
//             baseForm = g.educationForm || null;
//             baseFaculty = g.faculty || null;
//             selected.add(g.uuid);
//             return;
//           }
//           const sameCourse = (baseCourse == null) || (Number(g.course || 0) === Number(baseCourse));
//           const sameForm = (!baseForm) || (String(g.educationForm || '') === String(baseForm));
//           const sameFaculty = (!baseFaculty) || (String(g.faculty || '') === String(baseFaculty));
//           if (!sameCourse || !sameForm || !sameFaculty) {
//             cb.checked = false;
//             showToastSimple('Для экспорта можно выбрать только группы одного курса, формы обучения и факультета', 'warning');
//             return;
//           }
//           selected.add(g.uuid);
//         } else {
//           selected.delete(g.uuid);
//           if (selected.size === 0) {
//             baseCourse = null;
//             baseForm = null;
//             baseFaculty = null;
//           }
//         }
//       });
//
//       const label = document.createElement('label');
//       label.className = 'form-check-label';
//       label.htmlFor = id;
//       label.textContent = formatExportGroupLabel(g);
//       wrap.appendChild(cb);
//       wrap.appendChild(label);
//       listEl.appendChild(wrap);
//     });
//
//     if (!sorted.length) {
//       const empty = document.createElement('div');
//       empty.className = 'text-muted small';
//       empty.textContent = 'Нет групп для отображения';
//       listEl.appendChild(empty);
//     }
//   }
//
//   function getSelectedExportGroupUuids() {
//     console.log('getSelectedExportGroupUuids START');
//
//     const listEl = document.getElementById('export-groups-list');
//     if (!listEl) return [];
//     return Array.from(listEl.querySelectorAll('input[type="checkbox"][data-group-uuid]:checked'))
//       .map(cb => cb.getAttribute('data-group-uuid'))
//       .filter(Boolean);
//   }
//
//   function wireExportGroupSearch() {
//     console.log('wireExportGroupSearch START');
//
//     const input = document.getElementById('export-groups-search');
//     if (!input) return;
//     input.addEventListener('input', () => {
//       const selected = getSelectedExportGroupUuids();
//       buildExportGroupsList(selected);
//     });
//   }
//
//   function toggleExportModal(show) {
//     console.log('toggleExportModal START');
//
//     const el = document.getElementById('export-modal');
//     if (!el) return;
//     el.style.display = show ? 'block' : 'none';
//     el.classList.toggle('show', !!show);
//     if (show) {
//       el.style.background = 'rgba(0,0,0,0.5)';
//       el.style.position = 'fixed';
//       el.style.top = '0';
//       el.style.left = '0';
//       el.style.width = '100%';
//       el.style.height = '100%';
//       const dialog = el.querySelector('.modal-dialog');
//       if (dialog) dialog.style.marginTop = '10vh';
//     } else {
//       el.style.background = '';
//     }
//     // на всякий случай чистим возможный bootstrap backdrop и класс modal-open
//     try {
//       document.body.classList.remove('modal-open');
//       const backs = document.querySelectorAll('.modal-backdrop');
//       backs.forEach(b => {
//         if (b && b.parentNode) b.parentNode.removeChild(b);
//       });
//     } catch (_) {}
//   }
//
//   // ---------------- Копирование расписания недели (copy-week-modal) ----------------
//
//   function formatWeekRangeWithYear(mondayDate) {
//     console.log('formatWeekRangeWithYear START');
//
//     const start = new Date(mondayDate);
//     const end = new Date(mondayDate);
//     end.setDate(end.getDate() + 6);
//     const fmt = (d) => {
//       const dd = String(d.getDate()).padStart(2, '0');
//       const mm = String(d.getMonth() + 1).padStart(2, '0');
//       const yyyy = d.getFullYear();
//       return `${dd}.${mm}.${yyyy}`;
//     };
//     return `${fmt(start)}-${fmt(end)}`;
//   }
//
//   function buildCopyWeekList() {
//     console.log('buildCopyWeekList START');
//
//     const list = document.getElementById('copy-week-list');
//     if (!list) return;
//     list.innerHTML = '';
//
//     // Генерируем только прошлые недели относительно текущей (weekStart)
//     const items = [];
//     const cursor = new Date(weekStart);
//     cursor.setHours(0, 0, 0, 0);
//     cursor.setDate(cursor.getDate() - 7); // начинаем с недели ПЕРЕД текущей
//
//     let guard = 0;
//     while (guard < 104) { // ограничимся примерно двумя годами назад
//       const monday = new Date(cursor);
//       items.push(monday);
//       cursor.setDate(cursor.getDate() - 7);
//       guard++;
//     }
//
//     if (!items.length) {
//       const empty = document.createElement('div');
//       empty.className = 'text-muted small';
//       empty.textContent = 'Нет доступных недель для копирования';
//       list.appendChild(empty);
//       return;
//     }
//
//     items.forEach(monday => {
//       const iso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
//       const id = `copy-week-${iso}`;
//
//       const wrapper = document.createElement('div');
//       wrapper.className = 'form-check';
//
//       const input = document.createElement('input');
//       input.type = 'radio';
//       input.className = 'form-check-input';
//       input.name = 'copy-week-source';
//       input.id = id;
//       input.value = iso;
//
//       const label = document.createElement('label');
//       label.className = 'form-check-label';
//       label.htmlFor = id;
//       label.textContent = formatWeekRangeWithYear(monday);
//
//       wrapper.appendChild(input);
//       wrapper.appendChild(label);
//       list.appendChild(wrapper);
//     });
//   }
//
//   function toggleCopyWeekModal(show) {
//     console.log('toggleCopyWeekModal START');
//
//     const el = document.getElementById('copy-week-modal');
//     if (!el) return;
//     el.style.display = show ? 'block' : 'none';
//     el.classList.toggle('show', !!show);
//     if (show) {
//       el.style.background = 'rgba(0,0,0,0.5)';
//       el.style.position = 'fixed';
//       el.style.top = '0';
//       el.style.left = '0';
//       el.style.width = '100%';
//       el.style.height = '100%';
//       const dialog = el.querySelector('.modal-dialog');
//       if (dialog) dialog.style.marginTop = '10vh';
//     } else {
//       el.style.background = '';
//     }
//   }
//
//   async function openPairModalForCell($cell) {
//     console.log('openPairModalForCell START');
//
//     const lectUuid = $cell.data('lecturer-uuid');
//     const dayIdx = Number($cell.data('day-idx')) | 0;
//     const order = Number($cell.data('pair-order')) | 0;
//     if (!lectUuid) {
//       showToastSimple('Не удалось определить преподавателя для ячейки', 'danger');
//       return;
//     }
//
//     // Сначала ищем пары для конкретного преподавателя, чтобы получить базовую информацию
//     const key = cellKey(lectUuid, dayIdx, order);
//     const lecturerPairs = pairsByCell[key] || [];
//
//     const $modal = $('#pair-modal');
//     if (!$modal.length) {
//       showToastSimple('Модалка пары не найдена в шаблоне', 'danger');
//       return;
//     }
//
//     const $name = $('#pair-name');
//     const $roomSearch = $('#pair-room-search');
//
//     // по умолчанию очищаем выбранный предмет
//     try { $name.removeAttr('data-selected-subject-uuid'); } catch (_) {}
//     try { $roomSearch.removeAttr('data-selected-room-uuid'); } catch (_) {}
//
//     // Инициализируем преподавателей
//     selectedLecturers = [];
//
//     if (lecturerPairs.length > 0) {
//       // Берем первую пару как эталон для поиска связанных пар
//       const referencePair = lecturerPairs[0];
//       const referenceSubject = referencePair.subject?.uuid || null;
//       const referenceRoom = referencePair.room?.uuid || null;
//       const referenceDate = referencePair.dateString;
//
//       // Ищем все пары с таким же предметом, аудиторией и датой у всех преподавателей
//       let allRelatedPairs = [];
//       (lecturers || []).forEach(lecturer => {
//         const lectKey = cellKey(lecturer.uuid, dayIdx, order);
//         const pairs = pairsByCell[lectKey] || [];
//         pairs.forEach(pair => {
//           // Проверяем, что это та же пара (предмет + аудитория + дата)
//           const pairSubject = pair.subject?.uuid || null;
//           const pairRoom = pair.room?.uuid || null;
//           const pairDate = pair.dateString;
//
//           if (pairSubject === referenceSubject &&
//               pairRoom === referenceRoom &&
//               pairDate === referenceDate) {
//             allRelatedPairs.push(pair);
//           }
//         });
//       });
//
//       // Убираем дубликаты по UUID
//       const uniquePairs = [];
//       const seenUuids = new Set();
//       allRelatedPairs.forEach(pair => {
//         if (pair.uuid && !seenUuids.has(pair.uuid)) {
//           seenUuids.add(pair.uuid);
//           uniquePairs.push(pair);
//         }
//       });
//
//       // Собираем всех уникальных преподавателей из связанных пар
//       const existingLecturers = new Set();
//       uniquePairs.forEach(p => {
//         if (p.lecturers && Array.isArray(p.lecturers)) {
//           p.lecturers.forEach(l => {
//             if (l.uuid) existingLecturers.add(l.uuid);
//           });
//         } else if (p.lecturer && p.lecturer.uuid) {
//           existingLecturers.add(p.lecturer.uuid);
//         }
//       });
//
//       // Добавляем всех преподавателей из существующих пар
//       existingLecturers.forEach(lectUuid => {
//         const lecturer = (lecturers || []).find(l => l.uuid === lectUuid);
//         if (lecturer && !selectedLecturers.some(selected => selected.uuid === lecturer.uuid)) {
//           selectedLecturers.push(lecturer);
//         }
//       });
//
//       // Загружаем аудитории для конкретного времени
//       const date = dateIsoFor(dayIdx);
//       await loadRoomsForTime(date, order);
//
//       const first = uniquePairs[0];
//       const title = (first.subject && first.subject.name) ? first.subject.name : (first.name || '');
//       $name.val(title);
//       if (first.room) {
//         $roomSearch.val(first.room.title || '');
//         $roomSearch.attr('data-selected-room-uuid', first.room.uuid || '');
//       }
//       // если есть subject.uuid, запоминаем его на инпуте
//       try {
//         if (first.subject && first.subject.uuid) {
//           $name.attr('data-selected-subject-uuid', first.subject.uuid);
//         }
//       } catch (_) {}
//       const groupUuids = uniquePairs.map(p => p.group && p.group.uuid).filter(Boolean);
//       buildGroupsListInModal(groupUuids);
//       $modal.data('existing', uniquePairs);
//     } else {
//       // Для новой пары добавляем преподавателя, по которому кликнули
//       const clickedLecturer = (lecturers || []).find(l => l.uuid === lectUuid);
//       if (clickedLecturer) {
//         selectedLecturers.push(clickedLecturer);
//       }
//
//       // Загружаем аудитории для конкретного времени
//       const date = dateIsoFor(dayIdx);
//       await loadRoomsForTime(date, order);
//
//       $name.val('');
//       $roomSearch.val('');
//       $('#pair-groups-search').val('');
//       buildGroupsListInModal([]);
//       $modal.data('existing', null);
//     }
//
//     $modal.data('lectUuid', lectUuid);
//     $modal.data('dayIdx', dayIdx);
//     $modal.data('order', order);
//
//     // Поведение блока повторения по неделям
//     const repeatWrap = document.getElementById('repeat-weeks-wrap');
//     const repeatList = document.getElementById('repeat-weeks-list');
//     const repeatSelectAll = document.getElementById('repeat-select-all');
//     if (repeatWrap && repeatList && repeatSelectAll) {
//       if (lecturerPairs.length > 0) {
//         // для редактирования существующей пары повторение не показываем
//         repeatWrap.classList.add('d-none');
//         repeatList.innerHTML = '';
//         repeatSelectAll.checked = false;
//       } else {
//         repeatWrap.classList.remove('d-none');
//         renderRepeatWeeksList(dayIdx);
//       }
//     }
//
//     // Простое поведение модалки: затемнение фона и центрирование
//     const modalEl = $modal[0];
//     modalEl.style.display = 'block';
//     modalEl.classList.add('show');
//     modalEl.style.background = 'rgba(0,0,0,0.5)';
//     modalEl.style.position = 'fixed';
//     modalEl.style.top = '0';
//     modalEl.style.left = '0';
//     modalEl.style.width = '100%';
//     modalEl.style.height = '100%';
//     const dialog = modalEl.querySelector('.modal-dialog');
//     if (dialog) dialog.style.marginTop = '10vh';
//
//     // Показываем выпадающий список с аудиториями
//     renderRoomDropdown();
//
//     // Инициализируем преподавателей
//     renderSelectedLecturers();
//     updateAvailableLecturers();
//
//     return $modal;
//   }
//
//   async function tryOpenCell($cell) {
//     console.log('tryOpenCell START');
//
//     const lectUuid = $cell.data('lecturer-uuid');
//     const dayIdx = Number($cell.data('day-idx')) | 0;
//     const order = Number($cell.data('pair-order')) | 0;
//     if (!lectUuid) {
//       showToastSimple('Не удалось определить преподавателя для ячейки', 'danger');
//       return;
//     }
//
//     // Проверяем, доступен ли сервис блокировок
//     if (!locks) {
//       console.warn('Locks service not available, opening modal without lock');
//       const $modal = await openPairModalForCell($cell);
//       if ($modal && $modal.length) {
//         $modal.data('lockCell', null);
//       }
//       return;
//     }
//
//     // Проверяем, инициализирован ли сервис блокировок
//     if (!locks.initialized) {
//       console.log('Locks service not initialized, trying to initialize...');
//       try {
//         await locks.init(lectUuid);
//         locks.initialized = true;
//         console.log('Locks service initialized on demand');
//       } catch (e) {
//         console.error('Failed to initialize locks service on demand', e);
//         showToastSimple('Сервис блокировок временно недоступен. Открытие без блокировки.', 'warning');
//         const $modal = await openPairModalForCell($cell);
//         if ($modal && $modal.length) {
//           $modal.data('lockCell', null);
//         }
//         return;
//       }
//     }
//
//     const lockCell = buildLockCell(lectUuid, dayIdx, order);
//
//     try {
//       if (locks.isLocked(lockCell)) {
//         showToastSimple('Эта ячейка сейчас редактируется другим пользователем', 'warning');
//         return;
//       }
//     } catch (_) {}
//
//     let acquired = false;
//     try {
//       acquired = await locks.acquire(lockCell, 30);
//     } catch (e) {
//       console.error('Failed to acquire lock', e);
//       showToastSimple('Сервис блокировок временно недоступен. Попробуйте обновить страницу.', 'warning');
//       return;
//     }
//
//     if (!acquired) {
//       showToastSimple('Ячейка уже занята другим пользователем', 'warning');
//       return;
//     }
//
//     const $modal = await openPairModalForCell($cell);
//     if ($modal && $modal.length) {
//       $modal.data('lockCell', lockCell);
//     }
//   }
//
//   async function saveModal() {
//     console.log('saveModal START');
//
//     const $modal = $('#pair-modal');
//     const existing = $modal.data('existing') || [];
//     const lectUuid = $modal.data('lectUuid');
//     const dayIdx = Number($modal.data('dayIdx')) | 0;
//     const order = Number($modal.data('order')) | 0;
//
//     const $name = $('#pair-name');
//     const $roomSearch = $('#pair-room-search');
//     const name = ($name.val() || '').trim();
//     const roomTitle = ($roomSearch.val() || '').trim();
//
//     if (!name) {
//       showToastSimple('Укажите название предмета', 'warning');
//       return;
//     }
//
//     const selectedGroupUuids = getSelectedGroupUuidsFromModal();
//     if (!selectedGroupUuids.length) {
//       showToastSimple('Выберите хотя бы одну группу', 'warning');
//       return;
//     }
//
//     // Валидация преподавателей
//     if (!selectedLecturers.length) {
//       showToastSimple('Выберите хотя бы одного преподавателя', 'warning');
//       return;
//     }
//
//     // Приводим день недели к дате текущей недели (основанной на weekStart)
//     const d = new Date(weekStart);
//     d.setDate(d.getDate() + dayIdx);
//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, '0');
//     const dd = String(d.getDate()).padStart(2, '0');
//     const dateIso = `${yyyy}-${mm}-${dd}`;
//
//     // Определяем предмет по выбранному значению / названию
//     let subjectUuid = '';
//     try { subjectUuid = $name.attr('data-selected-subject-uuid') || ''; } catch (_) { subjectUuid = ''; }
//     if (!subjectUuid) {
//       try {
//         const q = name.toLowerCase();
//         const exact = (Array.isArray(deptSubjects) ? deptSubjects : []).find(s => s && s.name && s.name.toLowerCase() === q);
//         if (exact && exact.uuid) subjectUuid = exact.uuid;
//       } catch (_) {}
//     }
//
//     // Определяем аудиторию по UUID или названию
//     let roomPayload = null;
//     if (roomTitle) {
//       let roomUuid = '';
//       try { roomUuid = $roomSearch.attr('data-selected-room-uuid') || ''; } catch (_) { roomUuid = ''; }
//       if (roomUuid) {
//         roomPayload = { uuid: roomUuid };
//       } else {
//         // Если UUID нет, ищем по названию в свободных аудиториях
//         const foundRoom = freeRooms.find(r => r.title === roomTitle);
//         if (foundRoom) {
//           roomPayload = { uuid: foundRoom.uuid };
//         }
//       }
//     }
//
//     const basePayload = {
//       name,
//       room: roomPayload,
//       pairOrder: order,
//       subject: subjectUuid ? { uuid: subjectUuid } : null,
//       lecturers: selectedLecturers.map(l => ({ uuid: l.uuid }))
//     };
//
//     let created = 0, updated = 0, errors = 0;
//
//     // Повторение по неделям: собираем даты
//     const extraDates = collectRepeatDates(dayIdx);
//     const dates = [dateIso, ...extraDates.filter(dIso => dIso !== dateIso)];
//
//     // Map существующих пар по groupUuid
//     const byGroup = new Map();
//     (existing || []).forEach(p => {
//       const gid = p.group && p.group.uuid;
//       if (gid && p.uuid) byGroup.set(gid, p.uuid);
//     });
//
//     for (const dIso of dates) {
//       for (const gUuid of selectedGroupUuids) {
//         const payload = { ...basePayload, group: { uuid: gUuid }, dateString: dIso };
//         try {
//           if (dIso === dateIso && byGroup.has(gUuid)) {
//             await updatePair(byGroup.get(gUuid), payload);
//             updated++;
//           } else {
//             await savePair(payload);
//             created++;
//           }
//         } catch (e) {
//           console.error('Save/update pair failed', e);
//           errors++;
//         }
//       }
//     }
//
//     const anySuccess = (created + updated) > 0;
//     if (created) showToastSimple(`Создано записей: ${created}`, 'success');
//     if (updated) showToastSimple(`Обновлено записей: ${updated}`, 'info');
//     if (errors) showToastSimple(`Ошибок: ${errors}`, errors && !anySuccess ? 'danger' : 'warning');
//
//     // Скрываем модалку только при успешном сохранении (есть созданные/обновлённые записи)
//     if (anySuccess) {
//       const modalEl = $modal[0];
//       modalEl.style.display = 'none';
//       modalEl.classList.remove('show');
//       modalEl.style.background = '';
//       try {
//         const lockCell = $modal.data('lockCell');
//         if (lockCell && locks) {
//           locks.release(lockCell);
//           $modal.removeData('lockCell');
//         }
//       } catch (_) {}
//       try {
//         if (lectUuid && locks) {
//           locks.broadcastReload(lectUuid);
//         }
//       } catch (_) {}
//       await loadPairsForWeek();
//       renderPairsIntoGrid();
//     }
//   }
//
//   function wireModalButtons() {
//     console.log('wireModalButtons START');
//
//     $('#pair-close').on('click', () => {
//       const el = document.getElementById('pair-modal');
//       if (!el) return;
//       el.style.display = 'none';
//       el.classList.remove('show');
//       el.style.background = '';
//       try {
//         const $modal = $('#pair-modal');
//         const lockCell = $modal.data('lockCell');
//         if (lockCell && locks) {
//           locks.release(lockCell);
//           $modal.removeData('lockCell');
//         }
//       } catch (_) {}
//     });
//     $('#pair-cancel').on('click', () => {
//       const el = document.getElementById('pair-modal');
//       if (!el) return;
//       el.style.display = 'none';
//       el.classList.remove('show');
//       el.style.background = '';
//       try {
//         const $modal = $('#pair-modal');
//         const lockCell = $modal.data('lockCell');
//         if (lockCell && locks) {
//           locks.release(lockCell);
//           $modal.removeData('lockCell');
//         }
//       } catch (_) {}
//     });
//     $('#pair-save').on('click', () => { saveModal(); });
//   }
//
//   // ---------------- Кафедры ----------------
//
//   function renderDepartmentDropdown(items) {
//     console.log('renderDepartmentDropdown START');
//
//     const $dd = $('#department-dropdown');
//     if (!$dd.length) return;
//     $dd.empty();
//     if (!items || !items.length) {
//       $('<div class="dropdown-item text-muted">Ничего не найдено</div>').appendTo($dd);
//       $dd.addClass('show');
//       return;
//     }
//     items.forEach(d => {
//       const $btn = $('<button type="button" class="dropdown-item text-wrap"></button>');
//       $btn.text(d && d.name ? d.name : 'Кафедра');
//       $btn.on('click', async () => {
//         selectedDepartment = { uuid: d.uuid, name: d.name || '' };
//         $('#department-selected')
//           .text('Выбрана: ' + (selectedDepartment.name || '—'))
//           .attr('data-selected-uuid', selectedDepartment.uuid || '');
//         $('#department-search').val(selectedDepartment.name || '');
//         $dd.removeClass('show');
//         setDepartmentSubjectsFromDto(d);
//
//         await loadLecturersForDepartment(d);
//         await loadPairsForWeek();
//         buildGrid();
//
//         // Подключаемся к каналам локов для всех преподавателей кафедры и загружаем snapshot
//         try {
//           if (lecturers && lecturers.length) {
//             console.log('Initializing locks service for main department');
//             const first = lecturers[0];
//             await locks.init(first && first.uuid ? first.uuid : null);
//             locks.initialized = true;
//
//             for (const l of lecturers) {
//               if (l && l.uuid) {
//                 await locks.ensure(l.uuid);
//                 await locks.loadActive(l.uuid);
//               }
//             }
//           }
//         } catch (e) {
//           console.error('Failed to initialize locks for main department', e);
//           showToastSimple('Предупреждение: сервис блокировок может быть недоступен', 'warning');
//         }
//       });
//       $dd.append($btn);
//     });
//     $dd.addClass('show');
//   }
//
//   function wireDepartmentSearch() {
//     console.log('wireDepartmentSearch START');
//
//     const $input = $('#department-search');
//     const $dd = $('#department-dropdown');
//     if (!$input.length || !$dd.length) return;
//
//     function load() {
//       const q = ($input.val() || '').trim();
//       fetchDepartments(q)
//           .then(renderDepartmentDropdown)
//           .catch(e => {
//             console.error('Failed to load departments', e);
//             renderDepartmentDropdown([]);
//           });
//     }
//
//     $input.on('input', () => load());
//     $input.on('focus', () => load());
//     $(document).on('click', (e) => {
//       if (!$.contains($dd[0], e.target) && e.target !== $input[0]) {
//         $dd.removeClass('show');
//       }
//     });
//   }
//
//   // ---------------- Управление несколькими кафедрами ----------------
//
//   /**
//    * Добавляет новую кафедру в список выбранных
//    */
//   function addDepartment(department) {
//     console.log('addDepartment START');
//     const deptId = `dept-${++departmentCounter}`;
//
//     // Проверяем, что кафедра еще не добавлена
//     if (selectedDepartments.some(d => d.uuid === department.uuid)) {
//       showToastSimple('Эта кафедра уже добавлена', 'warning');
//       return;
//     }
//
//     const deptData = {
//       id: deptId,
//       uuid: department.uuid,
//       name: department.name,
//       lecturers: [],
//       subjects: []
//     };
//
//     selectedDepartments.push(deptData);
//     renderAdditionalDepartment(deptData);
//     loadDepartmentData(deptData);
//
//     showToastSimple(`Кафедра "${department.name}" добавлена`, 'success');
//   }
//
//   /**
//    * Рендерит дополнительную кафедру в интерфейсе
//    */
//   function renderAdditionalDepartment(deptData) {
//     console.log('renderAdditionalDepartment START');
//     const container = document.getElementById('additional-departments');
//     if (!container) return;
//
//     const deptEl = document.createElement('div');
//     deptEl.className = 'd-flex align-items-center gap-2 p-2 border rounded bg-light';
//     deptEl.id = deptData.id;
//
//     deptEl.innerHTML = `
//       <span class="fw-medium">${deptData.name}</span>
//       <button class="btn btn-sm btn-outline-danger remove-dept-btn" data-dept-id="${deptData.id}">
//         <i class="bi bi-x"></i>
//       </button>
//     `;
//
//     container.appendChild(deptEl);
//
//     // Обработчик удаления
//     deptEl.querySelector('.remove-dept-btn').addEventListener('click', () => {
//       removeDepartment(deptData.id);
//     });
//   }
//
//   /**
//    * Загружает данные для кафедры (преподаватели, предметы)
//    */
//   async function loadDepartmentData(deptData) {
//     console.log('loadDepartmentData START');
//     console.log('Loading data for department:', deptData.name, 'UUID:', deptData.uuid);
//
//     try {
//       // Загружаем преподавателей кафедры
//       console.log('Calling fetchLecturers with UUID:', deptData.uuid);
//       const deptLecturers = await fetchLecturers(deptData.uuid);
//       console.log('fetchLecturers returned:', deptLecturers);
//       deptData.lecturers = deptLecturers || [];
//       console.log('Loaded lecturers for department:', deptData.lecturers.length);
//
//       // Если преподавателей нет, попробуем загрузить всех и отфильтровать
//       if (deptData.lecturers.length === 0) {
//         console.log('No lecturers found, trying to load all and filter...');
//         try {
//           const allLecturers = await fetchLecturers('');
//           console.log('All lecturers loaded:', allLecturers.length);
//           const filtered = allLecturers.filter(l =>
//             l && l.department && l.department.uuid === deptData.uuid
//           );
//           console.log('Filtered lecturers for department:', filtered.length);
//           deptData.lecturers = filtered;
//         } catch (e) {
//           console.error('Failed to load and filter all lecturers', e);
//         }
//       }
//
//       // Добавляем преподавателей к общему списку
//       lecturers.push(...deptData.lecturers);
//       console.log('Total lecturers after adding:', lecturers.length);
//
//       // Загружаем предметы кафедры
//       try {
//         const allDepartments = await fetchDepartments('');
//         const deptInfo = allDepartments.find(d => d.uuid === deptData.uuid);
//         if (deptInfo && Array.isArray(deptInfo.subjects)) {
//           deptData.subjects = deptInfo.subjects;
//           // Обновляем общие предметы, добавляя новые
//           const existingSubjects = deptSubjects.map(s => s.uuid);
//           const newSubjects = deptInfo.subjects.filter(s => !existingSubjects.includes(s.uuid));
//           deptSubjects.push(...newSubjects);
//         }
//       } catch (e) {
//         console.error('Failed to load department subjects', e);
//         deptData.subjects = [];
//       }
//
//       // Подключаемся к каналам локов для преподавателей новой кафедры
//       try {
//         if (locks && deptData.lecturers.length > 0) {
//           console.log('Initializing locks for', deptData.lecturers.length, 'lecturers');
//
//           // Если сервис еще не инициализирован, инициализируем его
//           if (!locks.initialized) {
//             const firstLecturer = deptData.lecturers[0];
//             if (firstLecturer && firstLecturer.uuid) {
//               console.log('Initializing locks service with lecturer:', firstLecturer.uuid);
//               await locks.init(firstLecturer.uuid);
//               locks.initialized = true;
//             }
//           }
//
//           // Подключаем каждого преподавателя к своему каналу
//           for (const lecturer of deptData.lecturers) {
//             if (lecturer && lecturer.uuid) {
//               console.log('Ensuring lock for lecturer:', lecturer.uuid);
//               await locks.ensure(lecturer.uuid);
//               await locks.loadActive(lecturer.uuid);
//             }
//           }
//         }
//       } catch (e) {
//         console.error('Failed to initialize locks for department', e);
//         showToastSimple('Предупреждение: сервис блокировок может быть недоступен для новой кафедры', 'warning');
//       }
//
//       console.log('About to call loadPairsForWeek and buildGrid');
//       // Обновляем сетку
//       await loadPairsForWeek();
//       buildGrid();
//
//     } catch (e) {
//       console.error('Failed to load department data', e);
//       showToastSimple('Ошибка загрузки данных кафедры', 'danger');
//     }
//   }
//
//   /**
//    * Удаляет кафедру из списка
//    */
//   function removeDepartment(deptId) {
//     console.log('removeDepartment START');
//     const index = selectedDepartments.findIndex(d => d.id === deptId);
//     if (index === -1) return;
//
//     const deptData = selectedDepartments[index];
//
//     // Удаляем преподавателей этой кафедры из общего списка
//     lecturers = lecturers.filter(l => !deptData.lecturers.some(dl => dl.uuid === l.uuid));
//
//     // Удаляем кафедру из списка
//     selectedDepartments.splice(index, 1);
//
//     // Удаляем элемент из DOM
//     const deptEl = document.getElementById(deptId);
//     if (deptEl) deptEl.remove();
//
//     // Перерисовываем сетку
//     loadPairsForWeek();
//     buildGrid();
//
//     showToastSimple(`Кафедра "${deptData.name}" удалена`, 'info');
//   }
//
//   /**
//    * Показывает модалку для выбора дополнительной кафедры
//    */
//   function showAdditionalDepartmentModal() {
//     console.log('showAdditionalDepartmentModal START');
//     // Создаем модальное окно для выбора кафедры
//     const modalHtml = `
//       <div id="additional-department-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1080;">
//         <div class="modal-dialog" style="position: relative; margin: 10vh auto; max-width: 500px; width: 90%;">
//           <div class="modal-content bg-white rounded shadow">
//             <div class="modal-header p-3 border-bottom">
//               <h5 class="modal-title mb-0">Добавить кафедру</h5>
//               <button type="button" class="btn-close" id="close-additional-dept-modal"></button>
//             </div>
//             <div class="modal-body p-3">
//               <div class="mb-3">
//                 <label for="additional-dept-search" class="form-label">Поиск кафедры</label>
//                 <div class="position-relative">
//                   <input id="additional-dept-search" type="text" class="form-control"
//                          placeholder="Начните вводить название кафедры...">
//                   <div id="additional-dept-dropdown" class="dropdown-menu w-100 shadow"
//                        style="max-height: 260px; overflow-y: auto;"></div>
//                 </div>
//               </div>
//             </div>
//             <div class="modal-footer p-3 border-top">
//               <button type="button" class="btn btn-secondary" id="cancel-additional-dept-modal">Отмена</button>
//             </div>
//           </div>
//         </div>
//       </div>
//     `;
//
//     // Удаляем существующее модальное окно если есть
//     const existingModal = document.getElementById('additional-department-modal');
//     if (existingModal) existingModal.remove();
//
//     // Добавляем новое модальное окно
//     document.body.insertAdjacentHTML('beforeend', modalHtml);
//
//     // Показываем модальное окно
//     const modal = document.getElementById('additional-department-modal');
//     modal.style.display = 'block';
//
//     // Обработчики закрытия
//     document.getElementById('close-additional-dept-modal').addEventListener('click', () => {
//       modal.remove();
//     });
//
//     document.getElementById('cancel-additional-dept-modal').addEventListener('click', () => {
//       modal.remove();
//     });
//
//     // Закрытие по клику вне модалки
//     modal.addEventListener('click', (e) => {
//       if (e.target === modal) {
//         modal.remove();
//       }
//     });
//
//     // Настраиваем поиск кафедр
//     wireAdditionalDepartmentSearch();
//   }
//
//   /**
//    * Настраивает поиск кафедр в дополнительном модальном окне
//    */
//   async function wireAdditionalDepartmentSearch() {
//     console.log('wireAdditionalDepartmentSearch START');
//     const searchInput = document.getElementById('additional-dept-search');
//     const dropdown = document.getElementById('additional-dept-dropdown');
//
//     if (!searchInput || !dropdown) return;
//
//     // Загружаем все кафедры
//     let allDepartments = [];
//     try {
//       allDepartments = await fetchDepartments('');
//     } catch (e) {
//       console.error('Failed to load departments', e);
//       return;
//     }
//
//     // Обработчик ввода
//     searchInput.addEventListener('input', () => {
//       const query = searchInput.value.trim().toLowerCase();
//
//       // Фильтруем кафедры, исключая уже добавленные
//       const addedUuids = selectedDepartments.map(d => d.uuid);
//       const filtered = allDepartments.filter(dept =>
//         !addedUuids.includes(dept.uuid) &&
//         dept.name.toLowerCase().includes(query)
//       );
//
//       dropdown.innerHTML = '';
//
//       if (filtered.length === 0) {
//         const empty = document.createElement('div');
//         empty.className = 'dropdown-item text-muted';
//         empty.textContent = query ? 'Кафедры не найдены' : 'Все кафедры уже добавлены';
//         dropdown.appendChild(empty);
//       } else {
//         filtered.forEach(dept => {
//           const item = document.createElement('button');
//           item.type = 'button';
//           item.className = 'dropdown-item';
//           item.textContent = dept.name;
//           item.addEventListener('click', () => {
//             addDepartment(dept);
//             const modal = document.getElementById('additional-department-modal');
//             if (modal) modal.remove();
//           });
//           dropdown.appendChild(item);
//         });
//       }
//
//       dropdown.classList.add('show');
//     });
//
//     // Скрываем дропдаун при потере фокуса
//     searchInput.addEventListener('blur', () => {
//       setTimeout(() => dropdown.classList.remove('show'), 150);
//     });
//
//     // Показываем дропдаун при фокусе
//     searchInput.addEventListener('focus', () => {
//       searchInput.dispatchEvent(new Event('input'));
//     });
//   }
//
//   // ---------------- Инициализация ----------------
//
//   async function init() {
//     console.log('init START');
//
//     const root = document.getElementById('schedule-page');
//     if (!root) return;
//     await loadAllGroupsOnce();
//     await loadAllRooms();
//     setWeekUI();
//     wireDepartmentSearch();
//     wireModalButtons();
//     wireGroupSearch();
//     wireRoomSearch();
//     wireSubjectAutocomplete();
//     wireExportGroupSearch();
//     wireLecturerSearch();
//
//     // Обработчик кнопки добавления кафедры
//     const addDeptBtn = document.getElementById('add-department-btn');
//     if (addDeptBtn) {
//       addDeptBtn.addEventListener('click', showAdditionalDepartmentModal);
//     }
//
//     // Инициализация сервис блокировок
//     try {
//       console.log('Initializing locks service...');
//       if (locks && typeof locks.init === 'function') {
//         await locks.init(null);
//         locks.initialized = true;
//         console.log('Locks service initialized successfully');
//       } else {
//         console.warn('Locks service not available');
//         locks = null;
//       }
//     } catch (e) {
//       console.error('Failed to initialize locks service', e);
//       locks = null;
//     }
//
//     // Переключение недель
//     document.getElementById('week-prev')?.addEventListener('click', async () => {
//       weekStart.setDate(weekStart.getDate() - 7);
//       setWeekUI();
//       await loadPairsForWeek();
//       buildGrid();
//     });
//     document.getElementById('week-next')?.addEventListener('click', async () => {
//       weekStart.setDate(weekStart.getDate() + 7);
//       setWeekUI();
//       await loadPairsForWeek();
//       buildGrid();
//     });
//
//     // Экспорт расписания в Excel
//     const exportBtn = document.getElementById('export-schedule');
//     if (exportBtn) {
//       exportBtn.addEventListener('click', () => {
//         const from = document.getElementById('export-from');
//         const to = document.getElementById('export-to');
//         if (from) from.value = dateIsoFor(0);
//         if (to) to.value = dateIsoFor(6);
//         buildExportGroupsList(getSelectedExportGroupUuids());
//         toggleExportModal(true);
//       });
//     }
//
//     const exportClose = document.getElementById('export-close');
//     const exportCancel = document.getElementById('export-cancel');
//     const exportConfirm = document.getElementById('export-confirm');
//     if (exportClose) exportClose.addEventListener('click', () => toggleExportModal(false));
//     if (exportCancel) exportCancel.addEventListener('click', () => toggleExportModal(false));
//     if (exportConfirm) {
//       exportConfirm.addEventListener('click', async () => {
//         const from = document.getElementById('export-from');
//         const to = document.getElementById('export-to');
//         const fromIso = from && from.value ? from.value : dateIsoFor(0);
//         const toIso = to && to.value ? to.value : dateIsoFor(6);
//         if (!fromIso || !toIso) { showToastSimple('Укажите период экспорта', 'warning'); return; }
//         const groupUuids = getSelectedExportGroupUuids();
//         if (!groupUuids.length) { showToastSimple('Выберите хотя бы одну группу для экспорта', 'warning'); return; }
//         try {
//           const { blob, filename } = await exportScheduleExcel({ from: fromIso, to: toIso, groups: groupUuids });
//           const url = URL.createObjectURL(blob);
//           const a = document.createElement('a');
//           a.href = url; a.download = filename || 'schedule.xlsx';
//           document.body.appendChild(a); a.click(); a.remove();
//           URL.revokeObjectURL(url);
//           toggleExportModal(false);
//           showToastSimple('Экспорт выполнен', 'success');
//         } catch (e) {
//           console.error('Export failed', e);
//           showToastSimple('Не удалось экспортировать расписание', 'danger');
//         }
//       });
//     }
//
//     // Модалка копирования расписания недели кафедры
//     const copyWeekBtn = document.getElementById('copy-week-next');
//     if (copyWeekBtn) {
//       copyWeekBtn.addEventListener('click', () => {
//         buildCopyWeekList();
//         toggleCopyWeekModal(true);
//       });
//     }
//
//     const copyWeekClose = document.getElementById('copy-week-close');
//     const copyWeekCancel = document.getElementById('copy-week-cancel');
//     const copyWeekConfirm = document.getElementById('copy-week-confirm');
//
//     if (copyWeekClose) copyWeekClose.addEventListener('click', () => toggleCopyWeekModal(false));
//     if (copyWeekCancel) copyWeekCancel.addEventListener('click', () => toggleCopyWeekModal(false));
//     if (copyWeekConfirm) {
//       copyWeekConfirm.addEventListener('click', async () => {
//         const selected = document.querySelector('#copy-week-list input[type="radio"][name="copy-week-source"]:checked');
//         if (!selected) {
//           showToastSimple('Выберите неделю, из которой копировать расписание', 'warning');
//           return;
//         }
//         const fromIso = selected.value;
//
//         const deptEl = document.getElementById('department-selected');
//         const departmentUuid = deptEl ? (deptEl.getAttribute('data-selected-uuid') || '') : '';
//         if (!departmentUuid) {
//           showToastSimple('Сначала выберите кафедру', 'warning');
//           return;
//         }
//
//         const targetIso = dateIsoFor(0);
//
//         try {
//           const cloned = await cloneWeek(fromIso, targetIso, departmentUuid);
//           toggleCopyWeekModal(false);
//           const count = Array.isArray(cloned) ? cloned.length : 0;
//           if (count > 0) {
//             showToastSimple(`Скопировано пар: ${count}`, 'success');
//           } else {
//             showToastSimple('Новые пары не были созданы (все конфликтовали или отсутствовали исходные)', 'info');
//           }
//           try {
//             await loadPairsForWeek();
//             buildGrid();
//           } catch (_) {}
//         } catch (e) {
//           console.error('Clone week failed', e);
//           showToastSimple('Не удалось скопировать расписание', 'danger');
//         }
//       });
//     }
//
//     // Реакция на события локов: с небольшой задержкой перезагружаем пары текущей недели
//     try {
//       if (locks && typeof locks.onChange === 'function') {
//         locks.onChange(() => {
//           if (locksRefreshTimeout) {
//             clearTimeout(locksRefreshTimeout);
//           }
//           locksRefreshTimeout = setTimeout(async () => {
//             try {
//               await loadPairsForWeek();
//               renderPairsIntoGrid();
//             } catch (e) {
//               console.error('Failed to reload pairs on lock change', e);
//             }
//           }, 500);
//         });
//       }
//     } catch (e) {
//       console.error('Failed to setup locks onChange handler', e);
//     }
//
//     // ---------------- Изменение ширины колонок ----------------
//
//     makeTableColumnsResizable('schedule-grid-table');
//   }
//
//   function makeTableColumnsResizable(tableId) {
//     console.log('makeTableColumnsResizable START');
//
//     const table = document.getElementById(tableId);
//     if (!table) return;
//
//     const container = document.getElementById('schedule-grid');
//     const resizableThs = table.querySelectorAll('th[id^="resizeableTh-"]');
//
//     resizableThs.forEach((th) => {
//       const thId = th.id;
//       const columnId = thId.replace('Th', 'Td');
//       const columnSelector = `.${columnId}`;
//       let startX;
//       let startWidth;
//
//       th.addEventListener('mousedown', (e) => {
//         if (e.target !== th) return;
//
//         startX = e.pageX;
//         startWidth = th.offsetWidth;
//
//         function handleMouseMove(e) {
//           const deltaX = e.pageX - startX;
//           const newWidth = Math.max(50, startWidth + deltaX);
//
//           // Устанавливаем фиксированную ширину для заголовка
//           th.style.width = newWidth + 'px';
//           th.style.minWidth = newWidth + 'px';
//           th.style.maxWidth = newWidth + 'px';
//
//           // Применяем ту же ширину ко всем ячейкам колонки
//           const associatedTds = document.querySelectorAll(columnSelector);
//           associatedTds.forEach((td) => {
//             td.style.width = newWidth + 'px';
//             td.style.minWidth = newWidth + 'px';
//             td.style.maxWidth = newWidth + 'px';
//           });
//
//           // Устанавливаем table-layout: fixed для таблицы
//           table.style.tableLayout = 'fixed';
//
//           // Обеспечиваем горизонтальный скролл
//           if (container) {
//             container.style.overflowX = 'auto';
//           }
//         }
//
//         function handleMouseUp() {
//           document.removeEventListener('mousemove', handleMouseMove);
//           document.removeEventListener('mouseup', handleMouseUp);
//         }
//
//         document.addEventListener('mousemove', handleMouseMove);
//         document.addEventListener('mouseup', handleMouseUp);
//         e.preventDefault();
//       });
//
//       th.style.cursor = 'col-resize';
//     });
//   }
//
//   // ---------------- Schedule Management ----------------
//
//   /**
//    * Loads all schedules and populates the dropdown
//    */
//   async function loadSchedules() {
//     try {
//       schedules = await fetchAllSchedules();
//       renderScheduleSelector();
//
//       // If there are schedules, select the active one or the first one
//       if (schedules.length > 0) {
//         const activeSchedule = schedules.find(s => s.active) || schedules[0];
//         if (activeSchedule) {
//           $('#schedule-selector').val(activeSchedule.id);
//           currentScheduleId = activeSchedule.id;
//           // Highlight active schedule in the dropdown
//           $(`#schedule-option-${activeSchedule.id}`).addClass('bg-success bg-opacity-10');
//         }
//       }
//     } catch (error) {
//       console.error('Failed to load schedules:', error);
//       showToastSimple('Не удалось загрузить список расписаний', 'error');
//     }
//   }
//
//   /**
//    * Renders the schedule selector dropdown
//    */
//   function renderScheduleSelector() {
//     const $selector = $('#schedule-selector');
//     $selector.empty();
//
//     if (schedules.length === 0) {
//       $selector.append('<option value="" disabled selected>Нет доступных расписаний</option>');
//       return;
//     }
//
//     $selector.append('<option value="" disabled selected>Выберите расписание...</option>');
//
//     schedules.forEach(schedule => {
//       const activeBadge = schedule.active ? '<span class="badge bg-success ms-2">Активно</span>' : '';
//       const scheduleText = `${schedule.title} (${formatDate(schedule.startDate)} - ${formatDate(schedule.endDate)})`;
//
//       $selector.append(`
//         <option value="${schedule.id}" id="schedule-option-${schedule.id}"
//                 ${schedule.active ? 'class="bg-success bg-opacity-10"' : ''}>
//           ${scheduleText} ${activeBadge}
//         </option>
//       `);
//     });
//   }
//
//   /**
//    * Formats a date string to DD.MM.YYYY format
//    */
//   function formatDate(dateString) {
//     if (!dateString) return '';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('ru-RU', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   }
//
//   /**
//    * Handles schedule selection change
//    */
//   function onScheduleChange() {
//     const scheduleId = $('#schedule-selector').val();
//     if (!scheduleId) return;
//
//     currentScheduleId = scheduleId;
//     // Here you can add logic to load the selected schedule's data
//     // For now, we'll just show a toast
//     const schedule = schedules.find(s => s.id === scheduleId);
//     if (schedule) {
//       showToastSimple(`Загружено расписание: ${schedule.title}`, 'success');
//     }
//   }
//
//   /**
//    * Shows the new schedule modal
//    */
//   function showNewScheduleModal() {
//     const $modal = $('#scheduleModal');
//     const modal = new bootstrap.Modal($modal[0]);
//
//     // Reset form
//     $('#schedule-form')[0].reset();
//
//     // Set default dates (next Monday to next Sunday)
//     const today = new Date();
//     const nextMonday = new Date(today);
//     nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
//
//     const nextSunday = new Date(nextMonday);
//     nextSunday.setDate(nextMonday.getDate() + 6);
//
//     $('#schedule-start-date').val(formatDateForInput(nextMonday));
//     $('#schedule-end-date').val(formatDateForInput(nextSunday));
//
//     // Show modal
//     modal.show();
//   }
//
//   /**
//    * Formats a date to YYYY-MM-DD for date inputs
//    */
//   function formatDateForInput(date) {
//     return date.toISOString().split('T')[0];
//   }
//
//   /**
//    * Handles saving a new schedule
//    */
//   async function saveNewSchedule() {
//     const title = $('#schedule-title').val().trim();
//     const startDate = $('#schedule-start-date').val();
//     const endDate = $('#schedule-end-date').val();
//
//     if (!title || !startDate || !endDate) {
//       showToastSimple('Пожалуйста, заполните все поля', 'error');
//       return;
//     }
//
//     try {
//       const newSchedule = await createSchedule({
//         title,
//         startDate,
//         endDate,
//         active: false // New schedules are inactive by default
//       });
//
//       // Add the new schedule to the list and update the UI
//       schedules.push(newSchedule);
//       renderScheduleSelector();
//
//       // Select the new schedule
//       $('#schedule-selector').val(newSchedule.id);
//       currentScheduleId = newSchedule.id;
//
//       // Close the modal
//       const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleModal'));
//       modal.hide();
//
//       showToastSimple('Расписание успешно создано', 'success');
//     } catch (error) {
//       console.error('Failed to create schedule:', error);
//       showToastSimple(`Ошибка при создании расписания: ${error.message}`, 'error');
//     }
//   }
//
//   /**
//    * Wires up schedule-related event listeners
//    */
//   function wireScheduleEvents() {
//     // Schedule selector change
//     $('#schedule-selector').on('change', onScheduleChange);
//
//     // Add schedule button
//     $('#add-schedule-btn').on('click', showNewScheduleModal);
//
//     // Save schedule button in modal
//     $('#save-schedule-btn').on('click', saveNewSchedule);
//   }
//
//   // ---------------- Initialization ----------------
//
//   async function init() {
//     // ... existing init code ...
//
//     // Add this at the end of the existing init function
//     wireScheduleEvents();
//     await loadSchedules();
//
//     // Initialize tooltips
//     $('[data-bs-toggle="tooltip"]').tooltip();
//   }
//
//   document.addEventListener('DOMContentLoaded', init);
// })();
