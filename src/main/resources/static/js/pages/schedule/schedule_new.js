import {formatLectFio, showToast} from './utils.js'
import {initFixedScrollbar, makeTableColumnsResizable} from './blocks/table_sizer.js'
import {startOfWeekMonday, endOfWeekSunday, formatDateShort, dateIsoFor} from './date.js'
import {initExportSchedule} from './export-schedule.js'
import {initImportSchedule} from './import-schedule.js'
import locks from './locks.js'
//import {findDepartmentByLecturerUuid, openPairModalForCell, clearPairModal, loadExistingPairsToModal, initPairModalHandlers, savePairModal, closePairModal, findGroupByUuid, filterGroupsByConstraints, handleSubjectFocus, handleSubjectSearch, renderSubjectDropdown, handleRoomFocus, handleLecturerFocus, getFreeLecturersForTime, renderLecturerDropdown, getSelectedGroupUuids, findLecturerByUuid, findSubjectUuidByName, getDateForDayIndex, updateSelectedLecturersDisplay, handleLecturerSearch, handleRoomSearch, getBusyRoomsForTime, renderRoomDropdown, handleGroupSearch, renderGroupsList, loadFreeRoomsForTime, fetchFreeRooms, createPair, updatePair, deletePair, debounce} from './blocks/create_pair_modal.js'

// Упрощенная версия расписания для управления несколькими кафедрами
console.log('SCHEDULE_NEW.JS START');

// Глобальные переменные
let selectedDepartments = [];      // массив выбранных кафедр с преподавателями и предметами
let loadedDepartments = [];        // Все доступные кафедры для выбора (загружаются один раз)
                                // Используются для поиска и фильтрации

// Делаем selectedDepartments доступной глобально для других модулей
window.selectedDepartments = selectedDepartments;

let allRooms = [];                 // Все доступные аудитории (загружаются один раз)
                                // Будут использоваться позже для назначения пар

let allGroups = [];                // Все доступные группы (загружаются один раз)
                                // Будут использоваться позже для работы с группами

let allPairs = [];                 // Все пары для текущей недели по всем группам
                                // Обновляются при переключении недели

let departmentCounter = 0;         // счетчик для ID кафедр

// Глобальные переменные для блокировок
let locksRefreshTimeout = null;     // таймаут для обновления локов
let editingDotsTimer = null;
let editingDotsStep = 0;

// ---------------- API функции ----------------

// Базовый URL
const base = typeof window !== 'undefined' && window.mainUrl ? window.mainUrl : (typeof mainUrl !== 'undefined' ? mainUrl : '');

// Загрузка всех кафедр
async function fetchDepartments(query = '') {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/department',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { q: query || '' },
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Departments load error', xhr); reject(new Error('Failed to load departments')); },
    });
  });
}

// Загрузка преподавателей кафедры
async function fetchLecturers(departmentUuid = '') {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/lecturer',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { q: departmentUuid || '' },
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Lecturers load error', xhr); reject(new Error('Failed to load lecturers')); },
    });
  });
}

// Загрузка всех аудиторий
async function fetchRooms() {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/room',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { q: '' },
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Rooms load error', xhr); reject(new Error('Failed to load rooms')); },
    });
  });
}


/**
 * Загружает список всех групп
 * @param {string} query - поисковый запрос для фильтрации (опционально)
 * @returns {Promise<Array>} - массив объектов групп
 */
async function fetchGroups(query = '') {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/group',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { q: query || '' },
      success: (list) => resolve(list || []),
      error: (xhr) => { 
        console.error('Groups load error', xhr); 
        reject(new Error('Failed to load groups')); 
      },
    });
  });
}

/**
 * Загружает пары для группы на указанный период
 * @param {string} groupUuid - UUID группы
 * @param {string} fromIso - дата начала в формате YYYY-MM-DD
 * @param {string} toIso - дата окончания в формате YYYY-MM-DD
 * @returns {Promise<Array>} - массив пар
 */
async function fetchWeekPairs(groupUuid, fromIso, toIso) {
  if (!groupUuid || !fromIso) return Promise.resolve([]);
  
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair/week',
      type: 'GET',
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      traditional: true,
      data: { 
        group: groupUuid, 
        from: fromIso, 
        to: toIso 
      },
      success: (list) => resolve(list || []),
      error: (xhr) => { 
        console.error('Week pairs load error', xhr); 
        reject(new Error('Failed to load week pairs')); 
      },
    });
  });
}

async function fetchWeekPairsBatch(fromIso, toIso) {
  if (!fromIso) return Promise.resolve([]);
  
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair/week/batch',
      type: 'GET',
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      traditional: true,
      data: { from: fromIso, to: toIso },
      success: (list) => resolve(list || []),
      error: (xhr) => { 
        console.error('Week pairs batch load error', xhr); 
        reject(new Error('Failed to load week pairs batch')); 
      },
    });
  });
}

// ---------------- Вспомогательные функции ----------------

/**
 * Логирует текущее состояние системы
 */
function logSystemState() {
  console.log('=== Состояние системы ===');
  console.log('Выбранные кафедры:', selectedDepartments.length);

  selectedDepartments.forEach((dept, index) => {
    console.log(`  [${index}] ID: ${dept.id}, Название: "${dept.name}", Преподавателей: ${dept.lecturers.length}, Предметов: ${dept.subjects.length}`);
  });
  
  console.log('Загружено кафедр всего:', loadedDepartments.length);
  console.log('Загружено аудиторий:', allRooms.length);
  console.log('Загружено групп:', allGroups.length);
  console.log('Загружено пар на неделю:', allPairs.length);
  console.log('========================');
}

/**
 * Структура ячейки для сервиса блокировок: блокируем по преподавателю/дню/паре
 */
function buildLockCell(lectUuid, dayIdx, order) {
  console.log('buildLockCell START');
  if (!weekStart) {
    console.warn('weekStart is not defined');
    return null;
  }
  
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIdx);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateIso = `${yyyy}-${mm}-${dd}`;
  
  return {
    lecturerUuid: lectUuid || '',
    groupUuid: '',
    dateIso,
    pairOrder: order | 0
  };
}

// Форматирование ФИО преподавателя
// function formatLectFio(lecturer) {
//   if (!lecturer) return '';
//   const { lastName = '', firstName = '', middleName = '' } = lecturer;
//   return [lastName, firstName, middleName].filter(Boolean).join(' ').trim() || 'Преподаватель';
// }

// ---------------- Управление кафедрами ----------------

/**
 * Загружает данные для кафедры (преподаватели, предметы)
 */
async function loadDepartmentData(departmentUuid, departmentName) {
  console.log('loadDepartmentData START for:', departmentName);
  
  try {
    // Ищем кафедру в загруженных данных
    const deptInfo = loadedDepartments.find(d => d.uuid === departmentUuid);
    if (!deptInfo) {
      console.error('Department not found in loadedDepartments:', departmentUuid);
      return null;
    }
    
    // Загружаем преподавателей кафедры
    let deptLecturers = [];
    
    // Сначала пробуем взять преподавателей из данных кафедры
    const fromDep = Array.isArray(deptInfo.lecturers) ? deptInfo.lecturers : [];
    if (fromDep.length > 0) {
      deptLecturers = fromDep;
      console.log('Loaded lecturers from department data:', deptLecturers.length);
    } else {
      // Если в кафедре нет преподавателей, загружаем всех и фильтруем
      console.log('No lecturers in department data, loading all and filtering...');
      try {
        const allLecturers = await fetchLecturers('');
        console.log('Total lecturers loaded:', allLecturers.length);
        
        // Отладочное логирование первых нескольких преподавателей
        console.log('Sample lecturers structure:', allLecturers.slice(0, 3).map(l => ({
          name: formatLectFio(l),
          departmentUuid: l.department ? l.department.uuid : 'no department',
          departmentName: l.department ? l.department.name : 'no department'
        })));
        
        deptLecturers = (allLecturers || []).filter(l => {
          const match = l && l.department && l.department.uuid === departmentUuid;
          // if (!match && l && l.department) {
          //   console.log('Non-matching lecturer:', {
          //     name: formatLectFio(l),
          //     deptUuid: l.department.uuid,
          //     targetUuid: departmentUuid
          //   });
          // }
          return match;
        });
        console.log('Filtered lecturers from all:', deptLecturers.length);
      } catch (e) {
        console.error('Failed to load and filter lecturers', e);
        deptLecturers = [];
      }
    }
    
    // Получаем предметы кафедры
    const deptSubjects = Array.isArray(deptInfo.subjects) ? deptInfo.subjects : [];
    console.log('Loaded subjects:', deptSubjects.length);
    
    // Создаем объект кафедры
    const deptData = {
      id: `dept-${++departmentCounter}`,
      uuid: departmentUuid,
      name: departmentName,
      lecturers: deptLecturers,
      subjects: deptSubjects
    };
    
    console.log('Department data loaded:', {
      name: deptData.name,
      lecturersCount: deptData.lecturers.length,
      subjectsCount: deptData.subjects.length
    });
    
    return deptData;
    
  } catch (e) {
    console.error('Failed to load department data', e);
    return null;
  }
}

/**
 * Добавляет кафедру в список выбранных
 */
async function addDepartment(department) {
  console.log('addDepartment START:', department.name);
  
  // Проверяем, что кафедра еще не добавлена
  if (selectedDepartments.some(d => d.uuid === department.uuid)) {
    return;
  }
  
  // Загружаем данные кафедры
  const deptData = await loadDepartmentData(department.uuid, department.name);
  if (!deptData) return;
  
  // Добавляем в массив выбранных кафедр
  selectedDepartments.push(deptData);
  
  // Обновляем глобальную переменную
  window.selectedDepartments = selectedDepartments;
  renderAdditionalDepartment(deptData);
  
  console.log('Total selected departments:', selectedDepartments.length);
  
  // Логируем состояние после добавления
  logSystemState();
  
  // Подключаемся к каналам локов для преподавателей новой кафедры
  try {
    if (locks && deptData.lecturers.length > 0) {
      console.log('Initializing locks for', deptData.lecturers.length, 'lecturers');
      
      // Если сервис еще не инициализирован, инициализируем его с первым преподавателем
      if (!locks.initialized) {
        const firstLecturer = deptData.lecturers[0];
        if (firstLecturer && firstLecturer.uuid) {
          console.log('Initializing locks service with lecturer:', firstLecturer.uuid);
          await locks.init(firstLecturer.uuid);
          locks.initialized = true;
          
          // Подключаемся к каналам для остальных преподавателей
          for (let i = 1; i < deptData.lecturers.length; i++) {
            const lecturer = deptData.lecturers[i];
            if (lecturer && lecturer.uuid) {
              console.log('Ensuring lock for lecturer:', lecturer.uuid);
              await locks.ensure(lecturer.uuid);
              await locks.loadActive(lecturer.uuid);
            }
          }
        }
      } else {
        // Если сервис уже инициализирован, просто подключаемся к каналам
        for (const lecturer of deptData.lecturers) {
          if (lecturer && lecturer.uuid) {
            console.log('Ensuring lock for lecturer:', lecturer.uuid);
            await locks.ensure(lecturer.uuid);
            await locks.loadActive(lecturer.uuid);
          }
        }
      }
      
      // После загрузки активных блокировок обновляем UI
      renderPairsIntoGrid();
    }
  } catch (e) {
    console.error('Failed to initialize locks for department', e);
    showToast('Предупреждение: сервис блокировок может быть недоступен для новой кафедры', 'warning');
  }
  
  // Перестраиваем таблицу
  await rebuildTable();
}

/**
 * Рендерит дополнительную кафедру в интерфейсе
 */
function renderAdditionalDepartment(deptData) {
  console.log('renderAdditionalDepartment START:', deptData.name);
  const container = document.getElementById('additional-departments');
  if (!container) return;
  
  const deptEl = document.createElement('div');
  deptEl.className = 'd-flex align-items-center gap-2 p-2 border rounded bg-light';
  deptEl.id = deptData.id;
  
  deptEl.innerHTML = `
    <span class="fw-medium">${deptData.name}</span>
    <span class="text-muted small">(${deptData.lecturers.length} преподавателей)</span>
    <button class="btn btn-sm btn-outline-danger remove-dept-btn" data-dept-id="${deptData.id}">
      <i class="bi bi-x"></i>
    </button>
  `;
  
  container.appendChild(deptEl);
  
  // Обработчик удаления
  deptEl.querySelector('.remove-dept-btn').addEventListener('click', () => {
    removeDepartment(deptData.id);
  });
}

/**
 * Удаляет кафедру из списка
 */
async function removeDepartment(deptId) {
  console.log('removeDepartment START:', deptId);
  const index = selectedDepartments.findIndex(d => d.id === deptId);
  if (index === -1) return;
  
  const deptData = selectedDepartments[index];
  
  // Удаляем кафедру из списка
  selectedDepartments.splice(index, 1);
  
  // Обновляем глобальную переменную
  window.selectedDepartments = selectedDepartments;
  
  // Удаляем элемент из DOM
  const deptEl = document.getElementById(deptId);
  if (deptEl) deptEl.remove();
  
  // Если удалили первую кафедру, обновляем UI основной кафедры
  if (index === 0) {
    const selectedEl = document.getElementById('department-selected');
    if (selectedEl) {
      selectedEl.textContent = 'Не выбрана';
      selectedEl.removeAttribute('data-selected-uuid');
    }
    
    const searchEl = document.getElementById('department-search');
    if (searchEl) {
      searchEl.value = '';
    }
  }
  
  console.log('Total selected departments:', selectedDepartments.length);
  
  // Логируем состояние после удаления
  logSystemState();
  
  // Перестраиваем таблицу
  await rebuildTable();
}

// ---------------- Основная кафедра ----------------

/**
 * Обрабатывает выбор основной кафедры
 */
async function selectMainDepartment(department) {
  console.log('selectMainDepartment START:', department.name);
  
  // Проверяем, что кафедра еще не добавлена
  if (selectedDepartments.some(d => d.uuid === department.uuid)) {
    return;
  }
  
  // Загружаем данные кафедры
  const deptData = await loadDepartmentData(department.uuid, department.name);
  if (!deptData) return;
  
  // Добавляем как первую кафедру
  selectedDepartments.push(deptData);
  
  // Обновляем глобальную переменную
  window.selectedDepartments = selectedDepartments;
  
  renderAdditionalDepartment(deptData);
  
  // Подключаемся к каналам локов для преподавателей основной кафедры
  try {
    if (locks && deptData.lecturers.length > 0) {
      console.log('Initializing locks for main department', deptData.lecturers.length, 'lecturers');
      
      // Если сервис еще не инициализирован, инициализируем его с первым преподавателем
      if (!locks.initialized) {
        const firstLecturer = deptData.lecturers[0];
        if (firstLecturer && firstLecturer.uuid) {
          console.log('Initializing locks service with lecturer:', firstLecturer.uuid);
          await locks.init(firstLecturer.uuid);
          locks.initialized = true;
          
          // Подключаемся к каналам для остальных преподавателей
          for (let i = 1; i < deptData.lecturers.length; i++) {
            const lecturer = deptData.lecturers[i];
            if (lecturer && lecturer.uuid) {
              console.log('Ensuring lock for lecturer:', lecturer.uuid);
              await locks.ensure(lecturer.uuid);
              await locks.loadActive(lecturer.uuid);
            }
          }
        }
      } else {
        // Если сервис уже инициализирован, просто подключаемся к каналам
        for (const lecturer of deptData.lecturers) {
          if (lecturer && lecturer.uuid) {
            console.log('Ensuring lock for lecturer:', lecturer.uuid);
            await locks.ensure(lecturer.uuid);
            await locks.loadActive(lecturer.uuid);
          }
        }
      }
      
      // После загрузки активных блокировок обновляем UI
      renderPairsIntoGrid();
    }
  } catch (e) {
    console.error('Failed to initialize locks for main department', e);
    showToast('Предупреждение: сервис блокировок может быть недоступен', 'warning');
  }
  
  // Обновляем UI основной кафедры
  const selectedEl = document.getElementById('department-selected');
  if (selectedEl) {
    selectedEl.textContent = 'Выбрана: ' + deptData.name;
    selectedEl.setAttribute('data-selected-uuid', deptData.uuid);
  }
  
  const searchEl = document.getElementById('department-search');
  if (searchEl) {
    searchEl.value = deptData.name;
  }
  
  // Логируем состояние после выбора основной кафедры
  logSystemState();
  
  // Перестраиваем таблицу
  await rebuildTable();
}

/**
 * Загружает пары для всех групп на текущую неделю
 * Используется при первом открытии и при переключении недели
 */
async function loadPairsForWeek() {
  console.log('loadPairsForWeek START');
  console.log('Loading pairs for groups:', allGroups.length);
  
  allPairs = []; // Очищаем предыдущие данные
  currentTableData = {}; // Очищаем данные в ячейках
  
  if (!allGroups.length || !weekStart || !weekEnd) {
    console.log('No groups or week dates set, skipping pairs loading');
    return;
  }
  
  // Получаем даты недели в формате YYYY-MM-DD
  const fromIso = dateIsoFor(weekStart);
  const toIso = dateIsoFor(weekEnd);
  
  console.log('Loading pairs from', fromIso, 'to', toIso);
  
  // Собираем UUID всех валидных групп для пакетной загрузки
  const validGroups = allGroups.filter(group => group.uuid);
  
  // Создаем карту для быстрого доступа к именам групп
  const groupMap = new Map();
  validGroups.forEach(group => {
    groupMap.set(group.uuid, group.name || 'Unnamed Group');
  });
  
  if (validGroups.length === 0) {
    console.log('No valid groups found, skipping pairs loading');
    return;
  }
  
  try {
    // Единственный запрос для получения всех пар (без фильтрации по группам)
    const pairs = await fetchWeekPairsBatch(fromIso, toIso);
    console.log(`Loaded ${pairs.length} pairs for all groups in single request`);
    
    // Добавляем информацию о группе к каждой паре
    const pairsWithGroup = (pairs || []).map(pair => ({
      ...pair,
      groupName: groupMap.get(pair.groupUuid) || 'Unknown Group'
    }));
    
    allPairs.push(...pairsWithGroup);
    
  } catch (e) {
    console.error('Failed to load pairs in batch:', e);
    // В случае ошибки пакетной загрузки можно попробовать по старой схеме
    console.log('Falling back to individual group loading...');
    for (const group of validGroups) {
      try {
        const pairs = await fetchWeekPairs(group.uuid, fromIso, toIso);
        console.log(`Fallback: Loaded ${pairs.length} pairs for group "${group.name || 'unnamed'}"`);
        
        const pairsWithGroup = (pairs || []).map(pair => ({
          ...pair,
          groupUuid: group.uuid,
          groupName: group.name || 'Unnamed Group'
        }));
        
        allPairs.push(...pairsWithGroup);
        
      } catch (fallbackError) {
        console.error(`Fallback failed for group "${group.name || 'unnamed'}":`, fallbackError);
      }
    }
  }
  
  // Группируем пары по ячейкам преподавателей
  allPairs.forEach(pair => {
    if (!pair.dateString || !pair.pairOrder) {
      console.log('Skipping pair without date or pairOrder:', pair);
      return;
    }
    
    // Определяем день недели - исправляем расчет для правильного определения дня
    const pairDate = new Date(pair.dateString + 'T00:00:00');
    const dayOfWeek = pairDate.getDay(); 
    const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Воскресенье(0) -> 6, Понедельник(1) -> 0

    // Проверяем что день в диапазоне недели
    if (dayIdx < 0 || dayIdx > 6) {
      console.log('Invalid dayIdx, skipping pair:', dayIdx);
      return;
    }
    
    // Если у пары есть преподаватели, добавляем пары в ячейки каждого преподавателя
    if (pair.lecturers && Array.isArray(pair.lecturers)) {
      pair.lecturers.forEach(lecturer => {
        if (lecturer && lecturer.uuid) {
          const key = cellKey(lecturer.uuid, dayIdx, pair.pairOrder);
          if (!currentTableData[key]) {
            currentTableData[key] = [];
          }
          currentTableData[key].push(pair);
        }
      });
    } else if (pair.lecturer && pair.lecturer.uuid) {
      // Старый формат с одним преподавателем
      const key = cellKey(pair.lecturer.uuid, dayIdx, pair.pairOrder);
      if (!currentTableData[key]) {
        currentTableData[key] = [];
      }
      currentTableData[key].push(pair);
    } else {
    }
  });
  
  console.log('Total pairs loaded for week:', allPairs.length);
  console.log('Cells with pairs:', Object.keys(currentTableData).length);
  
  // Вызываем функцию отрисовки таблицы аудиторий
  if (typeof renderRoomsTable === 'function') {
    renderRoomsTable(allPairs, allRooms);
  }
  
  console.log('loadPairsForWeek COMPLETE');
}

/**
 * Показывает модалку для выбора дополнительной кафедры
 */
function showAdditionalDepartmentModal() {
  console.log('showAdditionalDepartmentModal START');
  
  // Создаем модальное окно
  const modalHtml = `
    <div id="additional-department-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1080;">
      <div class="modal-dialog" style="position: relative; margin: 10vh auto; max-width: 500px; width: 90%;">
        <div class="modal-content bg-white rounded shadow">
          <div class="modal-header p-3 border-bottom">
            <h5 class="modal-title mb-0">Добавить кафедру</h5>
            <button type="button" class="btn-close" id="close-additional-dept-modal"></button>
          </div>
          <div class="modal-body p-3">
            <div class="mb-3">
              <label for="additional-dept-search" class="form-label">Поиск кафедры</label>
              <div class="position-relative">
                <input id="additional-dept-search" type="text" class="form-control" 
                       placeholder="Начните вводить название кафедры...">
                <div id="additional-dept-dropdown" class="dropdown-menu w-100 shadow" 
                     style="max-height: 260px; overflow-y: auto;"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer p-3 border-top">
            <button type="button" class="btn btn-secondary" id="cancel-additional-dept-modal">Отмена</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Удаляем существующее модальное окно если есть
  const existingModal = document.getElementById('additional-department-modal');
  if (existingModal) existingModal.remove();
  
  // Добавляем новое модальное окно
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Показываем модальное окно
  const modal = document.getElementById('additional-department-modal');
  modal.style.display = 'block';
  
  // Обработчики закрытия
  document.getElementById('close-additional-dept-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('cancel-additional-dept-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  // Закрытие по клику вне модалки
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Настраиваем поиск кафедр
  wireAdditionalDepartmentSearch();
}

/**
 * Настраивает поиск кафедр в дополнительном модальном окне
 */
async function wireAdditionalDepartmentSearch() {
  console.log('wireAdditionalDepartmentSearch START');
  const searchInput = document.getElementById('additional-dept-search');
  const dropdown = document.getElementById('additional-dept-dropdown');
  
  if (!searchInput || !dropdown) return;
  
  // Обработчик ввода
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    
    // Фильтруем кафедры, исключая уже добавленные
    const addedUuids = selectedDepartments.map(d => d.uuid);
    const filtered = loadedDepartments.filter(dept => 
      !addedUuids.includes(dept.uuid) && 
      dept.name.toLowerCase().includes(query)
    );
    
    dropdown.innerHTML = '';
    
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dropdown-item text-muted';
      empty.textContent = query ? 'Кафедры не найдены' : 'Все кафедры уже добавлены';
      dropdown.appendChild(empty);
    } else {
      filtered.forEach(dept => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'dropdown-item';
        item.textContent = dept.name;
        item.addEventListener('click', () => {
          addDepartment(dept);
          const modal = document.getElementById('additional-department-modal');
          if (modal) modal.remove();
        });
        dropdown.appendChild(item);
      });
    }
    
    dropdown.classList.add('show');
  });
  
  // Скрываем дропдаун при потере фокуса
  searchInput.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.remove('show'), 150);
  });
  
  // Показываем дропдаун при фокусе
  searchInput.addEventListener('focus', () => {
    searchInput.dispatchEvent(new Event('input'));
  });
}

// ---------------- Поиск основной кафедры ----------------

/**
 * Рендерит дропдаун для выбора основной кафедры
 */
function renderDepartmentDropdown(items) {
  console.log('renderDepartmentDropdown START');
  
  const dropdown = document.getElementById('department-dropdown');
  if (!dropdown) return;
  
  dropdown.innerHTML = '';
  if (!items || !items.length) {
    const empty = document.createElement('div');
    empty.className = 'dropdown-item text-muted';
    empty.textContent = 'Ничего не найдено';
    dropdown.appendChild(empty);
    dropdown.classList.add('show');
    return;
  }
  
  items.forEach(d => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'dropdown-item text-wrap';
    item.textContent = d && d.name ? d.name : 'Кафедра';
    item.addEventListener('click', async () => {
      await selectMainDepartment(d);
      dropdown.classList.remove('show');
    });
    dropdown.appendChild(item);
  });
  
  dropdown.classList.add('show');
}

/**
 * Настраивает поиск основной кафедры
 */
function wireDepartmentSearch() {
  console.log('wireDepartmentSearch START');
  
  const searchInput = document.getElementById('department-search');
  const dropdown = document.getElementById('department-dropdown');
  if (!searchInput || !dropdown) return;
  
  async function load() {
    const q = (searchInput.value || '').trim();
    const departments = await fetchDepartments(q);
    renderDepartmentDropdown(departments);
  }
  
  searchInput.addEventListener('input', () => load());
  searchInput.addEventListener('focus', () => load());
  
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== searchInput) {
      dropdown.classList.remove('show');
    }
  });
}

// ---------------- Инициализация ----------------

/**
 * Инициализация приложения
 */
async function init() {
  console.log('init START');
  
  // Загружаем все кафедры
  try {
    loadedDepartments = await fetchDepartments('');
    console.log('Loaded departments:', loadedDepartments.length);
  } catch (e) {
    console.error('Failed to load departments', e);
    loadedDepartments = [];
  }
  
  // Загружаем все аудитории
  try {
    allRooms = await fetchRooms();
    console.log('Loaded rooms:', allRooms.length);
    console.log('Загружено аудиторий:', allRooms.length);
  } catch (e) {
    console.error('Failed to load rooms', e);
    allRooms = [];
  }
  
  // Загружаем все группы
  try {
    allGroups = await fetchGroups('');
    console.log('Loaded groups:', allGroups.length);
    console.log('Загружено групп:', allGroups.length);
    // Обновляем window.allGroups после загрузки
    window.allGroups = allGroups;
  } catch (e) {
    console.error('Failed to load groups', e);
    allGroups = [];
    window.allGroups = allGroups;
  }
  
  // Настраиваем обработчики
  wireDepartmentSearch();
  
  // Обработчик кнопки добавления кафедры
  const addDeptBtn = document.getElementById('add-department-btn');
  if (addDeptBtn) {
    addDeptBtn.addEventListener('click', showAdditionalDepartmentModal);
  }
  
  // Обработчики кнопок переключения недель
  const prevWeekBtn = document.getElementById('week-prev');
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', goToPreviousWeek);
  }
  
  const nextWeekBtn = document.getElementById('week-next');
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', goToNextWeek);
  }
  
  // Устанавливаем текущую неделю
  setWeekUI();
  
  // Загружаем пары для всех групп на текущую неделю
  await loadPairsForWeek();
  
  // Инициализируем фиксированный ползунок прокрутки
  initFixedScrollbar();
  
  // Инициализируем экспорт расписания
  initExportSchedule();
  
  // Инициализируем импорт расписания
  initImportSchedule();
  
  // Инициализация сервис блокировок
  try {
    console.log('Initializing locks service...');
    if (locks && typeof locks.init === 'function') {
      // Не инициализируем с null, ждем первой кафедры
      console.log('Locks service available, waiting for first department to initialize');
      locks.initialized = false;
    } else {
      console.warn('Locks service not available');
      locks = null;
    }
  } catch (e) {
    console.error('Failed to initialize locks service', e);
    locks = null;
  }
  
  console.log('init COMPLETE');
  console.log('Ready for work - departments:', loadedDepartments.length, 'rooms:', allRooms.length);
  
  // Логируем начальное состояние
  logSystemState();
  
  // Реакция на события локов: немедленно обновляем UI и с задержкой перезагружаем пары
  try {
    if (locks && typeof locks.onChange === 'function') {
      console.log('Setting up locks onChange handler');
      locks.onChange(() => {
        console.log('Lock change detected, updating UI immediately');
        
        // Немедленно обновляем UI для отображения/скрытия надписей "Редактируется..."
        renderPairsIntoGrid();
        
        // С задержкой перезагружаем пары текущей недели для обновления данных
        if (locksRefreshTimeout) {
          clearTimeout(locksRefreshTimeout);
        }
        locksRefreshTimeout = setTimeout(async () => {
          try {
            console.log('Refreshing pairs after lock change');
            await loadPairsForWeek();
            renderPairsIntoGrid();
            console.log('Pairs refreshed after lock change');
          } catch (e) {
            console.error('Failed to refresh pairs on lock change:', e);
          }
        }, 1000); // Увеличил задержку до 1сек для группировки нескольких изменений
      });
      console.log('Locks onChange handler set up successfully');
    } else {
      console.warn('Locks service or onChange method not available');
    }
  } catch (e) {
    console.error('Failed to setup locks onChange handler', e);
  }
}

// ==================== ДАЛЬШЕ ИДЕТ ОТРИСОВКА СТРАНИЦЫ ====================
// ==================== УПРАВЛЕНИЕ НЕДЕЛЯМИ ====================

// Глобальные переменные для управления неделями
let weekStart = null;   // начало текущей недели (Date)
let weekEnd = null;     // конец текущей недели (Date)

// Делаем weekStart доступной глобально для других модулей
window.weekStart = weekStart;

/**
 * Устанавливает текущую неделю и обновляет UI
 * Используется при инициализации и переключении недель
 */
function setWeekUI() {
  console.log('setWeekUI START');
  
  // Если неделя не установлена, устанавливаем текущую
  if (!weekStart) {
    weekStart = startOfWeekMonday(new Date());
  }
  weekEnd = endOfWeekSunday(weekStart);
  
  // Обновляем глобальную переменную
  window.weekStart = weekStart;
  
  // Обновляем текстовые элементы
  const weekLabel = document.getElementById('week-label');
  const weekDates = document.getElementById('week-dates');
  
  if (weekLabel) {
    // Определяем номер недели (можно добавить логику для определения номера недели в году)
    const weekNumber = Math.ceil((weekStart - new Date(weekStart.getFullYear(), 0, 1)) / 86400000 / 7);
    weekLabel.textContent = `Неделя ${weekNumber}`;
  }
  
  if (weekDates) {
    const startDate = formatDateShort(weekStart);
    const endDate = formatDateShort(weekEnd);
    weekDates.textContent = `${startDate} — ${endDate}`;
  }
  
  console.log('Week UI updated:', {
    start: dateIsoFor(weekStart),
    end: dateIsoFor(weekEnd),
    label: weekLabel?.textContent,
    dates: weekDates?.textContent
  });
}

/**
 * Переключается на предыдущую неделю
 */
function goToPreviousWeek() {
  console.log('goToPreviousWeek START');
  
  // Уменьшаем неделю на 7 дней
  if (weekStart) {
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() - 7);
  } else {
    weekStart = startOfWeekMonday(new Date());
    weekStart.setDate(weekStart.getDate() - 7);
  }
  
  // Обновляем глобальную переменную
  window.weekStart = weekStart;
  
  // Обновляем UI
  setWeekUI();
  
  // Очищаем старые пары и загружаем новые
  clearAllPairs();
  loadPairsForWeek().then(() => {
    renderPairsIntoGrid();
  });
  
  console.log('Switched to previous week:', {
    start: dateIsoFor(weekStart),
    end: dateIsoFor(weekEnd)
  });
}

/**
 * Переключается на следующую неделю
 */
function goToNextWeek() {
  console.log('goToNextWeek START');
  
  // Увеличиваем неделю на 7 дней
  if (weekStart) {
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  } else {
    weekStart = startOfWeekMonday(new Date());
    weekStart.setDate(weekStart.getDate() + 7);
  }
  
  // Обновляем глобальную переменную
  window.weekStart = weekStart;
  
  // Обновляем UI
  setWeekUI();
  
  // Очищаем старые пары и загружаем новые
  clearAllPairs();
  loadPairsForWeek().then(() => {
    renderPairsIntoGrid();
  });
  
  console.log('Switched to next week:', {
    start: dateIsoFor(weekStart),
    end: dateIsoFor(weekEnd)
  });
}

/**
 * Переключает на текущую неделю
 */
function goToCurrentWeek() {
  console.log('goToCurrentWeek START');
  
  // Устанавливаем текущую неделю
  weekStart = startOfWeekMonday(new Date());
  
  // Обновляем UI
  setWeekUI();
  
  // Очищаем старые пары и загружаем новые
  clearAllPairs();
  loadPairsForWeek().then(() => {
    renderPairsIntoGrid();
  });
  
  console.log('Switched to current week:', {
    start: dateIsoFor(weekStart),
    end: dateIsoFor(weekEnd)
  });
}

/**
 * Получает диапазон дат текущей недели
 * @returns {Object} - объект с датами начала и конца недели
 */
function getCurrentWeekRange() {
  return {
    start: weekStart ? dateIsoFor(weekStart) : null,
    end: weekEnd ? dateIsoFor(weekEnd) : null
  };
}

/**
 * Проверяет, является ли дата в текущей неделе
 * @param {Date|string} date - дата для проверки
 * @returns {boolean} - true если дата в текущей неделе
 */
function isDateInCurrentWeek(date) {
  if (!weekStart || !weekEnd) return false;
  
  const checkDate = new Date(date);
  return checkDate >= weekStart && checkDate <= weekEnd;
}

// ==================== ОТРИСОВКА ТАБЛИЦЫ РАСПИСАНИЯ ====================

// Глобальные переменные для таблицы
let currentTableData = {};  // данные пар в ячейках {cellKey: [pairs...]}

// Дни недели и время пар (как в оригинале)
const DAYS = [
  { idx: 0, title: 'Понедельник' },
  { idx: 1, title: 'Вторник' },
  { idx: 2, title: 'Среда' },
  { idx: 3, title: 'Четверг' },
  { idx: 4, title: 'Пятница' },
  { idx: 5, title: 'Суббота' },
  { idx: 6, title: 'Воскресенье' }
];

const TIMES = [
  { order: 1, label: '1 пара', time: '08:50–10:20' },
  { order: 2, label: '2 пара', time: '10:40–12:10' },
  { order: 3, label: '3 пара', time: '13:00–14:30' },
  { order: 4, label: '4 пара', time: '14:50–16:20' },
  { order: 5, label: '5 пара', time: '16:40–18:10' },
  { order: 6, label: '6 пара', time: '18:30–20:00' }
];

/**
 * Создает ключ для ячейки таблицы
 * @param {string} lecturerUuid - UUID преподавателя
 * @param {number} dayIdx - индекс дня недели (0-6)
 * @param {number} pairOrder - номер пары (1-6)
 * @returns {string} - уникальный ключ ячейки
 */
function cellKey(lecturerUuid, dayIdx, pairOrder) {
  return `${lecturerUuid}_${dayIdx}_${pairOrder}`;
}

/**
 * Очищает все ячейки таблицы от пар
 * Используется перед загрузкой новых данных
 */
function clearAllPairs() {
  console.log('clearAllPairs START');
  currentTableData = {};
  console.log('All pairs cleared');
}

/**
 * Отображает пары в ячейках таблицы
 * Используется после загрузки пар и построения сетки
 */
function renderPairsIntoGrid() {
  console.log('renderPairsIntoGrid START - checking locks');
  
  // Находим все ячейки таблицы
  $('#schedule-grid-table td.schedule-cell-simple').each(function () {
    const $cell = $(this);
    const lectUuid = $cell.data('lecturer-uuid');
    const dayIdx = Number($cell.data('day-idx')) || 0;
    const pairOrder = Number($cell.data('pair-order')) || 0;
    const key = cellKey(lectUuid, dayIdx, pairOrder);
    
    // Получаем пары для этой ячейки
    const pairs = currentTableData[key] || [];
    
    // Проверяем, заблокирована ли ячейка
    let isLocked = false;
    try {
      if (locks) {
        const lockCell = buildLockCell(lectUuid, dayIdx, pairOrder);
        if (lockCell) {
          isLocked = locks.isLocked(lockCell);
          if (isLocked) {
            console.log('Cell is locked:', {
              lectUuid,
              dayIdx,
              pairOrder,
              lockCell
            });
          }
        }
      }
    } catch (e) {
      console.error('Error checking lock status:', e);
      isLocked = false;
    }
    
    // Очищаем ячейку
    $cell.empty();
    
    if (!pairs.length && !isLocked) {
      // Если нет пар и нет блокировки, показываем прочерк
      $cell.text('—');
      $cell.removeClass('cell-locked');
      return;
    }

    if (isLocked) {
      const $edit = $('<div class="text-primary small mb-1">')
        .text('Редактируется...');
      $cell.append($edit);
      $cell.addClass('cell-locked');
    } else {
      $cell.removeClass('cell-locked');
    }
    
    if (!pairs.length) {
      return; // Если только блокировка, но нет пар
    }
    
    // Создаем контейнер с прокруткой
    const $wrap = $('<div class="cell-scroll h-100">').css({
      height: '36px', // Фиксированная высота с учетом padding ячейки (40px - 4px)
      //maxHeight: '36px',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    });
    
    // Собираем уникальные предметы, преподаватели, группы и аудитории
    const subjects = new Set();
    const lecturers = new Set();
    const groups = new Set();
    const rooms = new Set();
    const groupsData = new Map(); // Map для хранения groupName -> groupData
    
    pairs.forEach(pair => {
      // Название предмета
      if (pair.subject && pair.subject.name) {
        subjects.add(pair.subject.name);
      } else if (pair.name) {
        subjects.add(pair.name);
      }
      
      // ВСЕ преподаватели пары (включая текущего)
      if (pair.lecturers && Array.isArray(pair.lecturers)) {
        pair.lecturers.forEach(l => {
          if (l) {
            lecturers.add(formatLectFio(l));
          }
        });
       } else if (pair.lecturer) {
        lecturers.add(formatLectFio(pair.lecturer));
      }
      
      // Группы - сохраняем полную информацию
      if (pair.group) {
        const groupName = pair.group.groupName || 'Без названия';
        groups.add(groupName);
        groupsData.set(groupName, pair.group);
      } else if (pair.groupName) {
        groups.add(pair.groupName);
      }
      
      // Аудитории
      if (pair.room && pair.room.name) {
        rooms.add(pair.room.name);
      } else if (pair.roomName) {
        rooms.add(pair.roomName);
      }
    });
    
    // Формируем название с аудиторией
    const subjectNames = Array.from(subjects);
    const roomNames = Array.from(rooms);
    let title = subjectNames[0] || 'Предмет';
    
    if (roomNames.length > 0) {
      title += ` (${roomNames.join(', ')})`;
    }
    
    // Создаем элементы для отображения
    const $title = $('<div class="fw-semibold overflow-hidden small">').text(title);
    
    // Общее количество преподавателей для пары
    let lecturerInfo = '';
    if (lecturers.size > 0) {
      lecturerInfo = `Преподавателей: ${lecturers.size}`;
    }
    
    const $lecturers = $('<div class="small text-primary mb-1">').text(lecturerInfo);
    
    // Группы
    const $groupsContainer = $('<div class="groups-container small text-muted">');
    Array.from(groups).forEach(groupName => {

      const groupData = groupsData.get(groupName);
      console.log("Group tooltiper: " + groupData.groupName + " kind of sports: ")
      console.log(groupData.kindsOfSports)
      let tooltipText = '.'; // Всегда начинаем с точки
      
      if (groupData) {
        // Если есть kindsOfSports - показываем их через запятую
        if (groupData.kindsOfSports && Array.isArray(groupData.kindsOfSports) && groupData.kindsOfSports.filter(sport => sport.trim().length > 0).length > 0) {
          tooltipText = groupData.kindsOfSports.join(', ');
          if (groupName === 'СГ2з-08-25') {
            console.log('НАЙДЕНА ГРУППА СГ2з-08-25: "' + tooltipText + '"')
          }
        } else {
          // Иначе показываем specialization
          tooltipText = groupData.specialization || groupData.direction || '.';
        }
      }
      
      const $groupItem = $(`
        <div class="group-item pb-1 d-flex">
            <div data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title=" ${tooltipText}">${groupName}</div>
        </div>`);
      $groupsContainer.append($groupItem);
    });
    
    // Собираем ячейку
    $wrap.append($title);
    if (lecturerInfo) {
      $wrap.append($lecturers);
    }
    if (groups.size > 0) {
      $wrap.append($groupsContainer);
    }
    
    $cell.append($wrap);
    
    // Инициализируем tooltip'ы для новых элементов
    if (typeof reloadTooltip === 'function') {
      reloadTooltip();
    }
  });
  
  console.log('renderPairsIntoGrid COMPLETE');
}

/**
 * Формирует отображаемое название группы с названием и специализацией
 * @param {Object} group - объект группы
 * @returns {string} форматированное название группы
 */
function formatGroupLabel(group) {
  if (!group) return 'Нет группы';

  const groupName = group.name || group.groupName || 'Без названия';
  
  // Приоритет: kindsOfSports > specialization > direction
  let additionalInfo = '';
  if (group.kindsOfSports && Array.isArray(group.kindsOfSports) && group.kindsOfSports.filter(sport => sport.trim().length > 0).length > 0) {
    additionalInfo = group.kindsOfSports.join(', ');
  } else if (group.specialization) {
    additionalInfo = group.specialization;
  } else if (group.direction) {
    additionalInfo = group.direction;
  }

  if(group.groupName ==='Т1-12/1-24') console.log('\nGROUP Т1-12/1-24 dir:' + group.direction + ' spec:' + group.specialization)
  
  return `• ${groupName} • ${additionalInfo}`;
}

/**
 * Преобразует форму обучения в читаемый формат
 * @param {string} form - форма обучения (FULL_TIME, EXTRAMURAL и т.д.)
 * @returns {string} читаемое название формы
 */
function formatEducationForm(form) {
  switch (form) {
    case 'FULL_TIME':
      return 'очная';
    case 'EXTRAMURAL':
      return 'заочная';
    case 'PART_TIME':
      return 'заочная';
    case 'MIXED':
      return 'очно-заочная';
    case 'DISTANCE':
      return 'дистанционная';
    default:
      return form || 'Не указана';
  }
}

/**
 * Отрисовывает пустую таблицу расписания на основе выбранных кафедр
 * Структура: День | Пара | Преподаватели...
 */
function buildGrid() {
  console.log('buildGrid START');
  console.log('Total departments:', selectedDepartments.length);
  
  const $table = $('#schedule-grid-table');
  if (!$table.length) {
    console.error('Table #schedule-grid-table not found');
    return;
  }

  const $thead = $table.find('thead');
  const $tbody = $table.find('tbody');
  
  // Очищаем таблицу
  $thead.empty();
  $tbody.empty();

  if (selectedDepartments.length === 0) {
    // Если нет кафедр, показываем сообщение
    $table.after('<div class="text-muted text-center p-4">Выберите кафедры для отображения расписания</div>');
    return;
  }

  // Группируем преподавателей по кафедрам
  const lecturersByDepartment = [];

  selectedDepartments.forEach(dept => {
    console.log('Department:', dept.name, 'lecturers:', dept.lecturers.length);
    if (dept.lecturers.length > 0) {
      lecturersByDepartment.push({
        name: dept.name,
        lecturers: dept.lecturers,
        isMain: false // В новой версии все кафедры равны
      });
    }
  });
  
  console.log('Total departments in grid:', lecturersByDepartment.length);

  // Заголовок: День | Пара | Преподаватели...
  const $headRow = $('<tr>');
  $headRow.append('<th id="resizeableTh-day" style="width: 120px; max-width: 120px;">День</th>');
  $headRow.append('<th id="resizeableTh-pair" style="width: 135px; max-width: 135px;">Пара</th>');
  
  let lecturerIndex = 0;
  lecturersByDepartment.forEach(dept => {
    dept.lecturers.forEach((l, idx) => {
      const fio = formatLectFio(l) || 'Преподаватель';
      const $th = $('<th class="text-nowrap lecturer-table-header">').text(fio).attr('data-lecturer-uuid', l.uuid || '');
      $th.attr('id', `resizeableTh-lecturer-${lecturerIndex}`);
      $th.attr('data-department', dept.name);
      $headRow.append($th);
      lecturerIndex++;
    });
    
    // Добавляем разделитель между кафедрами (кроме последней)
    if (lecturersByDepartment.indexOf(dept) < lecturersByDepartment.length - 1) {
      const $separator = $('<th class="department-separator">').css({
        width: '8px',
        maxWidth: '8px',
        backgroundColor: '#000',
        border: 'none'
      });
      $separator.attr('id', `resizeableTh-separator-${lecturerIndex}`);
      $headRow.append($separator);
      lecturerIndex++;
    }
  });
  $thead.append($headRow);

  // Тело: по дням и парам
  DAYS.forEach(day => {
    TIMES.forEach((t, timeIdx) => {
      const $tr = $('<tr>');
      if (timeIdx === 0) {
        const $dayTd = $('<td class="align-middle fw-semibold text-primary resizeableTd-day overflow-hidden">').text(day.title);
        $dayTd.css({ width: '120px', maxWidth: '120px' });
        $dayTd.attr('rowspan', TIMES.length);
        $tr.append($dayTd);
      }
      const $timeTd = $('<td class="text-muted text-nowrap resizeableTd-pair overflow-hidden">')
        .html(`<div class="small fw-medium">${t.label}</div><div class="small">${t.time}</div>`);
      $timeTd.css({ 
        width: '135px', 
        maxWidth: '135px',
        paddingTop: '4px',
        paddingBottom: '4px'
      });
      $tr.append($timeTd);

      lecturerIndex = 0;
      lecturersByDepartment.forEach(dept => {
        dept.lecturers.forEach((l, idx) => {
          const cellKeyStr = cellKey(l.uuid, day.idx, t.order);
          const $cell = $('<td class="schedule-cell-simple resizeableTd-lecturer-' + lecturerIndex + '">')
            .attr('data-lecturer-uuid', l.uuid)
            .attr('data-day-idx', day.idx)
            .attr('data-pair-order', t.order)
            .attr('data-cell-key', cellKeyStr)
            .css({
              minWidth: '120px',
              cssText: 'max-height: 40px !important;',
              cursor: 'pointer',
              position: 'relative',
              paddingTop: '2px',
              paddingBottom: '2px',
              overflow: 'hidden'  // Важно: скрываем контент который не помещается
            });

          // Обработчик клика на ячейку - открываем модалку
          $cell.on('click', () => {
            console.log('Cell clicked:', {
              lecturer: formatLectFio(l),
              day: day.title,
              time: t.label,
              cellKey: cellKeyStr
            });
            
            // Открываем модалку для создания/редактирования пары
            openPairModalForCell($cell);
          });

          $tr.append($cell);
          lecturerIndex++;
        });
        
        // Добавляем ячейку-разделитель между кафедрами
        if (lecturersByDepartment.indexOf(dept) < lecturersByDepartment.length - 1) {
          const $separatorTd = $('<td class="department-separator resizeableTd-separator-' + lecturerIndex + '">').css({
            width: '8px',
            maxWidth: '8px',
            backgroundColor: '#f8f9fa',
            border: 'none'
          });
          $tr.append($separatorTd);
          lecturerIndex++;
        }
      });

      $tbody.append($tr);
    });
  });

  // Включаем изменение размера колонок
  makeTableColumnsResizable('schedule-grid-table');
  
  // Отображаем пары в ячейках
  renderPairsIntoGrid();
  
  console.log('Grid built successfully');
}

/**
 * Перестраивает таблицу (используется при добавлении/удалении кафедр)
 */
async function rebuildTable() {
  console.log('rebuildTable START');
  
  // Очищаем текущие данные пар
  clearAllPairs();
  
  // Перестраиваем таблицу
  buildGrid();
  
  // Перезагружаем пары для текущей недели
  await loadPairsForWeek();
  
  // Отображаем пары в ячейках
  renderPairsIntoGrid();
  
  console.log('Table rebuilt');
}

// ==================== МОДАЛКА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ПАРЫ ====================

// Глобальные переменные для модалки
window.currentModalCell = null;
window.selectedLecturers = [];
window.freeRooms = [];
window.currentLecturerDepartment = null; // Кафедра текущего преподавателя
window.selectedCourse = null; // Выбранный курс для ограничения групп
window.selectedEducationForm = null; // Выбранная форма обучения для ограничения групп

/**
 * Находит кафедру преподавателя по UUID
 * @param {string} lecturerUuid - UUID преподавателя
 * @returns {Object|null} - объект кафедры или null
 */
function findDepartmentByLecturerUuid(lecturerUuid) {
  for (const dept of selectedDepartments) {
    if (dept.lecturers && dept.lecturers.some(lect => lect.uuid === lecturerUuid)) {
      console.log(`found department by lecturer uuid: ${dept.name} / предметы: ${dept.subjects}`)
      return dept;
    }
  }
  return null;
}

/**
 * Открывает модалку для создания/редактирования пары
 * @param {jQuery} $cell - ячейка таблицы для которой открывается модалка
 * @param {boolean} lockCell - блокировать ли ячейку от изменений другими пользователями
 */
async function openPairModalForCell($cell, lockCell = false) {
  console.log('openPairModalForCell START');

  // Получаем данные ячейки
  const lectUuid = $cell.data('lecturer-uuid');
  const dayIdx = Number($cell.data('day-idx')) || 0;
  const pairOrder = Number($cell.data('pair-order')) || 0;

  if (!lectUuid) {
    return;
  }

  // Проверяем, доступен ли сервис блокировок
  if (!locks) {
    console.warn('Locks service not available, opening modal without lock');
    lockCell = false;
  }

  // Проверяем, инициализирован ли сервис блокировок
  if (locks && !locks.initialized) {
    console.log('Locks service not initialized, trying to initialize...');
    try {
      await locks.init(lectUuid);
      locks.initialized = true;
      console.log('Locks service initialized on demand');
    } catch (e) {
      console.error('Failed to initialize locks service on demand', e);
      showToast('Сервис блокировок временно недоступен. Открытие без блокировки.', 'warning');
      lockCell = false;
    }
  }

  const lockCellData = buildLockCell(lectUuid, dayIdx, pairOrder);
  
  // Проверяем, не заблокирована ли ячейка другим пользователем
  if (locks && lockCellData && locks.isLocked(lockCellData)) {
    showToast('Эта ячейка сейчас редактируется другим пользователем', 'warning');
    return;
  }

  // Пытаемся заблокировать ячейку
  let acquired = false;
  if (locks && lockCellData) {
    try {
      acquired = await locks.acquire(lockCellData, 30);
    } catch (e) {
      console.error('Failed to acquire lock', e);
      showToast('Сервис блокировок временно недоступен. Попробуйте обновить страницу.', 'warning');
    }
  }

  if (!acquired && locks && lockCellData) {
    showToast('Не удалось заблокировать ячейку. Возможно, она уже редактируется.', 'warning');
    return;
  }

  // Сохраняем данные блокировки в модалке
  if (acquired && lockCellData) {
    lockCell = true;
  }

  // Ищем существующие пары для этой ячейки
  const cellKeyStr = cellKey(lectUuid, dayIdx, pairOrder);
  const existingPairs = currentTableData[cellKeyStr] || [];

  // Находим модалку в DOM
  const $modal = $('#pair-modal');
  if (!$modal.length) {
    return;
  }

  // Сохраняем данные в модалку
  $modal.data('lectUuid', lectUuid);
  $modal.data('dayIdx', dayIdx);
  $modal.data('pairOrder', pairOrder);
  $modal.data('existing', existingPairs);
  $modal.data('lockCell', lockCell);
  $modal.data('lockCellData', lockCellData);

  // Очищаем форму
  clearPairModal();

  // Устанавливаем кафедру текущего преподавателя
  window.currentLecturerDepartment = findDepartmentByLecturerUuid(lectUuid);
  console.log('Current lecturer department:', window.currentLecturerDepartment?.name);

  // Инициализируем список групп (делаем это ПЕРЕД загрузкой существующих пар)
  renderGroupsList(allGroups);

  // Если есть существующие пары, загружаем их данные
  if (existingPairs.length > 0) {
    await loadExistingPairsToModal(existingPairs);
  } else {
    // Если ячейка пустая, добавляем преподавателя этой ячейки
    const lecturer = findLecturerByUuid(lectUuid);
    if (lecturer && !window.selectedLecturers.some(l => l.uuid === lectUuid)) {
      window.selectedLecturers.push(lecturer);
      updateSelectedLecturersDisplay();
    }
  }

  // Загружаем свободные аудитории для выбранного времени
  await loadFreeRoomsForTime(dayIdx, pairOrder);

  // Инициализируем обработчики формы
  initPairModalHandlers();

  // Показываем модалку
  $modal.modal('show');

  window.currentModalCell = $cell;
  console.log('Pair modal opened for cell:', cellKeyStr);
}

/**
 * Очищает форму модалки
 */
function clearPairModal() {
  console.log('clearPairModal START');

  // Очищаем поля
  $('#pair-name').val('').removeAttr('data-selected-subject-uuid');
  $('#pair-room-search').val('').removeAttr('data-selected-room-uuid');
  $('#pair-groups-search').val('');
  $('#lecturer-search').val('');

  // Очищаем выбранных преподавателей
  window.selectedLecturers = [];
  updateSelectedLecturersDisplay();

  // Очищаем выбранные группы
  $('#pair-groups-list').empty();
  
  // Очищаем массив выбранных групп
  window.selectedGroups = [];

  // Очищаем контейнер с выбранными группами
  $('#modal-groups-container').empty();

  // Очищаем выпадающие списки
  $('#lecturer-dropdown-list').empty();
  $('#pair-room-dropdown').empty();

  // Очищаем кафедру преподавателя
  window.currentLecturerDepartment = null;

  // Сбрасываем ограничения групп
  window.selectedCourse = null;
  window.selectedEducationForm = null;

  console.log('Pair modal cleared');
}

/**
 * Загружает данные существующих пар в модалку
 * @param {Array} pairs - массив существующих пар
 */
async function loadExistingPairsToModal(pairs) {
  console.log('loadExistingPairsToModal START, pairs:', pairs.length);

  if (!pairs.length) return;

  // Берем первую пару как основную
  const mainPair = pairs[0];

  // Загружаем название предмета
  const subjectName = mainPair.subject?.name || mainPair.name || '';
  $('#pair-name').val(subjectName);
  if (mainPair.subject?.uuid) {
    $('#pair-name').attr('data-selected-subject-uuid', mainPair.subject.uuid);
  }

  // Загружаем аудиторию
  if (mainPair.room) {
    const roomName = mainPair.room.name || mainPair.room.title || '';
    $('#pair-room-search').val(roomName);
    if (mainPair.room.uuid) {
      $('#pair-room-search').attr('data-selected-room-uuid', mainPair.room.uuid);
    }
  }

  // Собираем всех преподавателей из пар
  const lecturerUuids = new Set();
  pairs.forEach(pair => {
    if (pair.lecturers && Array.isArray(pair.lecturers)) {
      pair.lecturers.forEach(l => {
        if (l.uuid) lecturerUuids.add(l.uuid);
      });
    } else if (pair.lecturer && pair.lecturer.uuid) {
      lecturerUuids.add(pair.lecturer.uuid);
    }
  });

  // Находим и добавляем преподавателей
  lecturerUuids.forEach(uuid => {
    const lecturer = findLecturerByUuid(uuid);
    if (lecturer && !window.selectedLecturers.some(l => l.uuid === uuid)) {
      window.selectedLecturers.push(lecturer);
    }
  });

  // Обновляем отображение преподавателей
  updateSelectedLecturersDisplay();

  // Выбираем группы
  const groupUuids = new Set();
  pairs.forEach(pair => {
    // Проверяем разные возможные поля для UUID группы
    if (pair.groupUuid) {
      groupUuids.add(pair.groupUuid);
    } else if (pair.group && pair.group.uuid) {
      groupUuids.add(pair.group.uuid);
    } else if (pair.groups && Array.isArray(pair.groups)) {
      pair.groups.forEach(group => {
        if (group.uuid) groupUuids.add(group.uuid);
      });
    }
  });

  console.log('Found group UUIDs to select:', Array.from(groupUuids));

  // Отмечаем группы в списке
  let firstSelectedGroup = null;
  groupUuids.forEach(uuid => {
    const $groupItem = $(`#pair-groups-list [data-group-uuid="${uuid}"]`);
    if ($groupItem.length) {
      $groupItem.find('input[type="checkbox"]').prop('checked', true);
      console.log(`Selected group: ${uuid}`);

      // Добавляем группу в window.selectedGroups
      const group = findGroupByUuid(uuid);
      if (group && !window.selectedGroups.some(g => g.uuid === uuid)) {
        window.selectedGroups.push(group);
        
        // Добавляем чип в контейнер
        const groupName = group.groupName || group.name || 'Без названия';
        let tooltipText = group.kindsOfSports && Array.isArray(group.kindsOfSports) && group.kindsOfSports.filter(sport => sport.trim().length > 0).length > 0
          ? group.kindsOfSports.join(', ')
          : (group.specialization || group.direction || '.');
        $('#modal-groups-container').append(`
          <span id="group-chip-${group.uuid}" class="badge bg-primary text-white me-1 mb-1 roboto-font" 
                 data-bs-toggle="tooltip" 
                 data-bs-placement="top" 
                 data-bs-title="${tooltipText}"
                 style="cursor: pointer;">
            ${groupName}
          </span>
        `);
      }

      // Запоминаем первую выбранную группу для установки ограничений
      if (!firstSelectedGroup) {
        firstSelectedGroup = group;
      }
    } else {
      console.warn(`Group item not found for UUID: ${uuid}`);
    }
  });

  // Устанавливаем ограничения на основе первой выбранной группы
  if (firstSelectedGroup && groupUuids.size > 0) {
    window.selectedCourse = firstSelectedGroup.course;
    window.selectedEducationForm = firstSelectedGroup.educationForm;

    // Применяем фильтрацию групп
    filterGroupsByConstraints();
  }

  console.log('Loaded existing pairs to modal');
}

/**
 * Инициализирует обработчики событий модалки
 */
function initPairModalHandlers() {
  console.log('initPairModalHandlers START');

  // Обработчик сохранения
  $('#pair-save').off('click').on('click', savePairModal);

  // Обработчик закрытия
  $('#pair-close').off('click').on('click', closePairModal);

  // Обработчики закрытия модалки через другие способы (крестик, клик вне модалки)
  $('#pair-modal').off('hide.bs.modal').on('hide.bs.modal', function() {
    // Разблокируем ячейку при любом закрытии модалки
    try {
      const $modal = $(this);
      const lockCellData = $modal.data('lockCellData');
      
      if (lockCellData && locks) {
        console.log('Releasing lock on modal hide:', lockCellData);
        locks.release(lockCellData);
        $modal.removeData('lockCellData');
      }
    } catch (e) {
      console.error('Failed to release lock on modal hide:', e);
    }
  });

  $('#pair-modal').off('hidden.bs.modal').on('hidden.bs.modal', function() {
    // Отправляем broadcast после полного закрытия модалки
    try {
      const $modal = $(this);
      const lectUuid = $modal.data('lectUuid');
      if (lectUuid && locks) {
        locks.broadcastReload(lectUuid);
      }
    } catch (e) {
      console.error('Failed to broadcast reload on modal hidden:', e);
    }
  });

  // Поиск предметов
  $('#pair-name').off('input').on('input', debounce(handleSubjectSearch, 300));

  // Клик на поле предмета - показываем все предметы
  $('#pair-name').off('focus').on('focus', handleSubjectFocus);

  // Потеря фокуса - скрываем dropdown предмета
  $('#pair-name').off('blur').on('blur', function() {
    setTimeout(() => {
      $('#pair-subject-dropdown').empty().hide();
    }, 200); // Небольшая задержка чтобы успеть кликнуть на элемент
  });

  // Выбор предмета из dropdown
  $(document).off('click', '#pair-subject-dropdown .dropdown-item').on('click', '#pair-subject-dropdown .dropdown-item', function() {
    const uuid = $(this).data('subject-uuid');
    const name = $(this).text().trim();
    $('#pair-name').val(name).attr('data-selected-subject-uuid', uuid);
    $('#pair-subject-dropdown').empty().hide();
  });

  // Поиск преподавателей
  $('#lecturer-search').off('input').on('input', debounce(handleLecturerSearch, 300));

  // Клик на поле преподавателей - показываем свободных преподавателей
  $('#lecturer-search').off('focus').on('focus', handleLecturerFocus);

  // Потеря фокуса - скрываем dropdown преподавателей
  $('#lecturer-search').off('blur').on('blur', function() {
    setTimeout(() => {
      $('#lecturer-dropdown-list').empty().hide();
    }, 200); // Небольшая задержка чтобы успеть кликнуть на элемент
  });

  // Поиск аудиторий
  $('#pair-room-search').off('input').on('input', debounce(handleRoomSearch, 300));

  // Клик на поле аудиторий - показываем свободные аудитории
  $('#pair-room-search').off('focus').on('focus', handleRoomFocus);

  // Потеря фокуса - скрываем dropdown аудиторий
  $('#pair-room-search').off('blur').on('blur', function() {
    setTimeout(() => {
      $('#pair-room-dropdown').empty().hide();
    }, 200); // Небольшая задержка чтобы успеть кликнуть на элемент
  });

  // Поиск групп
  $('#pair-groups-search').off('input').on('input', debounce(handleGroupSearch, 300));

  // Обработчики кликов на группы с ограничениями
  /*$(document).off('change', '#pair-groups-list input[type="checkbox"]').on('change', '#pair-groups-list input[type="checkbox"]', function() {
    const $checkbox = $(this);
    const $groupItem = $checkbox.closest('[data-group-uuid]');
    const groupUuid = $groupItem.data('group-uuid');
    const isChecked = $checkbox.is(':checked');

    if (isChecked) {
      // При выборе группы - устанавливаем ограничения
      const group = findGroupByUuid(groupUuid);
      if (group) {
        if (!window.selectedCourse) {
          window.selectedCourse = group.course;
          window.selectedEducationForm = group.educationForm;
          // Фильтруем группы по новым ограничениям
          filterGroupsByConstraints();
        }
      }
    } else {
      // При снятии галочки - проверяем нужно ли сбросить ограничения
      const $checkedBoxes = $('#pair-groups-list input[type="checkbox"]:checked');
      if ($checkedBoxes.length === 0) {
        window.selectedCourse = null;
        window.selectedEducationForm = null;
        console.log('Reset course and education form constraints');
        // Показываем все группы
        filterGroupsByConstraints();
      }
    }
  });*/

  // Выбор аудитории из dropdown
  $(document).off('click', '#pair-room-dropdown .dropdown-item').on('click', '#pair-room-dropdown .dropdown-item', function() {
    const uuid = $(this).data('room-uuid');
    const name = $(this).text().trim();
    $('#pair-room-search').val(name).attr('data-selected-room-uuid', uuid);
    $('#pair-room-dropdown').empty().hide();
  });

  console.log('Pair modal handlers initialized');
}

/**
 * Сохраняет пару из модалки
 */
async function savePairModal() {
  console.log('savePairModal START');

  // Валидация названия предмета
  const subjectName = ($('#pair-name').val() || '').trim();
  if (!subjectName) {
    showToast('Введите название предмета', 'warning', 'Ошибка');
    $('#pair-name').focus();
    return;
  }

  // Валидация преподавателей
  const selectedLecturers = window.selectedLecturers || [];
  if (selectedLecturers.length === 0) {
    showToast('Выберите хотя бы одного преподавателя', 'warning', 'Ошибка');
    $('#lecturer-search').focus();
    return;
  }

  // Валидация групп
  const selectedGroupUuids = getSelectedGroupUuids();
  if (selectedGroupUuids.length === 0) {
    showToast('Выберите хотя бы одну группу', 'warning', 'Ошибка');
    $('#pair-groups-search').focus();
    return;
  }

  try {
    // Получаем данные из модального окна
    const $modal = $('#pair-modal');
    const dayIdx = Number($modal.data('dayIdx')) || 0;
    const pairOrder = Number($modal.data('pairOrder')) || 0;
    const pairDate = getDateForDayIndex(dayIdx);
    const existingPairs = $modal.data('existing') || [];
    
    const selectedCourse = window.selectedCourse;
    const selectedEducationForm = window.selectedEducationForm;
    
    // Получаем UUID предмета из поля ввода
    let subjectUuid = $('#pair-name').attr('data-selected-subject-uuid') || '';
    if (!subjectUuid) {
      // Ищем предмет по названию
      subjectUuid = findSubjectUuidByName(subjectName);
    }
    
    if (!subjectUuid) {
      showToast('Предмет не найден. Выберите предмет из списка или введите корректное название', 'warning', 'Ошибка');
      $('#pair-name').focus();
      return;
    }

    // Получаем UUID аудитории
    let roomUuid = null;
    const roomName = ($('#pair-room-search').val() || '').trim();
    if (roomName) {
      roomUuid = $('#pair-room-search').attr('data-selected-room-uuid') || '';
    }

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let failed = 0;

    // Создаем/обновляем пары для выбранных групп
    for (const groupUuid of selectedGroupUuids) {
      const existingPair = existingPairs.find(p => p.groupUuid === groupUuid);
      const group = findGroupByUuid(groupUuid);

      if (existingPair) {
        // Обновляем существующую пару
        const payload = {
          subject: { uuid: subjectUuid },
          lecturers: selectedLecturers.map(l => ({ uuid: l.uuid })),
          room: roomUuid ? { uuid: roomUuid } : null,
          pairOrder: pairOrder,
          dateString: pairDate
        };

        try {
          await updatePair(existingPair.uuid, payload);
          updated++;
        } catch (error) {
          console.error(`Failed to update pair for group ${groupUuid}:`, error);
          failed++;
        }
      } else {
        // Создаем новую пару
        const payload = {
          subject: { uuid: subjectUuid },
          lecturers: selectedLecturers.map(l => ({ uuid: l.uuid })),
          room: roomUuid ? { uuid: roomUuid } : null,
          pairOrder: pairOrder,
          dateString: pairDate,
          group: { uuid: groupUuid }
        };

        try {
          await createPair(payload);
          created++;
        } catch (error) {
          console.error(`Failed to create pair for group ${groupUuid}:`, error);
          failed++;
        }
      }
    }

    // Удаляем пары для групп которые больше не выбраны
    const existingGroupUuids = new Set(existingPairs.map(p => p.groupUuid));
    const toDelete = [...existingGroupUuids].filter(uuid => !selectedGroupUuids.includes(uuid));

    for (const groupUuid of toDelete) {
      const pairToDelete = existingPairs.find(p => p.groupUuid === groupUuid);
      if (pairToDelete) {
        try {
          await deletePair(pairToDelete.uuid);
          deleted++;
        } catch (error) {
          console.error(`Failed to delete pair for group ${groupUuid}:`, error);
          failed++;
        }
      }
    }

    // Показываем результат
    let message = '';
    if (created > 0) message += `Создано: ${created}. `;
    if (updated > 0) message += `Обновлено: ${updated}. `;
    if (deleted > 0) message += `Удалено: ${deleted}. `;
    if (failed > 0) message += `Не удалось: ${failed}. `;

    const variant = failed > 0 ? (created + updated + deleted > 0 ? 'warning' : 'danger') : 'success';
    const title = failed > 0 ? 'Предупреждение' : 'Успех';
    
    showToast(message || 'Пара сохранена', variant, title);

    // Закрываем модалку
    closePairModal();

    // Перезагружаем пары и обновляем таблицу
    await loadPairsForWeek();
    renderPairsIntoGrid();

  } catch (error) {
    console.error('Error saving pair:', error);
    showToast(error.message || 'Ошибка при сохранении пары', 'danger', 'Ошибка');
  }
}

/**
 * Закрывает модалку
 */
function closePairModal() {
  console.log('closePairModal START');

  const $modal = $('#pair-modal');
  
  // Разблокируем ячейку при закрытии модалки
  try {
    const lockCellData = $modal.data('lockCellData');
    
    if (lockCellData && locks) {
      console.log('Releasing lock for cell:', lockCellData);
      locks.release(lockCellData);
      $modal.removeData('lockCellData');
    }
  } catch (e) {
    console.error('Failed to release lock:', e);
  }

  // Отправляем broadcast для обновления других клиентов
  try {
    const lectUuid = $modal.data('lectUuid');
    if (lectUuid && locks) {
      locks.broadcastReload(lectUuid);
    }
  } catch (e) {
    console.error('Failed to broadcast reload:', e);
  }

  $modal.modal('hide');

  // Очищаем данные
  clearPairModal();
  window.currentModalCell = null;

  console.log('Pair modal closed');
}

/**
 * Находит группу по UUID
 * @param {string} uuid - UUID группы
 * @returns {Object|null} - объект группы или null
 */
function findGroupByUuid(uuid) {
  return allGroups.find(group => group.uuid === uuid) || null;
}

/**
 * Фильтрует группы в списке по установленным ограничениям
 */
function filterGroupsByConstraints() {
  const $list = $('#pair-groups-list');

  if (!window.selectedCourse && !window.selectedEducationForm) {
    // Нет ограничений - показываем все группы
    $list.find('[data-group-uuid]').show();
    $list.find('[data-group-uuid] input[type="checkbox"]').prop('disabled', false);
    return;
  }

  // Применяем ограничения
  $list.find('[data-group-uuid]').each(function() {
    const $groupItem = $(this);
    const groupUuid = $groupItem.data('group-uuid');
    const group = findGroupByUuid(groupUuid);

    if (!group) {
      $groupItem.hide();
      return;
    }

    let matchesCourse = !window.selectedCourse || group.course === window.selectedCourse;
    let matchesEducationForm = !window.selectedEducationForm || group.educationForm === window.selectedEducationForm;

    if (matchesCourse && matchesEducationForm) {
      // Группа соответствует ограничениям
      $groupItem.show();
      $groupItem.find('input[type="checkbox"]').prop('disabled', false);
    } else {
      // Группа не соответствует ограничениям
      const $checkbox = $groupItem.find('input[type="checkbox"]');
      if ($checkbox.is(':checked')) {
        // Если группа была выбрана, снимаем галочку
        $checkbox.prop('checked', false);
      }
      $groupItem.hide();
      $checkbox.prop('disabled', true);
    }
  });

}

/**
 * Обрабатывает фокус на поле предмета - показывает предметы кафедры преподавателя
 */
function handleSubjectFocus() {
  const $dropdown = $('#pair-subject-dropdown');
  if ($dropdown.is(':visible')) return;

  // Получаем кафедру текущего преподавателя
  if (!window.currentLecturerDepartment) {
    $dropdown.append('<div class="dropdown-item text-muted">Кафедра преподавателя не определена</div>');
    $dropdown.show();
    return;
  }

  // Отображаем предметы только этой кафедры
  renderSubjectDropdown(window.currentLecturerDepartment.subjects || []);
  $dropdown.show();
}

/**
 * Обрабатывает поиск предметов
 * @param {Event} e - событие input
 */
function handleSubjectSearch(e) {
  const query = (e.target.value || '').trim().toLowerCase();
  const $dropdown = $('#pair-subject-dropdown');

  // Получаем кафедру текущего преподавателя
  if (!window.currentLecturerDepartment) {
    $dropdown.append('<div class="dropdown-item text-muted">Кафедра преподавателя не определена</div>');
    $dropdown.show();
    return;
  }

  // Фильтруем предметы кафедры
  const allSubjects = window.currentLecturerDepartment.subjects || [];
  console.log(allSubjects)
  const filtered = allSubjects.filter(subject => {
    const name = (subject.name || '').toLowerCase();
    return name.includes(query);
  });

  // Отображаем результаты
  renderSubjectDropdown(filtered);
  $dropdown.show();
}

/**
 * Отображает dropdown предметов
 * @param {Array} subjects - массив предметов
 */
function renderSubjectDropdown(subjects) {
  const $dropdown = $('#pair-subject-dropdown');
  $dropdown.empty();

  if (!subjects.length) {
    $dropdown.append('<div class="dropdown-item text-muted">Предметы не найдены</div>');
  } else {
    subjects.forEach(subject => {
      const $item = $(`
        <div class="dropdown-item" data-subject-uuid="${subject.uuid}">
          ${subject.name}
        </div>
      `);
      $dropdown.append($item);
    });
  }
}

/**
 * Обрабатывает фокус на поле аудиторий - показывает свободные аудитории
 */
function handleRoomFocus() {
  console.log('handleRoomFocus START');
  const $dropdown = $('#pair-room-dropdown');
  if ($dropdown.is(':visible')) return;

  console.log('Free rooms available:', window.freeRooms.length);

  // Получаем занятые аудитории
  const busyRooms = getBusyRoomsForTime();
  console.log('Busy rooms found:', busyRooms.length);

  // Отображаем свободные и занятые аудитории
  renderRoomDropdown(window.freeRooms, busyRooms);
  $dropdown.show();

  console.log('Room dropdown shown');
}

/**
 * Обрабатывает фокус на поле преподавателей - показывает свободных преподавателей
 */
function handleLecturerFocus() {
  const $dropdown = $('#lecturer-dropdown-list');
  if ($dropdown.is(':visible')) return;

  // Получаем свободных преподавателей
  const freeLecturers = getFreeLecturersForTime();

  // Отображаем свободных преподавателей
  renderLecturerDropdown(freeLecturers);
  $dropdown.show();
}

/**
 * Получает свободных преподавателей для текущего времени из кафедры текущего преподавателя
 * @returns {Array} массив свободных преподавателей
 */
function getFreeLecturersForTime() {
  const $modal = $('#pair-modal');
  const dayIdx = Number($modal.data('dayIdx')) || 0;
  const pairOrder = Number($modal.data('pairOrder')) || 0;

  // Получаем преподавателей только из кафедры текущего преподавателя
  const allLecturers = window.currentLecturerDepartment ? (window.currentLecturerDepartment.lecturers || []) : [];

  // Получаем занятых преподавателей в это время
  const busyLecturerUuids = new Set();

  // Проверяем все пары в это время
  Object.keys(currentTableData).forEach(cellKey => {
    const [lectUuid, cellDayIdx, cellPairOrder] = cellKey.split('_');
    if (Number(cellDayIdx) === dayIdx && Number(cellPairOrder) === pairOrder) {
      busyLecturerUuids.add(lectUuid);
    }
  });

  // Фильтруем свободных преподавателей
  const freeLecturers = allLecturers.filter(lecturer =>
    !busyLecturerUuids.has(lecturer.uuid) &&
    !window.selectedLecturers.some(selected => selected.uuid === lecturer.uuid)
  );

  return freeLecturers;
}

/**
 * Отображает dropdown преподавателей
 * @param {Array} lecturers - массив преподавателей
 */
function renderLecturerDropdown(lecturers) {
  const $dropdown = $('#lecturer-dropdown-list');
  $dropdown.empty();

  if (!lecturers.length) {
    $dropdown.append('<div class="dropdown-item text-muted">Свободные преподаватели не найдены</div>');
  } else {
    lecturers.forEach(lecturer => {
      const $item = $(`
        <div class="dropdown-item lecturer-dropdown-item" data-lecturer-uuid="${lecturer.uuid}">
          ${formatLectFio(lecturer)}
        </div>
      `);

      $item.on('click', function() {
        window.selectedLecturers.push(lecturer);
        updateSelectedLecturersDisplay();
        $('#lecturer-search').val('');
        $dropdown.empty().hide();
      });

      $dropdown.append($item);
    });
  }
}

/**
 * Получает UUID выбранных групп из window.selectedGroups
 * @returns {Array} массив UUID групп
 */
function getSelectedGroupUuids() {
  // Проверяем что массив существует и не пустой
  if (!window.selectedGroups || window.selectedGroups.length === 0) {
    return [];
  }
  
  // Извлекаем UUID из массива выбранных групп
  return window.selectedGroups
    .filter(group => group && group.uuid) // Фильтруем пустые объекты и объекты без UUID
    .map(group => group.uuid);
}

/**
 * Находит преподавателя по UUID
 * @param {string} uuid - UUID преподавателя
 * @returns {Object|null} объект преподавателя или null
 */
function findLecturerByUuid(uuid) {
  for (const dept of selectedDepartments) {
    const lecturer = dept.lecturers.find(l => l.uuid === uuid);
    if (lecturer) return lecturer;
  }
  return null;
}

/**
 * Находит UUID предмета по названию
 * @param {string} name - название предмета
 * @returns {string|null} UUID предмета или null
 */
function findSubjectUuidByName(name) {
  for (const dept of selectedDepartments) {
    const subject = dept.subjects.find(s => s.name === name);
    if (subject) return subject.uuid;
  }
  return null;
}

/**
 * Получает дату для индекса дня недели
 * @param {number} dayIdx - индекс дня (0-6)
 * @returns {string} дата в формате YYYY-MM-DD
 */
function getDateForDayIndex(dayIdx) {
  if (!weekStart) return null;

  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayIdx);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Обновляет отображение выбранных преподавателей
 */
function updateSelectedLecturersDisplay() {
  const $container = $('#selected-lecturers');

  if (!window.selectedLecturers.length) {
    $container.html('<div class="text-muted small">Выбранные преподаватели появятся здесь</div>');
    return;
  }

  $container.empty();
  window.selectedLecturers.forEach((lecturer, index) => {
    const $badge = $(`
      <span class="badge bg-primary me-2 mb-2 d-inline-flex align-items-center roboto-font">
        ${formatLectFio(lecturer)}
        <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.6em;" data-index="${index}"></button>
      </span>
    `);

    // Обработчик удаления преподавателя
    $badge.find('.btn-close').on('click', function() {
      const idx = $(this).data('index');
      window.selectedLecturers.splice(idx, 1);
      updateSelectedLecturersDisplay();
    });

    $container.append($badge);
  });
}

/**
 * Обрабатывает поиск преподавателей (обновленная версия)
 * @param {Event} e - событие input
 */
function handleLecturerSearch(e) {
  const query = (e.target.value || '').trim().toLowerCase();
  const $dropdown = $('#lecturer-dropdown-list');

  if (!query) {
    // Показываем всех свободных преподавателей
    const freeLecturers = getFreeLecturersForTime();
    renderLecturerDropdown(freeLecturers);
    $dropdown.show();
    return;
  }

  // Получаем свободных преподавателей и фильтруем их
  const freeLecturers = getFreeLecturersForTime();
  const filtered = freeLecturers.filter(lecturer => {
    const fio = formatLectFio(lecturer).toLowerCase();
    return fio.includes(query);
  });

  // Отображаем результаты
  renderLecturerDropdown(filtered);
  $dropdown.show();
}

/**
 * Обрабатывает поиск аудиторий с разделением на свободные и занятые
 * @param {Event} e - событие input
 */
function handleRoomSearch(e) {
  const query = (e.target.value || '').trim().toLowerCase();
  const $dropdown = $('#pair-room-dropdown');

  if (!query) {
    // Показываем все свободные аудитории
    renderRoomDropdown(window.freeRooms, []);
    $dropdown.show();
    return;
  }

  // Фильтруем свободные аудитории
  const filteredFree = window.freeRooms.filter(room => {
    const name = (room.name || room.title || '').toLowerCase();
    return name.includes(query);
  });

  // Ищем занятые аудитории
  const busyRooms = getBusyRoomsForTime();
  const filteredBusy = busyRooms.filter(room => {
    const name = (room.name || room.title || '').toLowerCase();
    return name.includes(query);
  });

  // Отображаем результаты с разделением
  renderRoomDropdown(filteredFree, filteredBusy);
  $dropdown.show();
}

/**
 * Получает занятые аудитории для текущего времени
 * @returns {Array} массив занятых аудиторий
 */
function getBusyRoomsForTime() {
  const $modal = $('#pair-modal');
  const dayIdx = Number($modal.data('dayIdx')) || 0;
  const pairOrder = Number($modal.data('pairOrder')) || 0;

  const busyRooms = new Set();

  // Проверяем все пары в это время
  Object.keys(currentTableData).forEach(cellKey => {
    const [lectUuid, cellDayIdx, cellPairOrder] = cellKey.split('_');
    if (Number(cellDayIdx) === dayIdx && Number(cellPairOrder) === pairOrder) {
      const pairs = currentTableData[cellKey] || [];
      pairs.forEach(pair => {
        if (pair.room && pair.room.uuid) {
          busyRooms.add(pair.room);
        }
      });
    }
  });

  return Array.from(busyRooms);
}

/**
 * Отображает dropdown аудиторий с разделением на свободные и занятые
 * @param {Array} freeRooms - свободные аудитории
 * @param {Array} busyRooms - занятые аудитории
 */
function renderRoomDropdown(freeRooms, busyRooms) {
  const $dropdown = $('#pair-room-dropdown');
  $dropdown.empty();

  // Свободные аудитории
  if (freeRooms.length > 0) {
    const $freeHeader = $('<div class="dropdown-header text-success fw-semibold">Свободные аудитории:</div>');
    $dropdown.append($freeHeader);

    freeRooms.forEach(room => {
      const $item = $(`
        <div class="dropdown-item" data-room-uuid="${room.uuid}">
          ${room.name || room.title}
        </div>
      `);
      $dropdown.append($item);
    });
  }

  // Занятые аудитории
  if (busyRooms.length > 0) {
    if (freeRooms.length > 0) {
      $dropdown.append('<div class="dropdown-divider"></div>');
    }

    const $busyHeader = $('<div class="dropdown-header text-danger fw-semibold">Занятые аудитории:</div>');
    $dropdown.append($busyHeader);

    busyRooms.forEach(room => {
      const $item = $(`
        <div class="dropdown-item text-muted text-decoration-line-through" data-room-uuid="${room.uuid}" style="pointer-events: none; cursor: not-allowed;">
          ${room.name || room.title}
        </div>
      `);
      $dropdown.append($item);
    });
  }

  // Если ничего не найдено
  if (freeRooms.length === 0 && busyRooms.length === 0) {
    $dropdown.append('<div class="dropdown-item text-muted">Аудитории не найдены</div>');
  }
}

/**
 * Обрабатывает поиск групп
 * @param {Event} e - событие input
 */
function handleGroupSearch(e) {
  const query = (e.target.value || '').trim().toLowerCase();
  const $list = $('#pair-groups-list');

  if (!query) {
    // Если запрос пустой, показываем все группы
    renderGroupsList(allGroups);
    return;
  }

  // Фильтруем группы по названию, специализации и другим полям
  const filtered = allGroups.filter(group => {
    const groupName = (group.groupName || group.name || '').toLowerCase();
    const specialization = (group.specialization || '').toLowerCase();
    const faculty = (group.faculty || '').toLowerCase();
    const direction = (group.direction || '').toLowerCase();
    const sports = Array.isArray(group.kindsOfSports) ? group.kindsOfSports : [];
    
    return groupName.includes(query) || 
           specialization.includes(query) || 
           faculty.includes(query) || 
           direction.includes(query) ||
           sports.some(s => s && s.toLowerCase().includes(query));
  });

  // Отображаем отфильтрованные группы
  renderGroupsList(filtered);
}

/**
 * Отображает список групп с чекбоксами с улучшенной группировкой
 * @param {Array} groups - массив групп для отображения
 */
window.selectedGroups = [];
function renderGroupsList(groups) {
  console.log("renderGroupsList STARTED")
  const $list = $('#pair-groups-list');
  $list.empty();

  if (!groups.length) {
    $list.html('<div class="text-muted">Группы не найдены</div>');
    return;
  }

  // Группируем по курсам, затем по формам обучения, затем по факультетам
  const byCourse = {};
  groups.forEach(group => {
    const course = group.course || 0;
    if (!byCourse[course]) byCourse[course] = {};

    const form = formatEducationForm(group.educationForm);
    if (!byCourse[course][form]) byCourse[course][form] = {};

    const faculty = group.faculty || 'Не указан';
    if (!byCourse[course][form][faculty]) byCourse[course][form][faculty] = [];

    byCourse[course][form][faculty].push(group);
  });

  // Сортируем курсы
  const sortedCourses = Object.keys(byCourse).map(Number).sort((a, b) => a - b);
  for (const course of sortedCourses){

    // Заголовок курса
    if (window.selectedGroups.length !== 0 && !window.selectedGroups.some(selected => selected.course === course)) {
      continue;
    }
    const $courseHeader = $('<div class="fw-bold text-primary mb-2 mt-3">').text(`Курс ${course}:`);
    $list.append($courseHeader);

    // Сортируем формы обучения
    const sortedForms = Object.keys(byCourse[course]).sort();

    for (const form of sortedForms) {

      // let form = ''
      // if(formEnum === 'PART_TIME') form = 'заочная';
      // if(formEnum === 'FULL_TIME') form = 'очная';
      // if(formEnum === 'MIXED') form = 'очно-заочная';

      console.log("comparing forms: " + form) //очная
      console.log("LENGTH: " + window.selectedGroups.length)
      if (window.selectedGroups.length !== 0) {
        console.log(window.selectedGroups[0].educationForm) //MIXED
        console.log("same forms - " + form === window.selectedGroups[0].educationForm)
      }
      if (window.selectedGroups.length !== 0 && !window.selectedGroups.some(selected => formatEducationForm(selected.educationForm) === form)) {
        continue;
      }

      // Заголовок формы обучения
      const $formHeader = $('<div class="fw-semibold text-secondary mb-2 ms-3">').text(`Форма: ${form}`);
      $list.append($formHeader);

      // Сортируем факультеты
      const sortedFaculties = Object.keys(byCourse[course][form]).sort();

      sortedFaculties.forEach(faculty => {
        // Заголовок факультета
        const $facultyHeader = $('<div class="text-muted mb-1 ms-4">').text(`Факультет: ${faculty}`);
        $list.append($facultyHeader);

        // Сортируем группы по названию внутри факультета
        const sortedGroups = byCourse[course][form][faculty].sort((a, b) => {
          const nameA = (a.groupName || a.name || '').toLowerCase();
          const nameB = (b.groupName || b.name || '').toLowerCase();
          return nameA.localeCompare(nameB, 'ru');
        });

        // Группы факультета
        sortedGroups.forEach(group => {
          const $item = $(`
            <div class="form-check mb-1 ms-5" data-group-uuid="${group.uuid}">
              <input class="form-check-input" type="checkbox" id="group-${group.uuid}" ${window.selectedGroups.some(selectedGroup => selectedGroup.uuid === group.uuid) ? 'checked' : ''}>
              <label class="form-check-label" for="group-${group.uuid}">
                ${formatGroupLabel(group)}
              </label>
            </div>
          `);

          $item.find('input[type="checkbox"]').off('change').on('change', function () {
            if($(this).prop('checked')) {
              // Добавляем группу только если еще нет такой
              if (!window.selectedGroups.some(g => g.uuid === group.uuid)) {
                window.selectedGroups.push(group);

                // добавляем чип в контейнер для отображения добавленных групп
                const groupName = group.groupName || group.name || 'Без названия';
                let tooltipText = group.kindsOfSports && Array.isArray(group.kindsOfSports) && group.kindsOfSports.filter(sport => sport.trim().length > 0).length > 0
                    ? group.kindsOfSports.join(', ')
                    : (group.specialization || group.direction || '.');
                $('#modal-groups-container').append(`
                  <span id="group-chip-${group.uuid}" class="badge bg-primary text-white me-1 mb-1 roboto-font" 
                         data-bs-toggle="tooltip" 
                         data-bs-placement="top" 
                         data-bs-title="${tooltipText}"
                         style="cursor: pointer;">
                    ${groupName}
                  </span>
                `);
                reloadTooltip()
              }
            } else {
              // Удаляем группу по UUID
              window.selectedGroups = window.selectedGroups.filter(g => g.uuid !== group.uuid);
              
              // Удаляем чип из контейнера
              $(`#group-chip-${group.uuid}`).remove();
            }
            // НЕ вызываем renderGroupsList() чтобы избежать бесконечной рекурсии
            renderGroupsList(groups)
            console.log('Selected groups updated:', window.selectedGroups.length);
          });

          $list.append($item);
        });
      });
    }
  }
}

/**
 * Загружает свободные аудитории для указанного времени
 * @param {number} dayIdx - индекс дня недели
 * @param {number} pairOrder - номер пары
 */
async function loadFreeRoomsForTime(dayIdx, pairOrder) {
  console.log('loadFreeRoomsForTime START', { dayIdx, pairOrder });

  try {
    const date = getDateForDayIndex(dayIdx);
    console.log('Calculated date:', date);
    if (!date) {
      console.error('No date calculated for dayIdx:', dayIdx);
      return;
    }

    // Загружаем свободные аудитории
    window.freeRooms = await fetchFreeRooms(date, pairOrder); // pairOrder передается как 'pair' в API
    console.log('Loaded free rooms:', window.freeRooms.length);
    console.log('Free rooms data:', window.freeRooms);

  } catch (error) {
    console.error('Error loading free rooms:', error);
    window.freeRooms = [];
  }
}

/**
 * Загружает свободные аудитории
 * @param {string} date - дата в формате YYYY-MM-DD
 * @param {number} pair - номер пары
 * @returns {Promise<Array>} массив свободных аудиторий
 */
async function fetchFreeRooms(date, pair) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/room/free',
      type: 'GET',
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { dateString: date, pair }, // Используем 'pair' вместо 'pairOrder'
      success: (list) => resolve(list || []),
      error: (xhr) => {
        console.error('Free rooms load error', xhr);
        reject(new Error('Failed to load free rooms'));
      }
    });
  });
}

/**
 * Создает новую пару
 * @param {Object} payload - данные пары
 * @returns {Promise<Object>} созданная пара
 */
async function createPair(payload) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(payload),
      success: (pair) => resolve(pair),
      error: (xhr) => {
        console.error('Create pair error', xhr);
        
        // Получаем сообщение об ошибке от сервера
        let errorMessage = 'Не удалось создать пару';
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (xhr.responseText) {
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Если не удалось распарсить, используем статус
            if (xhr.status === 409) {
              errorMessage = 'Конфликт расписания: у группы уже есть пара в это время';
            }
          }
        } else if (xhr.status === 409) {
          errorMessage = 'Конфликт расписания: у группы уже есть пара в это время';
        }
        
        reject(new Error(errorMessage));
      }
    });
  });
}

/**
 * Обновляет существующую пару
 * @param {string} pairUuid - UUID пары
 * @param {Object} payload - данные для обновления
 * @returns {Promise<Object>} обновленная пара
 */
async function updatePair(pairUuid, payload) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/api/pair/${pairUuid}`,
      type: 'PUT',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(payload),
      success: (pair) => resolve(pair),
      error: (xhr) => {
        console.error('Update pair error', xhr);
        
        // Получаем сообщение об ошибке от сервера
        let errorMessage = 'Не удалось обновить пару';
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (xhr.responseText) {
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Если не удалось распарсить, используем статус
            if (xhr.status === 409) {
              errorMessage = 'Конфликт расписания: у группы уже есть пара в это время';
            }
          }
        } else if (xhr.status === 409) {
          errorMessage = 'Конфликт расписания: у группы уже есть пара в это время';
        }
        
        reject(new Error(errorMessage));
      }
    });
  });
}

/**
 * Удаляет пару
 * @param {string} pairUuid - UUID пары
 * @returns {Promise} результат удаления
 */
async function deletePair(pairUuid) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/api/pair/${pairUuid}`,
      type: 'DELETE',
      success: () => resolve(),
      error: (xhr) => {
        console.error('Delete pair error', xhr);
        reject(new Error('Failed to delete pair'));
      }
    });
  });
}

/**
 * Функция debounce для ограничения частоты вызовов
 * @param {Function} func - функция для вызова
 * @param {number} delay - задержка в мс
 * @returns {Function} обернутая функция
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// ---------------- Экспорт для отладки ----------------
// Можно использовать в консоли для проверки состояния
window.scheduleDebug = {
  selectedDepartments,
  loadedDepartments,
  allRooms,
  allGroups,
  allPairs,
  currentTableData,
  addDepartment,
  removeDepartment,
  selectMainDepartment,
  logSystemState,
  // Функции управления неделями
  weekStart,
  weekEnd,
  setWeekUI,
  goToPreviousWeek,
  goToNextWeek,
  goToCurrentWeek,
  getCurrentWeekRange,
  isDateInCurrentWeek,
  // Функции таблицы
  buildGrid,
  renderPairsIntoGrid,
  clearAllPairs,
  rebuildTable,
  cellKey,
  // Функции модалки
  openPairModalForCell,
  clearPairModal,
  selectedLecturers,
  freeRooms,
  // Вспомогательные функции
  formatLectFio,
  formatGroupLabel,
  dateIsoFor
};

// Экспортируем функции для доступа из других модулей (например, import-schedule.js)
window.loadPairsForWeek = loadPairsForWeek;
window.renderPairsIntoGrid = renderPairsIntoGrid;

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);

console.log('SCHEDULE_NEW.JS LOADED');
