// Utility and helpers for schedule page (ES module)

/**
 * при передаче null в параметры вернется понедельник текущей недели
 * */
export function getWeekStart(date) {
    const d = date ? new Date(date) : new Date();
    const day = d.getDay();
    const daysToSubtract = day === 0 ? 6 : day - 1;
    // Возвращаем НОВЫЙ объект без мутации исходного
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysToSubtract);
}

export function getWeekEnd(date) {
    const d = date ? new Date(date) : new Date();
    const day = d.getDay();
    const daysToAdd = day === 0 ? 0 : 7 - day;
    // Возвращаем НОВЫЙ объект без мутации исходного
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToAdd);
}

export const formatDateDDMM = d =>
    `${('0'+d.getDate()).slice(-2)}.${('0'+(d.getMonth()+1)).slice(-2)}`;


export function debounce(fn, wait) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Try to get CSRF token exposed by Thymeleaf or global window
export function getCsrf() {
    try {
        // eslint-disable-next-line no-undef
        if (typeof csrf !== 'undefined' && csrf) {
            // eslint-disable-next-line no-undef
            return csrf;
        }
    } catch (e) {
    }
    if (typeof window !== 'undefined' && window.csrf) return window.csrf;
    return null;
}

// Show a Bootstrap toast in the global container (#info-toast)
// variant: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'light' | 'dark'
export function showToast(message, variant = 'info', title = '') {
    try {
        const container = document.getElementById('info-toast');
        if (!container) {
            alert(message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast show border-0 overflow-hidden mb-2`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
      <div class="toast-body p-0">
        <div class="d-flex align-items-stretch">
          <div class="px-3 py-2 bg-${variant} text-white d-flex align-items-center">
            <i class="bi ${variant === 'success' ? 'bi-check-circle' : (variant === 'danger' ? 'bi-x-circle' : 'bi-info-circle')}"></i>
          </div>
          <div class="px-3 py-2 bg-white flex-grow-1">
            ${title ? `<div class="fw-semibold mb-1">${title}</div>` : ''}
            <div>${message}</div>
          </div>
          <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;

        container.appendChild(toast);
        // bootstrap global
        const bs = window.bootstrap && window.bootstrap.Toast ? window.bootstrap : null;
        if (bs) {
            const inst = new bs.Toast(toast, {autohide: true, delay: 3500});
            inst.show();
            toast.addEventListener('hidden.bs.toast', () => toast.remove());
        } else {
            // Fallback: auto-remove after delay
            setTimeout(() => {
                toast.classList.remove('show');
                toast.remove();
            }, 4000);
        }
    } catch (_) {
        try {
            alert(message);
        } catch (__) {
        }
    }
}

export function formatLectFio(lecturer) {
    if (!lecturer) return '';
    const {lastName = '', firstName = '', middleName = ''} = lecturer;
    return [lastName, firstName, middleName].filter(Boolean).join(' ').trim() || 'Преподаватель';
}

export function dateToIso(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        throw new Error('Некорректная дата');
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function formatEducationForm(form) {
    if(form === 'FULL_TIME') return 'Очная'
    if(form === 'PART_TIME') return 'Заочная'
    if(form === 'MIXED') return 'Очно-заочная'
    throw Error('Неизвестная форма обучения')
}