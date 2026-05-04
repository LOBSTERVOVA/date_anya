// ==================== ФИКСИРОВАННЫЙ ПОЛЗУНОК ПРОКРУТКИ ====================

/**
 * Создает фиксированный ползунок для горизонтальной прокрутки таблицы
 * Ползунок всегда виден внизу экрана и управляет прокруткой таблицы
 */
export function createFixedScrollbar() {
    console.log('createFixedScrollbar START');

    // Проверяем, есть ли таблица
    const table = document.getElementById('schedule-grid-table');
    if (!table) return;

    const container = document.getElementById('schedule-grid');
    if (!container) return;

    // Создаем контейнер для фиксированного ползунка
    let scrollbarContainer = document.getElementById('fixed-scrollbar-container');
    if (!scrollbarContainer) {
        scrollbarContainer = document.createElement('div');
        scrollbarContainer.id = 'fixed-scrollbar-container';
        scrollbarContainer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 20px;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      z-index: 1000;
      display: none;
      overflow-x: auto;
      overflow-y: hidden;
    `;
        document.body.appendChild(scrollbarContainer);
    }

    // Создаем внутренний элемент для ширины таблицы
    let scrollbarContent = document.getElementById('fixed-scrollbar-content');
    if (!scrollbarContent) {
        scrollbarContent = document.createElement('div');
        scrollbarContent.id = 'fixed-scrollbar-content';
        scrollbarContent.style.cssText = `
      height: 1px;
      background: transparent;
    `;
        scrollbarContainer.appendChild(scrollbarContent);
    }

    // Функция обновления ползунка
    function updateFixedScrollbar() {
        const tableWidth = table.offsetWidth;
        const containerWidth = container.offsetWidth;

        // Показываем ползунок только если таблица шире контейнера
        if (tableWidth <= containerWidth) {
            scrollbarContainer.style.display = 'none';
            return;
        }

        // Проверяем, видна ли нижняя граница таблицы на экране
        const tableRect = table.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Если нижняя граница таблицы видна (с небольшим запасом), скрываем ползунок
        if (tableRect.bottom <= viewportHeight + 50) { // +50px запас
            scrollbarContainer.style.display = 'none';
        } else {
            // Иначе показываем ползунок
            scrollbarContainer.style.display = 'block';
            scrollbarContent.style.width = tableWidth + 'px';
        }
    }

    // Синхронизация прокрутки
    scrollbarContainer.addEventListener('scroll', () => {
        container.scrollLeft = scrollbarContainer.scrollLeft;
    });

    // Обновляем при изменении размера окна
    window.addEventListener('resize', updateFixedScrollbar);

    // Обновляем при прокрутке страницы (для проверки видимости нижней границы таблицы)
    window.addEventListener('scroll', updateFixedScrollbar);

    // Обновляем при прокрутке контейнера таблицы
    container.addEventListener('scroll', () => {
        if (scrollbarContainer.style.display !== 'none') {
            scrollbarContainer.scrollLeft = container.scrollLeft;
        }
        // Также обновляем видимость ползунка при прокрутке
        updateFixedScrollbar();
    });

    // Обновляем при изменении таблицы (например, при добавлении кафедр)
    const observer = new MutationObserver(() => {
        setTimeout(updateFixedScrollbar, 100); // Небольшая задержка для рендеринга
    });

    observer.observe(table, {
        childList: true,
        subtree: true,
        attributes: true
    });

    // Первоначальное обновление
    setTimeout(updateFixedScrollbar, 100);

    console.log('Fixed scrollbar created');
}

/**
 * Инициализирует фиксированный ползунок
 */
export function initFixedScrollbar() {
    // Ждем загрузки DOM и таблицы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFixedScrollbar);
    } else {
        createFixedScrollbar();
    }
}

/**
 * Делает колонки таблицы изменяемыми по ширине и высоте строк
 * @param {string} tableId - ID таблицы
 */
export function makeTableColumnsResizable(tableId) {
    console.log('makeTableColumnsResizable START for table:', tableId);

    const table = document.getElementById(tableId);
    if (!table) {
        console.error('Table not found:', tableId);
        return;
    }

    const container = table.parentElement;
    const ths = table.querySelectorAll('th[id^="resizeableTh-"]');

    // Изменение ширины колонок
    ths.forEach((th) => {
        const thId = th.id;
        const columnId = thId.replace('Th', 'Td');
        const columnSelector = `.${columnId}`;
        let startX;
        let startWidth;

        th.addEventListener('mousedown', (e) => {
            if (e.target !== th) return;

            startX = e.pageX;
            startWidth = th.offsetWidth;

            function handleMouseMove(e) {
                const deltaX = e.pageX - startX;
                const newWidth = Math.max(50, startWidth + deltaX);

                // Устанавливаем фиксированную ширину для заголовка
                th.style.width = newWidth + 'px';
                th.style.minWidth = newWidth + 'px';
                th.style.maxWidth = newWidth + 'px';

                // Применяем ту же ширину ко всем ячейкам колонки
                const associatedTds = document.querySelectorAll(columnSelector);
                associatedTds.forEach((td) => {
                    td.style.width = newWidth + 'px';
                    td.style.minWidth = newWidth + 'px';
                    td.style.maxWidth = newWidth + 'px';
                });

                // Устанавливаем table-layout: fixed для таблицы
                table.style.tableLayout = 'fixed';

                // Обеспечиваем горизонтальный скролл
                if (container) {
                    container.style.overflowX = 'auto';
                }
            }

            function handleMouseUp() {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });

        th.style.cursor = 'col-resize';
    });

    // Изменение высоты строк через ячейки с номерами пар
    const pairTds = table.querySelectorAll('td.resizeableTd-pair');

    pairTds.forEach((td) => {
        let startY;
        let startHeight;
        let targetRow = td.parentElement;

        td.addEventListener('mousedown', (e) => {
            // Проверяем что курсор у нижней границы ячейки (для изменения высоты)
            const rect = td.getBoundingClientRect();
            const isNearBottom = e.clientY > rect.bottom - 5;

            if (!isNearBottom) return; // Изменяем высоту только при клике у нижней границы

            startY = e.clientY;
            startHeight = targetRow.offsetHeight;

            // Получаем только текущую строку для изменения высоты
            const currentRow = td.parentElement;

            function handleMouseMove(e) {
                const deltaY = e.clientY - startY;
                const newHeight = Math.max(40, startHeight + deltaY); // Минимальная высота 40px

                // Применяем новую высоту только к текущей строке
                currentRow.style.height = newHeight + 'px';
                currentRow.style.minHeight = newHeight + 'px';
                currentRow.style.maxHeight = newHeight + 'px';

                // Применяем высоту ко всем ячейкам в текущей строке
                const cells = currentRow.querySelectorAll('td');
                cells.forEach((cell) => {
                    cell.style.height = newHeight + 'px';
                    cell.style.minHeight = newHeight + 'px';
                    cell.style.maxHeight = newHeight + 'px';
                    // Важно: скрываем контент который не помещается
                    cell.style.overflow = 'hidden';
                });

                // Также применяем overflow к контейнерам с парами в текущей строке
                const scrollContainers = currentRow.querySelectorAll('.cell-scroll');
                scrollContainers.forEach((container) => {
                    container.style.height = (newHeight - 4) + 'px'; // Учитываем padding ячейки
                    container.style.maxHeight = (newHeight - 4) + 'px';
                    container.style.overflowY = 'auto';
                    container.style.overflowX = 'hidden';
                    container.style.boxSizing = 'border-box';
                });
            }

            function handleMouseUp() {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });

        // Устанавливаем курсор при наведении на нижнюю границу
        td.addEventListener('mousemove', (e) => {
            const rect = td.getBoundingClientRect();
            const isNearBottom = e.clientY > rect.bottom - 5;
            td.style.cursor = isNearBottom ? 'row-resize' : 'default';
        });

        td.addEventListener('mouseleave', () => {
            td.style.cursor = 'default';
        });
    });

    console.log('makeTableColumnsResizable COMPLETE - columns and rows resizable');
}