// ==================== SCHEDULE TAB MANAGER ====================
// Управляет переключателем «Учебное расписание» / «Практика»
// Лениво загружает соответствующие модули при первом открытии вкладки

const TABS_HTML = `
  <div class="schedule-tabs-wrapper">
    <ul class="nav nav-pills" id="scheduleTabNav" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="tab-btn-schedule" data-bs-toggle="tab"
                data-bs-target="#tab-schedule" type="button" role="tab" aria-selected="true">
          <i class="bi bi-calendar-week me-2"></i>Учебное расписание
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-btn-practice" data-bs-toggle="tab"
                data-bs-target="#tab-practice" type="button" role="tab" aria-selected="false">
          <i class="bi bi-briefcase me-2"></i>Практика
        </button>
      </li>
    </ul>
  </div>

  <style>
    .schedule-tabs-wrapper {
      padding: 0.625rem 0.75rem 0 0.75rem;
    }
    .schedule-tabs-wrapper .nav-pills {
      gap: 0.375rem;
    }
    .schedule-tabs-wrapper .nav-link {
      border-radius: 0.625rem;
      padding: 0.6rem 1.25rem;
      font-weight: 500;
      font-size: 0.925rem;
      color: #4b5563;
      transition: all 0.2s ease;
    }
    .schedule-tabs-wrapper .nav-link:hover {
      color: #2563eb;
      background: rgba(37,99,235,.06);
    }
    .schedule-tabs-wrapper .nav-link.active {
      color: #fff !important;
      background: linear-gradient(135deg,#2563eb,#1d4ed8) !important;
      box-shadow: 0 2px 8px rgba(37,99,235,.3);
    }
    #tab-practice {
      min-height: 260px;
    }
  </style>

  <div class="tab-content" id="scheduleTabContent">
    <div class="tab-pane fade show active" id="tab-schedule" role="tabpanel" tabindex="0">
      <div class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Загрузка расписания…</p>
      </div>
    </div>

    <div class="tab-pane fade" id="tab-practice" role="tabpanel" tabindex="0">
      <div class="container-fluid py-4 text-center text-muted d-flex align-items-center justify-content-center" style="min-height:300px;">
        <div>
          <i class="bi bi-briefcase display-1 d-block mb-3 opacity-50"></i>
          <p class="fs-5">Раздел «Практика» в разработке</p>
        </div>
      </div>
    </div>
  </div>
`;

async function initTabs() {
    const root = document.getElementById('schedule-root');
    root.innerHTML = TABS_HTML;

    // Сразу загружаем модуль расписания (вкладка активна по умолчанию)
    try {
        const scheduleModule = await import('./schedule-handmade.js');
        const tabSchedule = document.getElementById('tab-schedule');
        await scheduleModule.init(tabSchedule);
    } catch (err) {
        console.error('Failed to load schedule module:', err);
        document.getElementById('tab-schedule').innerHTML =
            '<div class="alert alert-danger m-4">Ошибка загрузки расписания</div>';
    }

    // Практика — ленивая загрузка при первом переключении
    let practiceLoaded = false;
    const tabBtnPractice = document.getElementById('tab-btn-practice');

    tabBtnPractice.addEventListener('shown.bs.tab', async () => {
        if (practiceLoaded) return;
        practiceLoaded = true;
        try {
            const practiceModule = await import('./practice.js');
            const tabPractice = document.getElementById('tab-practice');
            await practiceModule.init(tabPractice);
        } catch (err) {
            // Модуля практики ещё нет — оставляем заглушку
            console.log('Practice module not available yet, placeholder shown.');
        }
    });
}

// Стартуем, когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
} else {
    initTabs();
}
