// Date/time utilities and constants
// export const TIMES = [
//   { from: '08:50', to: '10:20' },
//   { from: '10:40', to: '12:10' },
//   { from: '13:00', to: '14:30' },
//   { from: '14:50', to: '16:20' },
//   { from: '16:40', to: '18:10' },
//   { from: '18:30', to: '20:00' },
// ];
//
// export const DAYS = [
//   { idx: 0, title: 'Понедельник' },
//   { idx: 1, title: 'Вторник' },
//   { idx: 2, title: 'Среда' },
//   { idx: 3, title: 'Четверг' },
//   { idx: 4, title: 'Пятница' },
//   { idx: 5, title: 'Суббота' },
//   { idx: 6, title: 'Воскресенье' },
// ];

export function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

/**
 * Вычисляет начало недели (понедельник) для указанной даты
 * @param {Date} date - любая дата в неделе
 * @returns {Date} - дата начала недели (понедельник)
 */
export function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Если воскресенье (0), то -6 дней до понедельника
  return new Date(d.setDate(diff));
}

/**
 * Вычисляет конец недели (воскресенье) для указанной даты
 * @param {Date} date - любая дата в неделе
 * @returns {Date} - дата конца недели (воскресенье)
 */
export function endOfWeekSunday(date) {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

/**
 * Форматирует дату в формате DD.MM
 * @param {Date} date - дата для форматирования
 * @returns {string} - отформатированная дата
 */
export function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Форматирует дату в формате YYYY-MM-DD для API
 * @param {Date} date - дата для форматирования
 * @returns {string} - дата в формате ISO
 */
export function dateIsoFor(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// export function weekRangeLabel(weekStart) {
//   const weekEnd = new Date(weekStart);
//   weekEnd.setDate(weekEnd.getDate() + 6);
//   return `${formatDate(weekStart)} — ${formatDate(weekEnd)}`;
// }

