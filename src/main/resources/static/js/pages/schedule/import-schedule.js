import { showToast } from './utils.js';
import { cloneWeek } from './api.js';
import { dateIsoFor } from './date.js';

/**
 * Инициализация функциональности копирования расписания
 */
export function initImportSchedule() {
  console.log('initImportSchedule START');

  // Обработчик кнопки копирования расписания
  const copyWeekBtn = document.getElementById('copy-week-next');
  if (copyWeekBtn) {
    copyWeekBtn.addEventListener('click', () => {
      console.log('Copy week button clicked');
      buildCopyWeekList();
      toggleCopyWeekModal(true);
    });
  }

  // Обработчики модального окна
  const copyWeekClose = document.getElementById('copy-week-close');
  const copyWeekCancel = document.getElementById('copy-week-cancel');
  const copyWeekConfirm = document.getElementById('copy-week-confirm');

  if (copyWeekClose) copyWeekClose.addEventListener('click', () => toggleCopyWeekModal(false));
  if (copyWeekCancel) copyWeekCancel.addEventListener('click', () => toggleCopyWeekModal(false));
  
  if (copyWeekConfirm) {
    copyWeekConfirm.addEventListener('click', async () => {
      await handleCopyWeekConfirm();
    });
  }

  console.log('initImportSchedule COMPLETE');
}

/**
 * Форматирует диапазон недели с годом для отображения
 * @param {Date} mondayDate - дата понедельника недели
 * @returns {string} - отформатированный диапазон
 */
function formatWeekRangeWithYear(mondayDate) {
  console.log('formatWeekRangeWithYear START');

  const start = new Date(mondayDate);
  const end = new Date(mondayDate);
  end.setDate(end.getDate() + 6);
  
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };
  
  return `${fmt(start)}-${fmt(end)}`;
}

/**
 * Строит список недель для выбора копирования
 */
function buildCopyWeekList() {
  console.log('buildCopyWeekList START');

  const list = document.getElementById('copy-week-list');
  if (!list) return;
  list.innerHTML = '';

  // Получаем текущую неделю из глобальных переменных
  let weekStart = window.weekStart;
  
  // Если weekStart нет в window, пробуем получить из DOM или использовать текущую неделю
  if (!weekStart) {
    // Пробуем получить из текста элемента с датами недели
    const weekDatesEl = document.getElementById('week-dates');
    if (weekDatesEl && weekDatesEl.textContent) {
      // Парсим даты из текста вроде "22.12 — 28.12"
      const dates = weekDatesEl.textContent.match(/(\d{2})\.(\d{2})/g);
      if (dates && dates.length >= 2) {
        const [startDay, startMonth] = dates[0].split('.');
        const year = new Date().getFullYear();
        weekStart = new Date(year, parseInt(startMonth) - 1, parseInt(startDay));
        console.log('Parsed weekStart from DOM:', weekStart);
      }
    }
    
    // Если все еще нет, используем текущую неделю
    if (!weekStart) {
      weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
      weekStart = new Date(weekStart.setDate(diff));
      console.log('Using current week as fallback:', weekStart);
    }
  }

  // Генерируем только прошлые недели относительно текущей
  const items = [];
  const cursor = new Date(weekStart);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 7); // начинаем с недели ПЕРЕД текущей

  let guard = 0;
  const maxWeeks = 12; // показываем последние 12 недель

  while (cursor >= new Date(weekStart.getTime() - (maxWeeks * 7 * 24 * 60 * 60 * 1000)) && guard < maxWeeks) {
    guard++;
    items.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 7);
  }

  if (items.length === 0) {
    list.innerHTML = '<div class="text-muted">Нет доступных недель для копирования</div>';
    return;
  }

  items.forEach(monday => {
    const iso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const id = `copy-week-${iso}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'form-check';

    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'form-check-input';
    input.name = 'copy-week-source';
    input.id = `copy-week-${iso}`;
    input.value = iso;

    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = id;
    label.textContent = formatWeekRangeWithYear(monday);

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    list.appendChild(wrapper);
  });

  console.log('Built copy week list with', items.length, 'weeks');
}

/**
 * Переключает отображение модального окна копирования
 * @param {boolean} show - показать или скрыть модалку
 */
function toggleCopyWeekModal(show) {
  console.log('toggleCopyWeekModal START:', show);

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
    if (dialog) dialog.style.marginTop = '10vh';
  } else {
    el.style.background = '';
  }
}

/**
 * Обрабатывает подтверждение копирования недели
 */
async function handleCopyWeekConfirm() {
  console.log('handleCopyWeekConfirm START');

  const selected = document.querySelector('#copy-week-list input[type="radio"][name="copy-week-source"]:checked');
  if (!selected) {
    showToast('Выберите неделю, из которой копировать расписание', 'warning');
    return;
  }

  const fromIso = selected.value;
  console.log('Selected source week:', fromIso);

  // Получаем выбранные кафедры
  const selectedDepartments = window.selectedDepartments || [];
  if (selectedDepartments.length === 0) {
    showToast('Выберите хотя бы одну кафедру для копирования расписания', 'warning');
    return;
  }

  const targetIso = dateIsoFor(window.weekStart);
  console.log('Target week:', targetIso, 'Departments to copy:', selectedDepartments.length);

  try {
    let totalCloned = 0;
    let errors = [];

    // Копируем расписание для каждой выбранной кафедры
    for (const dept of selectedDepartments) {
      try {
        console.log('Cloning week for department:', dept.name, 'UUID:', dept.uuid);
        const cloned = await cloneWeek(fromIso, targetIso, dept.uuid);
        const count = Array.isArray(cloned) ? cloned.length : 0;
        totalCloned += count;
        console.log('Cloned', count, 'pairs for department:', dept.name);
      } catch (e) {
        console.error('Failed to clone week for department:', dept.name, e);
        
        // Добавляем более понятное сообщение об ошибке
        let errorMessage = dept.name;
        if (e.message && e.message.includes('shared references to a collection')) {
          errorMessage += ' (ошибка бэкенда: проблема с коллекциями преподавателей)';
        } else if (e.message && e.message.includes('500')) {
          errorMessage += ' (ошибка сервера)';
        } else {
          errorMessage += ` (${e.message})`;
        }
        
        errors.push(errorMessage);
      }
    }

    toggleCopyWeekModal(false);

    if (totalCloned > 0) {
      showToast(`Скопировано пар: ${totalCloned} для ${selectedDepartments.length - errors.length} кафедр`, 'success');
    } else {
      showToast('Новые пары не были созданы (все конфликтовали или отсутствовали исходные)', 'info');
    }

    if (errors.length > 0) {
    if (totalCloned === 0) {
      // Если ничего не скопировалось, показываем детальную ошибку
      showToast(`Не удалось скопировать расписание. Ошибки: ${errors.join(', ')}`, 'danger');
    } else {
      // Если что-то скопировалось, показываем предупреждение
      showToast(`Не удалось скопировать для кафедр: ${errors.join(', ')}`, 'warning');
    }
  }

    // Сразу обновляем расписание после копирования
    try {
      console.log('Refreshing schedule after cloning...');
      console.log('Available functions:', {
        loadPairsForWeek: typeof window.loadPairsForWeek,
        renderPairsIntoGrid: typeof window.renderPairsIntoGrid
      });
      
      // Обновляем пары для текущей недели
      if (typeof window.loadPairsForWeek === 'function') {
        console.log('Calling loadPairsForWeek...');
        await window.loadPairsForWeek();
        console.log('Pairs reloaded successfully');
      } else {
        console.error('loadPairsForWeek is not available');
      }
      
      // Перерисовываем таблицу
      if (typeof window.renderPairsIntoGrid === 'function') {
        console.log('Calling renderPairsIntoGrid...');
        window.renderPairsIntoGrid();
        console.log('Grid re-rendered successfully');
      } else {
        console.error('renderPairsIntoGrid is not available');
      }
      
      // Если была успешная операция, показываем дополнительное сообщение
      if (totalCloned > 0) {
        showToast('Расписание обновлено', 'success');
      }
      
    } catch (e) {
      console.error('Failed to refresh schedule after cloning:', e);
      showToast('Расписание скопировано, но не удалось обновить отображение. Обновите страницу вручную.', 'warning');
    }

  } catch (e) {
    console.error('Clone week failed', e);
    showToast('Не удалось скопировать расписание', 'danger');
  }
}
