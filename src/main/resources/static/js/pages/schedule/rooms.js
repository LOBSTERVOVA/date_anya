// ==================== ТАБЛИЦА АУДИТОРИЙ ====================

/**
 * Отрисовывает таблицу аудиторий
 * @param {Array} pairs - массив пар для текущей недели
 * @param {Array} rooms - массив всех аудиторий
 */
function renderRoomsTable(pairs, rooms) {
  console.log('renderRoomsTable called with pairs:', pairs.length, 'rooms:', rooms.length);
  
  const container = document.getElementById('rooms-table-container');
  if (!container) {
    console.error('rooms-table-container not found');
    return;
  }
  
  if (!rooms || rooms.length === 0) {
    container.innerHTML = '<h6 class="text-muted mb-3">Таблица аудиторий</h6><div class="alert alert-warning">Аудитории не загружены</div>';
    return;
  }
  
  // Создаем HTML таблицы
  let tableHtml = `
    <h6 class="text-muted mb-3">Таблица аудиторий</h6>
    <div class="table-responsive">
      <table class="table table-bordered align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th style="width: 120px;">День</th>
            <th style="width: 80px;">Пара</th>
  `;
  
  // Добавляем заголовки аудиторий
  rooms.forEach(room => {
    tableHtml += `<th style="min-width: 120px;">${room.name || room.title || 'Аудитория'}</th>`;
  });
  
  tableHtml += `
          </tr>
        </thead>
        <tbody>
  `;
  
  // Дни недели
  const weekDays = [
    { name: 'Понедельник', short: 'Пн' },
    { name: 'Вторник', short: 'Вт' },
    { name: 'Среда', short: 'Ср' },
    { name: 'Четверг', short: 'Чт' },
    { name: 'Пятница', short: 'Пт' },
    { name: 'Суббота', short: 'Сб' }
  ];
  
  // Создаем строки для каждой пары каждого дня
  weekDays.forEach((day, dayIdx) => {
    for (let pairOrder = 1; pairOrder <= 6; pairOrder++) {
      tableHtml += '<tr>';
      
      // Ячейка дня (только для первой пары дня)
      if (pairOrder === 1) {
        tableHtml += `
          <td rowspan="6">
            <div class="fw-semibold">${day.name}</div>
            <div class="text-muted small">${day.short}</div>
          </td>
        `;
      }
      
      // Ячейка номера пары
      tableHtml += `<td><div class="text-center fw-semibold">${pairOrder}</div></td>`;
      
      // Ячейки аудиторий
      rooms.forEach(room => {
        const roomPairs = getPairsForRoomAndTime(pairs, room.uuid, dayIdx, pairOrder);
        tableHtml += `<td class="p-1" style="vertical-align: top;">${renderRoomCellContent(roomPairs)}</td>`;
      });
      
      tableHtml += '</tr>';
    }
  });
  
  tableHtml += `
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = tableHtml;
  console.log('Rooms table rendered successfully');
}

/**
 * Получает пары для конкретной аудитории, дня и времени
 * @param {Array} pairs - все пары
 * @param {string} roomUuid - UUID аудитории
 * @param {number} dayIdx - индекс дня недели
 * @param {number} pairOrder - номер пары
 * @returns {Array} массив пар для этой ячейки
 */
function getPairsForRoomAndTime(pairs, roomUuid, dayIdx, pairOrder) {
  return pairs.filter(pair => {
    if (!pair.dateString || !pair.pairOrder) return false;
    
    // Проверяем номер пары
    if (pair.pairOrder !== pairOrder) return false;
    
    // Проверяем день недели
    const pairDate = new Date(pair.dateString + 'T00:00:00');
    const dayOfWeek = pairDate.getDay();
    const pairDayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    if (pairDayIdx !== dayIdx) return false;
    
    // Проверяем аудиторию
    if (pair.room && pair.room.uuid === roomUuid) return true;
    
    return false;
  });
}

/**
 * Отрисовывает содержимое ячейки аудитории
 * @param {Array} pairs - массив пар для ячейки
 * @returns {string} HTML содержимого ячейки
 */
function renderRoomCellContent(pairs) {
  if (!pairs || pairs.length === 0) {
    return '<div class="text-muted small text-center">—</div>';
  }
  
  // Если есть несколько пар, показываем предмет только один раз
  const subject = pairs[0].subject?.name || pairs[0].name || '';
  const allGroups = pairs.map(pair => renderGroupsInfo(pair)).filter(g => g).join('<br>');
  
  return `
    <div style="max-height: 200px; overflow-y: auto; overflow-x: hidden;">
      <div class="pair-item p-1 bg-light rounded small">
        <div class="fw-semibold">${subject}</div>
        ${allGroups ? `<div class="text-muted">${allGroups}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Форматирует информацию о группах
 * @param {Object} pair - объект пары
 * @returns {string} отформатированная информация о группах
 */
function renderGroupsInfo(pair) {
  const groups = [];
  
  // Обрабатываем разные форматы групп
  if (pair.groups && Array.isArray(pair.groups)) {
    pair.groups.forEach(group => {
      groups.push(formatGroupInfo(group));
    });
  } else if (pair.group) {
    groups.push(formatGroupInfo(pair.group));
  } else if (pair.groupUuid) {
    // Ищем группу по UUID (потребуется доступ к allGroups)
    groups.push(`Группа ${pair.groupUuid}`);
  }
  
  return groups.join('<br>');
}

/**
 * Форматирует информацию о группе
 * @param {Object} group - объект группы
 * @returns {string} отформатированная информация
 */
function formatGroupInfo(group) {
  const course = group.course || '';
  const form = formatEducationForm(group.educationForm);
  const name = group.name || group.title || '';
  const spec = group.specialization || '';
  
  let result = '';
  if (course) result += `${course} курс `;
  if (form) result += `${form} `;
  if (name) result += name;
  if (spec) result += ` (${spec})`;
  
  return result.trim();
}

/**
 * Преобразует форму обучения в читаемый формат
 * @param {string} form - форма обучения
 * @returns {string} читаемое название
 */
function formatEducationForm(form) {
  switch (form) {
    case 'FULL_TIME': return 'очная';
    case 'EXTRAMURAL': return 'заочная';
    case 'PART_TIME': return 'заочная';
    case 'MIXED': return 'очно-заочная';
    case 'DISTANCE': return 'дистанционная';
    default: return form || '';
  }
}

console.log('ROOMS.JS LOADED');
