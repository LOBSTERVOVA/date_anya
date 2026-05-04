import { showToast } from './utils.js';
import { startOfWeekMonday, endOfWeekSunday, dateIsoFor } from './date.js';

// Базовый URL
const base = typeof window !== 'undefined' && window.mainUrl ? window.mainUrl : (typeof mainUrl !== 'undefined' ? mainUrl : '');

/**
 * Форматирует дату в формате YYYY-MM-DD без UTC проблем
 * @param {Date} date - дата для форматирования
 * @returns {string} - дата в формате YYYY-MM-DD
 */
function formatDateLocal(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Конвертирует дату в начало недели (понедельник)
 * @param {string} dateIso - дата в формате ISO
 * @returns {string} дата начала недели
 */
function toWeekStart(dateIso) {
  const date = new Date(dateIso);
  const monday = startOfWeekMonday(date);
  return formatDateLocal(monday);
}

/**
 * Конвертирует дату в конец недели (воскресенье)
 * @param {string} dateIso - дата в формате ISO
 * @returns {string} дата конца недели
 */
function toWeekEnd(dateIso) {
  const date = new Date(dateIso);
  const sunday = endOfWeekSunday(date);
  return formatDateLocal(sunday);
}

/**
 * Экспортирует расписание в Excel
 * @param {Object} payload - данные для экспорта
 * @returns {Promise<Object>} - { blob, filename }
 */
export function exportScheduleExcel(payload) {
  const headers = buildCsrfHeaders();
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/export/schedule',
      type: 'POST',
      contentType: 'application/json; charset=UTF-8',
      data: JSON.stringify(payload),
      xhrFields: { responseType: 'blob' },
      headers,
      success: (data, status, xhr) => {
        try {
          const cd = xhr.getResponseHeader('Content-Disposition') || '';
          let filename = 'schedule.xlsx';
          // Try RFC 5987 filename* first
          let m = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
          if (m && m[1]) {
            try { filename = decodeURIComponent(m[1]); } catch (_) { filename = m[1]; }
          } else {
            // Fallback to filename=
            m = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
            if (m && m[1]) filename = m[1];
          }
          const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          resolve({ blob, filename });
        } catch (e) {
          // Safe fallback
          const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          resolve({ blob, filename: 'schedule.xlsx' });
        }
      },
      error: (xhr, status, error) => {
        console.error('Export error:', xhr, status, error);
        reject(new Error('Failed to export schedule'));
      }
    });
  });
}

/**
 * Переводит форму обучения на русский
 * @param {string} form - форма обучения на английском
 * @returns {string} форма обучения на русском
 */
function translateEducationForm(form) {
  const translations = {
    'FULL_TIME': 'Очная',
    'PART_TIME': 'Заочная',
    'EXTRAMURAL': 'Заочная',
    'FULL_TIME_PART_TIME': 'Очно-заочная',
    'MIXED': 'Очно-заочная',
    'DISTANCE': 'Дистанционная'
  };
  return translations[form] || form;
}

/**
 * Строит список групп для экспорта
 * @param {Array} selectedUuids - массив выбранных UUID групп
 */
export function buildExportGroupsList(selectedUuids) {
  console.log('buildExportGroupsList START');
  console.log('Selected UUIDs:', selectedUuids);
  console.log('window.allGroups:', window.allGroups);
  console.log('allGroups length:', window.allGroups?.length);

  const listEl = document.getElementById('export-groups-list');
  if (!listEl) {
    console.error('export-groups-list element not found');
    return;
  }
  
  const selected = new Set(selectedUuids || []);
  listEl.innerHTML = '';

  // Проверяем, что группы загружены
  const groups = window.allGroups || [];
  if (!groups.length) {
    console.warn('No groups loaded, trying to get from global scope');
    // Попробуем получить из другого источника
    if (typeof allGroups !== 'undefined') {
      groups.push(...allGroups);
    }
  }

  console.log('Final groups array:', groups);

  if (!groups.length) {
    listEl.innerHTML = '<div class="text-muted">Группы не загружены</div>';
    return;
  }

  let baseCourse = null;
  let baseForm = null;
  let baseFaculty = null;

  if (selected.size > 0) {
    const firstUuid = Array.from(selected)[0];
    const g0 = groups.find(g => g && g.uuid === firstUuid);
    if (g0) {
      baseCourse = g0.course ?? null;
      baseForm = g0.educationForm || null;
      baseFaculty = g0.faculty || null;
    }
  }

  const groupsByCourse = {};

  // Группируем группы по курсу и форме обучения
  groups.forEach(group => {
    if (!group) return;
    const course = group.course ?? 'unknown';
    const form = group.educationForm || 'unknown';
    const key = `${course}-${form}`;
    if (!groupsByCourse[key]) groupsByCourse[key] = [];
    groupsByCourse[key].push(group);
  });

  console.log('Groups by course:', groupsByCourse);

  // Сортируем курсы
  const sortedKeys = Object.keys(groupsByCourse).sort((a, b) => {
    const [aCourse] = a.split('-').map(Number);
    const [bCourse] = b.split('-').map(Number);
    return aCourse - bCourse;
  });

  console.log('Sorted keys:', sortedKeys);

  sortedKeys.forEach(key => {
    const [courseStr, form] = key.split('-');
    const course = Number(courseStr);
    const courseGroups = groupsByCourse[key];

    // Группируем по факультетам
    const groupsByFaculty = {};
    courseGroups.forEach(group => {
      const faculty = group.faculty || 'Без факультета';
      if (!groupsByFaculty[faculty]) groupsByFaculty[faculty] = [];
      groupsByFaculty[faculty].push(group);
    });

    // Создаем заголовок курса
    const courseHeader = document.createElement('div');
    courseHeader.className = 'fw-bold text-primary mb-2';
    courseHeader.textContent = `Курс ${course}:`;
    listEl.appendChild(courseHeader);

    // Создаем заголовок формы обучения
    const formHeader = document.createElement('div');
    formHeader.className = 'text-muted mb-3 ms-3';
    formHeader.textContent = `Форма: ${translateEducationForm(form)}`;
    listEl.appendChild(formHeader);

    // Отображаем группы по факультетам
    Object.keys(groupsByFaculty).forEach(faculty => {
      const facultyGroups = groupsByFaculty[faculty];
      
      // Заголовок факультета
      const facultyHeader = document.createElement('div');
      facultyHeader.className = 'fw-semibold text-secondary mb-2 ms-4';
      facultyHeader.textContent = `Факультет: ${faculty}`;
      listEl.appendChild(facultyHeader);

      // Контейнер для групп факультета
      const facultyContainer = document.createElement('div');
      facultyContainer.className = 'mb-4 ms-5';

      facultyGroups.forEach(group => {
        // Отладка - смотрим структуру группы
        console.log('Group structure:', group);
        
        const item = document.createElement('div');
        item.className = 'form-check mb-2';
        item.setAttribute('data-group-uuid', group.uuid);

        const checkbox = document.createElement('input');
        checkbox.className = 'form-check-input';
        checkbox.type = 'checkbox';
        checkbox.id = `export-group-${group.uuid}`;
        checkbox.checked = selected.has(group.uuid);

        const label = document.createElement('label');
        label.className = 'form-check-label d-block';
        label.htmlFor = `export-group-${group.uuid}`;
        
        // Формируем полное название: "Код группы Направление. Полное название (форма)"
        let displayName = '';
        
        // Код группы
        if (group.groupName) {
          displayName = group.groupName;
        }
        
        // Специализация
        if (group.specialization) {
          displayName += ' ' + group.specialization;
        }
        
        // Полное название (если есть)
        if (group.fullName) {
          displayName += '. ' + group.fullName;
        }
        
        // Форма обучения в скобках
        displayName += ` (${translateEducationForm(group.educationForm)})`;
        
        label.textContent = displayName;

        item.appendChild(checkbox);
        item.appendChild(label);
        facultyContainer.appendChild(item);
      });

      listEl.appendChild(facultyContainer);
    });
  });

  console.log('Groups list built successfully');
}

/**
 * Фильтрует группы в списке экспорта по поисковому запросу
 * @param {string} query - поисковый запрос
 */
export function filterExportGroups(query) {
  console.log('filterExportGroups:', query);
  
  const listEl = document.getElementById('export-groups-list');
  if (!listEl) return;

  const groupItems = listEl.querySelectorAll('[data-group-uuid]');
  
  groupItems.forEach(item => {
    const groupUuid = item.getAttribute('data-group-uuid');
    const group = (window.allGroups || []).find(g => g && g.uuid === groupUuid);
    
    // Формируем текст для поиска: все возможные поля
    let searchText = '';
    if (group) {
      // Собираем все поля для поиска
      const searchFields = [
        group.groupName,               // Код группы
        group.specialization,           // Специализация
        group.fullName,                // Полное название
        group.faculty,                 // Факультет
        group.educationForm,           // Форма обучения
        group.course                   // Курс
      ].filter(Boolean).join(' ');
      
      searchText = searchFields.toLowerCase();
    } else {
      searchText = item.textContent.toLowerCase();
    }
    
    const shouldShow = !query || searchText.includes(query.toLowerCase());
    item.style.display = shouldShow ? '' : 'none';
  });

  // Показываем/скрываем заголовки в зависимости от видимых групп
  const headers = listEl.querySelectorAll('.fw-bold, .fw-semibold, .text-muted');
  headers.forEach(header => {
    // Находим следующий контейнер с группами
    let nextElement = header.nextElementSibling;
    let hasVisibleGroups = false;
    
    while (nextElement && !nextElement.classList.contains('fw-bold') && !nextElement.classList.contains('fw-semibold')) {
      const visibleGroups = nextElement.querySelectorAll('[data-group-uuid]:not([style*="display: none"])');
      if (visibleGroups.length > 0) {
        hasVisibleGroups = true;
        break;
      }
      nextElement = nextElement.nextElementSibling;
    }
    
    header.style.display = hasVisibleGroups || !query ? '' : 'none';
  });
}

/**
 * Получает UUID выбранных для экспорта групп
 * @returns {Array} массив UUID групп
 */
export function getSelectedExportGroupUuids() {
  const checkboxes = document.querySelectorAll('#export-groups-list input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.closest('[data-group-uuid]').getAttribute('data-group-uuid'));
}

/**
 * Переключает видимость модалки экспорта
 * @param {boolean} show - показать или скрыть модалку
 */
export function toggleExportModal(show) {
  console.log('toggleExportModal START');

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
    
    // Увеличиваем список групп
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
  
  // на всякий случай чистим возможный bootstrap backdrop и класс modal-open
  try {
    document.body.classList.remove('modal-open');
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) backdrop.remove();
  } catch (_) {}
}

/**
 * Инициализирует обработчики для экспорта расписания
 */
export function initExportSchedule() {
  console.log('initExportSchedule START');

  // Убеждаемся, что группы доступны
  if (!window.allGroups) {
    console.warn('window.allGroups not available, trying to set from global scope');
    if (typeof allGroups !== 'undefined') {
      window.allGroups = allGroups;
    }
  }

  // Кнопка экспорта
  const exportBtn = document.getElementById('export-schedule');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const from = document.getElementById('export-from');
      const to = document.getElementById('export-to');
      
      // Устанавливаем текущую неделю как период по умолчанию
      const today = new Date();
      console.log('Today:', today, 'Day:', today.getDay());
      
      // Создаем копии дат чтобы избежать мутации
      const monday = startOfWeekMonday(new Date(today));
      const sunday = endOfWeekSunday(new Date(today));
      
      console.log('Monday:', monday, 'Sunday:', sunday);
      console.log('Monday ISO:', formatDateLocal(monday), 'Sunday ISO:', formatDateLocal(sunday));
      
      if (from) from.value = formatDateLocal(monday);
      if (to) to.value = formatDateLocal(sunday);
      
      buildExportGroupsList(getSelectedExportGroupUuids());
      toggleExportModal(true);
    });
  }

  // Обработчик поиска групп
  const searchInput = document.getElementById('export-groups-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterExportGroups(e.target.value.toLowerCase());
      }, 300);
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
      const fromIso = from && from.value ? from.value : dateIsoFor(0);
      const toIso = to && to.value ? to.value : dateIsoFor(6);
      
      if (!fromIso || !toIso) { 
        showToast('Укажите период экспорта', 'warning', 'Ошибка'); 
        return; 
      }
      
      const groupUuids = getSelectedExportGroupUuids();
      if (!groupUuids.length) { 
        showToast('Выберите хотя бы одну группу для экспорта', 'warning', 'Ошибка'); 
        return; 
      }
      
      try {
        // Конвертируем даты в начало/конец недели
        const weekStart = toWeekStart(fromIso);
        const weekEnd = toWeekEnd(toIso);
        
        console.log('Export dates:', { from: fromIso, to: toIso, weekStart, weekEnd });
        
        const { blob, filename } = await exportScheduleExcel({ from: weekStart, to: weekEnd, groups: groupUuids });
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

  console.log('Export schedule initialized');
}

/**
 * Строит CSRF заголовки
 * @returns {Object} заголовки
 */
function buildCsrfHeaders() {
  const token = $('meta[name="_csrf"]').attr('content');
  const header = $('meta[name="_csrf_header"]').attr('content');
  const headers = {};
  if (header && token) headers[header] = token;
  return headers;
}
