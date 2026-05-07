// ==================== WORKLOAD TAB MANAGER ====================
// Управляет переключателем «Нагрузка преподавателей» / «Нагрузка студентов»

const WORKLOAD_TABS_HTML = `
  <div class="workload-tabs-wrapper">
    <ul class="nav nav-pills" id="workloadTabNav" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="tab-btn-teachers" data-bs-toggle="tab"
                data-bs-target="#tab-teachers" type="button" role="tab" aria-selected="true">
          <i class="bi bi-person-badge me-2"></i>Нагрузка преподавателей
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-btn-students" data-bs-toggle="tab"
                data-bs-target="#tab-students" type="button" role="tab" aria-selected="false">
          <i class="bi bi-people me-2"></i>Нагрузка студентов
        </button>
      </li>
    </ul>
  </div>

  <style>
    .workload-tabs-wrapper {
      padding: 0.75rem 1rem 0 1rem;
    }
    .workload-tabs-wrapper .nav-pills {
      gap: 0.375rem;
    }
    .workload-tabs-wrapper .nav-link {
      border-radius: 0.625rem;
      padding: 0.6rem 1.25rem;
      font-weight: 500;
      font-size: 0.925rem;
      color: #4b5563;
      transition: all 0.2s ease;
    }
    .workload-tabs-wrapper .nav-link:hover {
      color: #2563eb;
      background: rgba(37,99,235,.06);
    }
    .workload-tabs-wrapper .nav-link.active {
      color: #fff !important;
      background: linear-gradient(135deg,#2563eb,#1d4ed8) !important;
      box-shadow: 0 2px 8px rgba(37,99,235,.3);
    }
  </style>

  <div class="tab-content" id="workloadTabContent">
    <!-- Вкладка «Нагрузка преподавателей» -->
    <div class="tab-pane fade show active" id="tab-teachers" role="tabpanel" tabindex="0">
      <div class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Загрузка нагрузки…</p>
      </div>
    </div>

    <!-- Вкладка «Нагрузка студентов» -->
    <div class="tab-pane fade" id="tab-students" role="tabpanel" tabindex="0">
      <div class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Загрузка нагрузки студентов…</p>
      </div>
    </div>
  </div>
`;

// Контент первой вкладки (фильтры + карточки)
const TEACHERS_TAB_CONTENT = `
  <link rel="stylesheet" href="/css/workload.css" />
  <div class="container py-4">
    <div class="wl-header">
      <h1 class="h3 mb-1 fw-bold"><i class="bi bi-graph-up me-2"></i>Нагрузка-часы преподавателей</h1>
      <p class="mb-0 opacity-75">Выберите кафедру и период для расчёта</p>
    </div>

    <div class="card border-0 shadow-sm rounded-4 mb-4">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-4">
            <label class="form-label small fw-semibold">Кафедра</label>
            <div class="position-relative">
              <input id="wlDept" type="text" class="form-control" placeholder="Начните вводить название..." autocomplete="off" />
              <div id="wlDeptDropdown" class="dropdown-menu w-100 shadow" style="max-height: 260px; overflow-y: auto;"></div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">С</label>
            <input id="wlFrom" type="date" class="form-control" />
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">По</label>
            <input id="wlTo" type="date" class="form-control" />
          </div>
          <div class="col-12 col-md-2">
            <div class="d-flex gap-2">
              <button id="wlApply" class="btn btn-primary rounded-pill flex-grow-1">
                <i class="bi bi-search me-1"></i>Показать
              </button>
              <button id="wlReset" class="btn btn-outline-secondary rounded-pill flex-grow-1" title="Сбросить">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="wlSummary" class="text-muted small mb-3"></div>
    <div id="wlLegend" class="alert alert-info py-2 px-3 small mb-3 d-none">
      <i class="bi bi-info-circle me-2"></i>
      <span class="text-primary fw-medium">Л</span> — лекция,
      <span class="text-success fw-medium">П</span> — практика,
      <span class="text-warning fw-medium">З</span> — зачет,
      <span class="text-info fw-medium">ДЗ</span> — диф. зачет,
      <span class="text-danger fw-medium">Э</span> — экзамен.
      Все значения указаны в <strong>часах</strong> за выбранный период.
    </div>
    <div id="wlCards" class="row g-3"></div>
  </div>
`;

async function initWorkloadTabs() {
  const root = document.getElementById('workload-root');
  root.innerHTML = WORKLOAD_TABS_HTML;

  const TAB_STORAGE_KEY = 'workloadActiveTab';

  // Загружаем контент вкладки «Нагрузка преподавателей»
  const tabTeachers = document.getElementById('tab-teachers');
  tabTeachers.innerHTML = TEACHERS_TAB_CONTENT;

  // Динамически загружаем workload.js
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/js/pages/departments/workload.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load workload.js'));
    document.head.appendChild(script);
  });

  // Вызываем инициализацию
  if (window.initWorkload) {
    await window.initWorkload();
  }

  // Студенты — ленивая загрузка при первом переключении
  let studentsLoaded = false;
  const tabBtnStudents = document.getElementById('tab-btn-students');
  const tabBtnTeachers = document.getElementById('tab-btn-teachers');

  async function loadStudentsTab() {
    if (studentsLoaded) return;
    studentsLoaded = true;
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/pages/departments/student-workload.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load student-workload.js'));
        document.head.appendChild(script);
      });
      const tabStudents = document.getElementById('tab-students');
      if (window.initStudentWorkload) {
        await window.initStudentWorkload(tabStudents);
      }
    } catch (err) {
      console.error('Failed to load student workload module:', err);
      const tabStudents = document.getElementById('tab-students');
      tabStudents.innerHTML = `<div class="alert alert-danger m-4 d-flex align-items-center gap-3">
        <span>Ошибка загрузки раздела «Нагрузка студентов»</span>
        <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
          <i class="bi bi-arrow-clockwise me-1"></i>Обновить
        </button>
      </div>`;
    }
  }

  tabBtnStudents.addEventListener('shown.bs.tab', async () => {
    localStorage.setItem(TAB_STORAGE_KEY, 'students');
    await loadStudentsTab();
  });

  tabBtnTeachers.addEventListener('shown.bs.tab', () => {
    localStorage.setItem(TAB_STORAGE_KEY, 'teachers');
  });

  // Восстанавливаем активную вкладку
  const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
  if (savedTab === 'students') {
    const bsTab = new bootstrap.Tab(tabBtnStudents);
    bsTab.show();
    await loadStudentsTab();
  }
}

// Стартуем
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkloadTabs);
} else {
  initWorkloadTabs();
}
