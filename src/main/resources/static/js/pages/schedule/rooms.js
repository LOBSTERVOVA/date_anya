// Таблица занятости аудиторий (глобальная функция, вызывается из schedule-handmade.js)

function renderRoomsTable(pairs, rooms) {
    const container = document.getElementById('rooms-table-container');
    if (!container || !rooms?.length) return;

    // Сортировка: по числовому значению названия (101, 102, ..., 201, ...), остальное в конец
    const sorted = [...rooms].sort((a, b) => {
        const na = parseInt(a.title || a.name || '0');
        const nb = parseInt(b.title || b.name || '0');
        return (isNaN(na) ? Infinity : na) - (isNaN(nb) ? Infinity : nb);
    });

    const days = ['Пн','Вт','Ср','Чт','Пт','Сб'];
    const daysFull = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
    const lessons = ['8:50-10:20','10:40-12:10','13:00-14:30','14:50-16:20','16:40-18:10','18:30-20:00','20:20-21:50','22:10-23:40'];

    let h = '<h6 class="text-muted mb-3">Занятость аудиторий</h6>';
    h += '<div class="table-responsive"><table class="table table-bordered align-middle mb-0" id="rooms-table">';
    h += '<thead class="table-light"><tr id="rooms-header-row">';
    h += '<th style="width:55px;min-width:55px;max-width:55px">День</th>';
    h += '<th style="width:95px;min-width:95px;max-width:95px">Пара</th>';
    sorted.forEach(r => h += `<th class="text-center overflow-hidden no-select p-0" style="min-width:70px;max-width:70px;width:70px;font-size:0.8rem">${r.title || r.name || ''}</th>`);
    h += '</tr></thead><tbody>';

    days.forEach((dayShort, di) => {
        for (let p = 1; p <= 8; p++) {
            h += '<tr>';
            if (p === 1) h += `<td rowspan="8" class="align-middle text-center fw-semibold" style="font-size:0.8rem;width:55px;min-width:55px;max-width:55px" title="${daysFull[di]}">${dayShort}</td>`;
            h += `<td class="text-center p-1" style="font-size:0.7rem;width:95px;min-width:95px;max-width:95px"><strong>${p}</strong><br><span class="text-muted" style="font-size:0.6rem">${lessons[p-1]}</span></td>`;
            sorted.forEach(room => {
                const found = pairs.filter(pair => {
                    if (!pair.date || pair.pairOrder !== p) return false;
                    const d = new Date(pair.date + 'T00:00:00');
                    const pairDay = d.getDay() === 0 ? 6 : d.getDay() - 1;
                    return pairDay === di && pair.room?.uuid === room.uuid;
                });
                h += '<td class="p-1" style="vertical-align:top;font-size:0.7rem">';
                if (found.length) {
                    const pair = found[0];
                    h += `<div class="row d-flex" style="font-size:0.7rem">`;
                    h += `<div class="col-12 text-primary" style="font-size:0.72rem">${pair.subject?.name || ''}</div>`;
                    h += `<div class="col-12" style="font-size:0.65rem">Групп: ${pair.groups?.length || 0}</div>`;
                    h += `<div class="col-12 text-muted" style="font-size:0.6rem">Преп: ${pair.lecturers?.length || 0}</div></div>`;
                } else {
                    h += '<div class="text-muted text-center" style="font-size:0.7rem">—</div>';
                }
                h += '</td>';
            });
            h += '</tr>';
        }
    });

    h += '</tbody></table></div>';
    container.innerHTML = h;

    makeRoomsTableResizable();
}

// Возможность менять ширину столбцов аудиторий
function makeRoomsTableResizable() {
    let dragging = null;

    $(document)
        .on('mouseenter', '#rooms-header-row th', function() { $(this).css('cursor','col-resize'); })
        .on('mousedown', '#rooms-header-row th', function(e) {
            if (e.offsetX < $(this).width() - 10) return;
            dragging = { el: this, x: e.pageX, w: $(this).width() };
            $('body').css('cursor','col-resize');
            e.preventDefault();
            return false;
        })
        .on('mousemove', function(e) {
            if (!dragging) return;
            e.preventDefault();
            const newWidth = Math.max(40, dragging.w + (e.pageX - dragging.x));
            $(dragging.el).css({ 'min-width': newWidth+'px', 'max-width': newWidth+'px', 'width': newWidth+'px' });
        })
        .on('mouseup', function() {
            if (dragging) { $('body').css('cursor',''); dragging = null; }
        });
}
