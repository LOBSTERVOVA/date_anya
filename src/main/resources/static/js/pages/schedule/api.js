// API calls for schedule page (ES module)
import { getCsrf } from './utils.js';

// вернет список кафедр с преподавателями(минимальная сущность преподов) и предметами(минимальная сущность предметов)
export function fetchDepartments(query) {
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

export function cloneWeek(payload) {
  // payload: { departmentUuid, sourceDate, targetDate, lecturerUuids, daysOfWeek }
  if (!payload || !payload.departmentUuid || !payload.sourceDate || !payload.targetDate) {
    return Promise.reject(new Error('departmentUuid, sourceDate and targetDate are required'));
  }
  const headers = buildCsrfHeaders();
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair/clone',
      type: 'POST',
      contentType: 'application/json; charset=UTF-8',
      dataType: 'json',
      headers,
      data: JSON.stringify(payload),
      success: (response) => resolve(response),
      error: (xhr) => {
        console.error('Clone week error', xhr);
        reject(new Error((xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Failed to clone week'));
      },
    });
  });
}

export function deletePair(uuid) {
  if (!uuid) return Promise.reject(new Error('UUID is required'));
  const headers = buildCsrfHeaders();
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair/' + encodeURIComponent(uuid),
      type: 'DELETE',
      dataType: 'text',
      headers,
      success: () => resolve(),
      error: (xhr) => { console.error('Pair delete error', xhr); reject(new Error('Failed to delete pair')); },
    });
  });
}

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
      error: (xhr) => { console.error('Export error', xhr); reject(new Error('Export failed')); },
    });
  });
}

export function updatePair(uuid, payload) {
  if (!uuid) return Promise.reject(new Error('UUID is required'));
  const headers = buildCsrfHeaders();
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair/' + encodeURIComponent(uuid),
      type: 'PUT',
      contentType: 'application/json; charset=UTF-8',
      dataType: 'json',
      headers,
      data: JSON.stringify(payload),
      success: (saved) => resolve(saved),
      error: (xhr) => {
        console.error('Pair update error', xhr);
        reject(new Error((xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Failed to update pair'));
      },
    });
  });
}

export function fetchWeekPairs(groupUuid, fromIso, toIso) {
  if (!groupUuid || !fromIso) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair/week',
      type: 'GET',
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      traditional: true,
      data: { group: groupUuid, from: fromIso, to: toIso },
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Week pairs load error', xhr); reject(new Error('Failed to load week pairs')); },
    });
  });
}

export function fetchWeekPairsBatch(fromIso) {
  if (!fromIso) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair/week/batch',
      type: 'GET',
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      traditional: true,
      data: { from: fromIso },
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Week pairs batch load error', xhr); reject(new Error('Failed to load week pairs batch')); },
    });
  });
}

export function savePair(payload) {
  const headers = buildCsrfHeaders();
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pair',
      type: 'POST',
      contentType: 'application/json; charset=UTF-8',
      dataType: 'json',
      headers,
      data: JSON.stringify(payload),
      success: (saved) => resolve(saved),
      error: (xhr) => {
        console.error('Pair save error', xhr);
        reject(new Error((xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Failed to save pair'));
      },
    });
  });
}

export function fetchLecturers(query) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/lecturer',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { q: query || '' },
      success: (list) => {
        // Debug logging (safe):
        try {
          (list || []).forEach(l => {
            const dep = l && l.department ? l.department : {};
            console.debug('[lecturer]', l.firstName || '', dep.uuid || '', dep.name || '');
          });
        } catch (_) {}
        resolve(list || []);
      },
      error: (xhr) => { console.error('Lecturers load error', xhr); reject(new Error('Failed to load lecturers')); },
    });
  });
}

export function fetchGroups(query) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/group',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { q: query || '' },
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Groups load error', xhr); reject(new Error('Failed to load groups')); },
    });
  });
}

export function deleteGroup(uuid) {
  return new Promise((resolve, reject) => {
    const headers = buildCsrfHeaders();
    $.ajax({
      url: '/api/group/' + uuid,
      type: 'DELETE',
      headers: headers,
      success: () => resolve(),
      error: (xhr) => { console.error('Group delete error', xhr); reject(new Error('Failed to delete group')); },
    });
  });
}


// Example POST helpers can import getCsrf from utils when needed in main file
export function buildCsrfHeaders() {
  const headers = {};
  const csrfObj = getCsrf();
  if (csrfObj && csrfObj.headerName && csrfObj.token) headers[csrfObj.headerName] = csrfObj.token;
  else if (csrfObj && csrfObj.token) headers['X-CSRF-TOKEN'] = csrfObj.token;
  return headers;
}

export function fetchRooms(query) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/room',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { q: query || '' },
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Rooms load error', xhr); reject(new Error('Failed to load rooms')); },
    });
  });
}

// export function fetchFreeRooms(date, pair) {
//   return new Promise((resolve, reject) => {
//     $.ajax({
//       url: '/api/room/free',
//       type: 'GET',
//       traditional: true,
//       dataType: 'json',
//       headers: { 'Accept': 'application/json' },
//       data: { dateString: date, pair: pair },
//       success: (list) => resolve(list || []),
//       error: (xhr) => { console.error('Free rooms load error', xhr); reject(new Error('Failed to load free rooms')); },
//     });
//   });
// }

export function fetchPairsByTime(date, pair) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/pairs/by-time',
      type: 'GET',
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: { dateString: date, pair: pair },
      success: (list) => resolve(Array.isArray(list) ? list : []),
      error: (xhr) => { console.error('Pairs by time load error', xhr); reject(new Error('Failed to load pairs by time')); },
    });
  });
}

// ==================== PRACTICE API ====================

export function fetchPractices(from, to, groupUuids) {
  return new Promise((resolve, reject) => {
    const params = { from, to };
    if (groupUuids && groupUuids.length) params.groupUuids = groupUuids;
    $.ajax({
      url: '/api/practice',
      type: 'GET',
      traditional: true,
      dataType: 'json',
      headers: { 'Accept': 'application/json' },
      data: params,
      success: (list) => resolve(list || []),
      error: (xhr) => { console.error('Practices load error', xhr); reject(new Error('Failed to load practices')); },
    });
  });
}

export function savePractice(payload) {
  const headers = buildCsrfHeaders();
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/practice',
      type: 'POST',
      contentType: 'application/json; charset=UTF-8',
      dataType: 'json',
      headers,
      data: JSON.stringify(payload),
      success: (saved) => resolve(saved),
      error: (xhr) => {
        console.error('Practice save error', xhr);
        reject(new Error((xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Failed to save practice'));
      },
    });
  });
}

export function deletePractice(uuid) {
  const headers = buildCsrfHeaders();
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/api/practice/' + uuid,
      type: 'DELETE',
      headers,
      success: () => resolve(),
      error: (xhr) => {
        console.error('Practice delete error', xhr);
        reject(new Error((xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Failed to delete practice'));
      },
    });
  });
}
