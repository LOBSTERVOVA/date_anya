import { showToast } from './utils.js';
import { startOfWeekMonday, endOfWeekSunday, dateIsoFor } from './date.js';

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
 * Строит список групп для экспорта (в стиле модалки создания пары)
 * @param {Array} selectedUuids - массив выбранных UUID групп
 */
export function buildExportGroupsList(selectedUuids) {
  const listEl = document.getElementById('export-groups-list');
  if (!listEl) return;

  const selected = new Set(selectedUuids || []);
  listEl.innerHTML = '';

  const groups = window.allGroups || [];
  if (!groups.length) {
    if (typeof allGroups !== 'undefined') {
      groups.push(...allGroups);
    }
  }

  if (!groups.length) {
    listEl.innerHTML = '<div class="text-muted">Группы не загружены</div>';
    return;
  }

  // Группируем по курсу и форме обучения
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
      formDiv.textContent = translateEducationForm(formCode);
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

/**
 * Фильтрует группы в списке экспорта по поисковому запросу
 * @param {string} query - поисковый запрос
 */
export function filterExportGroups(query) {
  const listEl = document.getElementById('export-groups-list');
  if (!listEl) return;

  const q = (query || '').toLowerCase();

  // Проходим по элементам групп и показываем/скрываем
  const groupItems = listEl.querySelectorAll('[data-group-uuid]');
  groupItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = !q || text.includes(q) ? '' : 'none';
  });

  // Управляем видимостью заголовков курсов и форм обучения
  const allDivs = Array.from(listEl.children);
  const toHide = new Set();

  // Ищем заголовки, у которых нет видимых групп
  for (let i = 0; i < allDivs.length; i++) {
    const div = allDivs[i];
    if (div.classList.contains('fw-bold') || div.classList.contains('fw-semibold')) {
      // Проверяем следующие элементы до следующего заголовка того же или выше уровня
      let hasVisible = false;
      for (let j = i + 1; j < allDivs.length; j++) {
        const next = allDivs[j];
        if (next.classList.contains('fw-bold')) break; // следующий курс
        if (next.hasAttribute('data-group-uuid') && next.style.display !== 'none') {
          hasVisible = true;
          break;
        }
        // Проверяем вложенные form-check внутри следующих div'ов
        const innerGroups = next.querySelectorAll?.('[data-group-uuid]');
        if (innerGroups && innerGroups.length > 0) {
          for (const ig of innerGroups) {
            if (ig.style.display !== 'none') {
              hasVisible = true;
              break;
            }
          }
          if (hasVisible) break;
        }
      }
      if (!hasVisible) toHide.add(div);
    }
  }

  allDivs.forEach(div => {
    if (div.classList.contains('fw-bold') || div.classList.contains('fw-semibold')) {
      div.style.display = toHide.has(div) ? 'none' : '';
    }
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
