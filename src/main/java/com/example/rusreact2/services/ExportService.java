package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.ExportRequest;
import com.example.rusreact2.data.enums.EducationForm;
import com.example.rusreact2.data.models.Department;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.data.models.Lecturer;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.data.models.Room;
import com.example.rusreact2.data.models.Subject;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.GroupRepository;
import com.example.rusreact2.repositories.LecturerRepository;
import com.example.rusreact2.repositories.PairRepository;
import com.example.rusreact2.repositories.RoomRepository;
import com.example.rusreact2.repositories.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.RegionUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayOutputStream;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExportService {

    private final PairRepository pairRepository;
    private final GroupRepository groupRepository;
    private final SubjectRepository subjectRepository;
    private final RoomRepository roomRepository;
    private final LecturerRepository lecturerRepository;
    private final DepartmentRepository departmentRepository;

    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    public Mono<byte[]> exportSchedule(ExportRequest req) {
        LocalDate from = req.getFrom();
        LocalDate to = req.getTo();
        List<UUID> groupUuids = Optional.ofNullable(req.getGroups()).orElse(List.of());

        if (from == null || to == null || groupUuids.isEmpty()) {
            return Mono.just(new byte[0]);
        }

        // Нормализация: from <= to
        if (to.isBefore(from)) {
            LocalDate tmp = from;
            from = to;
            to = tmp;
        }

        // Разбиваем на недели (пн–вс)
        List<LocalDate> weekStarts = new ArrayList<>();
        LocalDate cursor = toMonday(from);
        while (!cursor.isAfter(to)) {
            weekStarts.add(cursor);
            cursor = cursor.plusWeeks(1);
        }
        if (weekStarts.isEmpty()) {
            return Mono.just(new byte[0]);
        }

        LocalDate exportFrom = weekStarts.get(0);
        LocalDate exportTo = weekStarts.get(weekStarts.size() - 1).plusDays(6);

        // 1. Загружаем группы
        Mono<Map<UUID, Group>> groupsMono = groupRepository.findAllById(groupUuids)
                .collectMap(Group::getUuid);

        // 2. Загружаем пары (groupUuids и lecturerUuids приходят прямо в сущности)
        Mono<List<Pair>> pairsMono = pairRepository
                .findByGroupUuidsAndDateBetween(groupUuids, exportFrom, exportTo)
                .collectList();

        return Mono.zip(groupsMono, pairsMono)
                .flatMap(tuple -> {
                    Map<UUID, Group> groupMap = tuple.getT1();
                    List<Pair> pairs = tuple.getT2();

                    if (pairs.isEmpty() || groupMap.isEmpty()) {
                        return Mono.just(new byte[0]);
                    }

                    // Строим маппинги pair_uuid → groupUuids / lecturerUuids прямо из Pair
                    Map<UUID, Set<UUID>> pairGroupMap = pairs.stream()
                            .collect(Collectors.toMap(Pair::getUuid, p -> p.getGroupUuids() != null
                                    ? p.getGroupUuids() : Set.of()));
                    Map<UUID, Set<UUID>> pairLecturerMap = pairs.stream()
                            .collect(Collectors.toMap(Pair::getUuid, p -> p.getLecturerUuids() != null
                                    ? p.getLecturerUuids() : Set.of()));

                    // 3. Собираем все UUIDs связанных сущностей
                    Set<UUID> subjectUuids = pairs.stream()
                            .map(Pair::getSubjectUuid).filter(Objects::nonNull)
                            .collect(Collectors.toSet());
                    Set<UUID> roomUuids = pairs.stream()
                            .map(Pair::getRoomUuid).filter(Objects::nonNull)
                            .collect(Collectors.toSet());
                    Set<UUID> allLecturerUuids = pairLecturerMap.values().stream()
                            .flatMap(Set::stream).collect(Collectors.toSet());

                    // 4. Загружаем предметы, аудитории, преподавателей
                    Mono<Map<UUID, Subject>> subjectsMono = Flux.fromIterable(subjectUuids)
                            .flatMap(subjectRepository::findById)
                            .collectMap(Subject::getUuid);

                    Mono<Map<UUID, Room>> roomsMono = Flux.fromIterable(roomUuids)
                            .flatMap(roomRepository::findById)
                            .collectMap(Room::getUuid);

                    Mono<Map<UUID, Lecturer>> lecturersMono = Flux.fromIterable(allLecturerUuids)
                            .flatMap(lecturerRepository::findById)
                            .collectMap(Lecturer::getUuid);

                    return Mono.zip(subjectsMono, roomsMono, lecturersMono)
                            .map(dataTuple -> buildExcel(
                                    weekStarts, groupUuids, groupMap, pairs,
                                    pairGroupMap, pairLecturerMap,
                                    dataTuple.getT1(), dataTuple.getT2(), dataTuple.getT3()
                            ));
                })
                // Excel-генерация — блокирующая, выносим на boundedElastic
                .subscribeOn(Schedulers.boundedElastic());
    }

    private byte[] buildExcel(
            List<LocalDate> weekStarts,
            List<UUID> orderedGroupUuids,
            Map<UUID, Group> groupMap,
            List<Pair> pairs,
            Map<UUID, Set<UUID>> pairGroupMap,
            Map<UUID, Set<UUID>> pairLecturerMap,
            Map<UUID, Subject> subjectMap,
            Map<UUID, Room> roomMap,
            Map<UUID, Lecturer> lecturerMap
    ) {
        try (Workbook wb = new XSSFWorkbook()) {

            // Стили
            CellStyle headerStyle = createHeaderStyle(wb);
            CellStyle wrapStyle = createWrapStyle(wb);
            CellStyle thinCenterStyle = createThinCenterStyle(wb);
            CellStyle verticalHeaderStyle = createVerticalHeaderStyle(wb);
            CellStyle infoStyle = createInfoStyle(wb);

            // Собираем сводку по курсам и формам обучения
            Set<Integer> courses = new TreeSet<>();
            Set<String> forms = new LinkedHashSet<>();
            for (UUID gid : orderedGroupUuids) {
                Group g = groupMap.get(gid);
                if (g != null) {
                    if (g.getCourse() > 0) courses.add(g.getCourse());
                    if (g.getEducationForm() != null) forms.add(formatEducationForm(g.getEducationForm()));
                }
            }

            for (LocalDate ws : weekStarts) {
                LocalDate weekEnd = ws.plusDays(6);
                String sheetName = ws.format(DateTimeFormatter.ofPattern("dd.MM")) + "-"
                        + weekEnd.format(DateTimeFormatter.ofPattern("dd.MM"));
                Sheet sheet = wb.createSheet(sheetName);

                int rowIdx = 0;

                // 2 пустые строки сверху
                rowIdx += 2;

                // Строка с информацией о курсах и формах обучения
                String coursesStr = courses.isEmpty() ? "" : "Курсы: " + courses.stream()
                        .map(Object::toString).collect(Collectors.joining(", "));
                String formsStr = forms.isEmpty() ? "" : "Формы обучения: " + String.join(", ", forms);
                String infoLine = coursesStr + (coursesStr.isEmpty() || formsStr.isEmpty() ? "" : "; ") + formsStr;

                Row infoRow = sheet.createRow(rowIdx);
                Cell infoCell = infoRow.createCell(0);
                infoCell.setCellStyle(infoStyle);
                infoCell.setCellValue(infoLine);
                int totalCols = 3 + orderedGroupUuids.size();
                if (totalCols > 1) {
                    sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, totalCols - 1));
                }
                rowIdx++;

                // Ещё 2 пустые строки
                rowIdx += 2;

                // === Заголовок таблицы ===
                Row header = sheet.createRow(rowIdx);
                createCell(header, 0, "День", headerStyle);
                createCell(header, 1, "Дата", headerStyle);
                createCell(header, 2, "Время", headerStyle);

                int col = 3;
                for (UUID gid : orderedGroupUuids) {
                    Group g = groupMap.get(gid);
                    String title = buildGroupHeader(g);
                    createCell(header, col++, title, headerStyle);
                }
                rowIdx++;

                // === Данные ===
                String[][] times = {
                        {"08:50", "10:20"},
                        {"10:40", "12:10"},
                        {"13:00", "14:30"},
                        {"14:50", "16:20"},
                        {"16:40", "18:10"},
                        {"18:30", "20:00"},
                };

                int startRow = rowIdx;
                for (int dayIdx = 0; dayIdx < 7; dayIdx++) {
                    LocalDate day = ws.plusDays(dayIdx);
                    int dayBlockStart = startRow + dayIdx * 6;
                    int dayBlockEnd = dayBlockStart + 5;

                    sheet.addMergedRegion(new CellRangeAddress(dayBlockStart, dayBlockEnd, 0, 0));
                    sheet.addMergedRegion(new CellRangeAddress(dayBlockStart, dayBlockEnd, 1, 1));

                    Row r = getOrCreateRow(sheet, dayBlockStart);
                    createCell(r, 0, russianDayOfWeek(day.getDayOfWeek()), verticalHeaderStyle);
                    createCell(r, 1, DF.format(day), verticalHeaderStyle);

                    for (int slot = 0; slot < 6; slot++) {
                        Row rr = getOrCreateRow(sheet, dayBlockStart + slot);
                        createCell(rr, 2, times[slot][0] + "-" + times[slot][1], thinCenterStyle);
                    }

                    CellRangeAddress dayColA = new CellRangeAddress(dayBlockStart, dayBlockEnd, 0, 0);
                    RegionUtil.setBorderRight(BorderStyle.MEDIUM, dayColA, sheet);

                    col = 3;
                    for (UUID gid : orderedGroupUuids) {
                        for (int slot = 0; slot < 6; slot++) {
                            Row rr = getOrCreateRow(sheet, dayBlockStart + slot);
                            String text = pairTextFor(pairs, gid, day, slot + 1,
                                    pairGroupMap, pairLecturerMap, subjectMap, roomMap, lecturerMap);
                            Cell c = rr.createCell(col);
                            c.setCellStyle(wrapStyle);
                            c.setCellValue(text);
                        }
                        col++;
                    }

                    int lastCol = 2 + orderedGroupUuids.size();
                    CellRangeAddress dayRect = new CellRangeAddress(dayBlockStart, dayBlockEnd, 0, lastCol);
                    RegionUtil.setBorderTop(BorderStyle.MEDIUM, dayRect, sheet);
                    RegionUtil.setBorderBottom(BorderStyle.MEDIUM, dayRect, sheet);
                    RegionUtil.setBorderLeft(BorderStyle.MEDIUM, dayRect, sheet);
                    RegionUtil.setBorderRight(BorderStyle.MEDIUM, dayRect, sheet);
                }

                for (int c = 0; c < 3 + orderedGroupUuids.size(); c++) {
                    sheet.autoSizeColumn(c);
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("[EXPORT] Failed to build Excel: {}", e.getMessage(), e);
            return new byte[0];
        }
    }

    // ======================== Helper methods ========================

    private String pairTextFor(
            List<Pair> pairs, UUID groupUuid, LocalDate day, int pairOrder,
            Map<UUID, Set<UUID>> pairGroupMap,
            Map<UUID, Set<UUID>> pairLecturerMap,
            Map<UUID, Subject> subjectMap,
            Map<UUID, Room> roomMap,
            Map<UUID, Lecturer> lecturerMap
    ) {
        for (Pair p : pairs) {
            Set<UUID> pairGroups = pairGroupMap.getOrDefault(p.getUuid(), Set.of());
            if (!pairGroups.contains(groupUuid)) continue;
            if (!Objects.equals(p.getDate(), day)) continue;
            if (p.getPairOrder() != pairOrder) continue;

            StringBuilder sb = new StringBuilder();

            Subject subject = p.getSubjectUuid() != null ? subjectMap.get(p.getSubjectUuid()) : null;
            if (subject != null && subject.getName() != null && !subject.getName().isBlank()) {
                sb.append(subject.getName());
            }

            Set<UUID> lecUuids = pairLecturerMap.getOrDefault(p.getUuid(), Set.of());
            if (!lecUuids.isEmpty()) {
                String lecNames = lecUuids.stream()
                        .map(lecturerMap::get)
                        .filter(Objects::nonNull)
                        .map(l -> joinNonBlank(" ", safe(l.getLastName()), safe(l.getFirstName()), safe(l.getPatronymic())))
                        .filter(s -> !s.isBlank())
                        .collect(Collectors.joining(", "));
                if (!lecNames.isBlank()) {
                    if (sb.length() > 0) sb.append(", ");
                    sb.append(lecNames);
                }
            }

            Room room = p.getRoomUuid() != null ? roomMap.get(p.getRoomUuid()) : null;
            if (room != null && room.getTitle() != null && !room.getTitle().isBlank()) {
                if (sb.length() > 0) sb.append(" — ");
                sb.append(room.getTitle());
            }

            return sb.toString();
        }
        return "";
    }

    private String buildGroupHeader(Group g) {
        if (g == null) return "";
        StringBuilder sb = new StringBuilder();
        sb.append(g.getGroupName() != null ? g.getGroupName() : "");

        String extra = (g.getSpecialization() != null && !g.getSpecialization().isBlank())
                ? g.getSpecialization()
                : (g.getDirection() != null && !g.getDirection().isBlank())
                        ? g.getDirection()
                        : "";
        if (!extra.isBlank()) {
            sb.append("\n").append(extra);
        }
        return sb.toString();
    }

    private String formatEducationForm(EducationForm form) {
        return switch (form) {
            case FULL_TIME -> "Очная";
            case PART_TIME -> "Заочная";
            case MIXED -> "Очно-заочная";
        };
    }

    private static String safe(String s) { return s == null ? "" : s; }

    private static String joinNonBlank(String delimiter, String... parts) {
        return Arrays.stream(parts).filter(p -> p != null && !p.isBlank())
                .collect(Collectors.joining(delimiter));
    }

    private static String russianDayOfWeek(DayOfWeek d) {
        return switch (d) {
            case MONDAY -> "Понедельник";
            case TUESDAY -> "Вторник";
            case WEDNESDAY -> "Среда";
            case THURSDAY -> "Четверг";
            case FRIDAY -> "Пятница";
            case SATURDAY -> "Суббота";
            case SUNDAY -> "Воскресенье";
        };
    }

    private static LocalDate toMonday(LocalDate date) {
        LocalDate d = date;
        while (d.getDayOfWeek() != DayOfWeek.MONDAY) d = d.minusDays(1);
        return d;
    }

    private static Row getOrCreateRow(Sheet sheet, int idx) {
        Row r = sheet.getRow(idx);
        if (r == null) r = sheet.createRow(idx);
        return r;
    }

    private static void createCell(Row row, int col, String value, CellStyle style) {
        Cell c = row.createCell(col);
        if (style != null) c.setCellStyle(style);
        c.setCellValue(value);
    }

    // ======================== Excel styles ========================

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font bold = wb.createFont();
        bold.setBold(true);
        style.setFont(bold);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        style.setBorderTop(BorderStyle.MEDIUM);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderLeft(BorderStyle.MEDIUM);
        style.setBorderRight(BorderStyle.MEDIUM);
        return style;
    }

    private CellStyle createWrapStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setWrapText(true);
        style.setVerticalAlignment(VerticalAlignment.TOP);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createThinCenterStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createVerticalHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font bold = wb.createFont();
        bold.setBold(true);
        style.setFont(bold);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        style.setRotation((short) 90);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createInfoStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    // ======================== Export for lecturers ========================

    public Mono<byte[]> exportScheduleForLecturers(ExportRequest req) {
        LocalDate from = req.getFrom();
        LocalDate to = req.getTo();
        UUID departmentUuid = req.getDepartmentUuid();

        if (from == null || to == null || departmentUuid == null) {
            return Mono.just(new byte[0]);
        }

        if (to.isBefore(from)) {
            LocalDate tmp = from; from = to; to = tmp;
        }

        List<LocalDate> weekStarts = new ArrayList<>();
        LocalDate cursor = toMonday(from);
        while (!cursor.isAfter(to)) {
            weekStarts.add(cursor);
            cursor = cursor.plusWeeks(1);
        }
        if (weekStarts.isEmpty()) {
            return Mono.just(new byte[0]);
        }

        LocalDate exportFrom = weekStarts.get(0);
        LocalDate exportTo = weekStarts.get(weekStarts.size() - 1).plusDays(6);

        // 1. Загружаем преподавателей кафедры
        Mono<List<Lecturer>> lecturersMono = lecturerRepository.findByDepartmentUuid(departmentUuid)
                .collectList();

        // 2. Загружаем кафедру (для названия)
        Mono<Department> deptMono = departmentRepository.findById(departmentUuid);

        return Mono.zip(lecturersMono, deptMono)
                .flatMap(tuple -> {
                    List<Lecturer> lecturers = tuple.getT1();
                    Department department = tuple.getT2();

                    if (lecturers.isEmpty()) {
                        return Mono.just(new byte[0]);
                    }

                    List<UUID> lecturerUuids = lecturers.stream()
                            .map(Lecturer::getUuid).collect(Collectors.toList());
                    Map<UUID, Lecturer> lecturerMap = lecturers.stream()
                            .collect(Collectors.toMap(Lecturer::getUuid, l -> l));

                    // 3. Загружаем пары
                    return pairRepository
                            .findByLecturerUuidsAndDateBetween(lecturerUuids, exportFrom, exportTo)
                            .collectList()
                            .flatMap(pairs -> {
                                if (pairs.isEmpty()) {
                                    return Mono.just(new byte[0]);
                                }

                                // Маппинги из Pair
                                Map<UUID, Set<UUID>> pairGroupMap = pairs.stream()
                                        .collect(Collectors.toMap(Pair::getUuid, p -> p.getGroupUuids() != null
                                                ? p.getGroupUuids() : Set.of()));
                                Map<UUID, Set<UUID>> pairLecturerMap = pairs.stream()
                                        .collect(Collectors.toMap(Pair::getUuid, p -> p.getLecturerUuids() != null
                                                ? p.getLecturerUuids() : Set.of()));

                                // Собираем связанные UUIDs
                                Set<UUID> subjectUuids = pairs.stream()
                                        .map(Pair::getSubjectUuid).filter(Objects::nonNull)
                                        .collect(Collectors.toSet());
                                Set<UUID> roomUuids = pairs.stream()
                                        .map(Pair::getRoomUuid).filter(Objects::nonNull)
                                        .collect(Collectors.toSet());
                                Set<UUID> allGroupUuids = pairGroupMap.values().stream()
                                        .flatMap(Set::stream).collect(Collectors.toSet());

                                Mono<Map<UUID, Subject>> subjectsMono = Flux.fromIterable(subjectUuids)
                                        .flatMap(subjectRepository::findById)
                                        .collectMap(Subject::getUuid);
                                Mono<Map<UUID, Room>> roomsMono = Flux.fromIterable(roomUuids)
                                        .flatMap(roomRepository::findById)
                                        .collectMap(Room::getUuid);
                                Mono<Map<UUID, Group>> groupsMono = Flux.fromIterable(allGroupUuids)
                                        .flatMap(groupRepository::findById)
                                        .collectMap(Group::getUuid);

                                return Mono.zip(subjectsMono, roomsMono, groupsMono)
                                        .map(dataTuple -> buildExcelForLecturers(
                                                weekStarts, lecturerUuids, lecturerMap, department,
                                                pairs, pairGroupMap, pairLecturerMap,
                                                dataTuple.getT1(), dataTuple.getT2(), dataTuple.getT3()
                                        ));
                            });
                }).subscribeOn(Schedulers.boundedElastic());
    }

    private byte[] buildExcelForLecturers(
            List<LocalDate> weekStarts,
            List<UUID> orderedLecturerUuids,
            Map<UUID, Lecturer> lecturerMap,
            Department department,
            List<Pair> pairs,
            Map<UUID, Set<UUID>> pairGroupMap,
            Map<UUID, Set<UUID>> pairLecturerMap,
            Map<UUID, Subject> subjectMap,
            Map<UUID, Room> roomMap,
            Map<UUID, Group> groupMap
    ) {
        try (Workbook wb = new XSSFWorkbook()) {

            CellStyle headerStyle = createHeaderStyle(wb);
            CellStyle wrapStyle = createWrapStyle(wb);
            CellStyle thinCenterStyle = createThinCenterStyle(wb);
            CellStyle verticalHeaderStyle = createVerticalHeaderStyle(wb);
            CellStyle infoStyle = createInfoStyle(wb);

            for (LocalDate ws : weekStarts) {
                LocalDate weekEnd = ws.plusDays(6);
                String sheetName = ws.format(DateTimeFormatter.ofPattern("dd.MM")) + "-"
                        + weekEnd.format(DateTimeFormatter.ofPattern("dd.MM"));
                Sheet sheet = wb.createSheet(sheetName);

                int rowIdx = 0;
                rowIdx += 2;

                // Информационная строка
                String deptName = department.getName() != null ? department.getName() : "";
                Row infoRow = sheet.createRow(rowIdx);
                Cell infoCell = infoRow.createCell(0);
                infoCell.setCellStyle(infoStyle);
                infoCell.setCellValue("Кафедра: " + deptName);
                int totalCols = 3 + orderedLecturerUuids.size();
                if (totalCols > 1) {
                    sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, totalCols - 1));
                }
                rowIdx += 3; // +2 пустые строки после инфо

                // Заголовок таблицы
                Row header = sheet.createRow(rowIdx);
                createCell(header, 0, "День", headerStyle);
                createCell(header, 1, "Дата", headerStyle);
                createCell(header, 2, "Время", headerStyle);

                int col = 3;
                for (UUID luuid : orderedLecturerUuids) {
                    Lecturer l = lecturerMap.get(luuid);
                    String title = l != null
                            ? joinNonBlank(" ", safe(l.getLastName()), safe(l.getFirstName()), safe(l.getPatronymic()))
                            : luuid.toString();
                    createCell(header, col++, title, headerStyle);
                }
                rowIdx++;

                // Данные
                String[][] times = {
                        {"08:50", "10:20"},
                        {"10:40", "12:10"},
                        {"13:00", "14:30"},
                        {"14:50", "16:20"},
                        {"16:40", "18:10"},
                        {"18:30", "20:00"},
                };

                int startRow = rowIdx;
                for (int dayIdx = 0; dayIdx < 7; dayIdx++) {
                    LocalDate day = ws.plusDays(dayIdx);
                    int dayBlockStart = startRow + dayIdx * 6;
                    int dayBlockEnd = dayBlockStart + 5;

                    sheet.addMergedRegion(new CellRangeAddress(dayBlockStart, dayBlockEnd, 0, 0));
                    sheet.addMergedRegion(new CellRangeAddress(dayBlockStart, dayBlockEnd, 1, 1));

                    Row r = getOrCreateRow(sheet, dayBlockStart);
                    createCell(r, 0, russianDayOfWeek(day.getDayOfWeek()), verticalHeaderStyle);
                    createCell(r, 1, DF.format(day), verticalHeaderStyle);

                    for (int slot = 0; slot < 6; slot++) {
                        Row rr = getOrCreateRow(sheet, dayBlockStart + slot);
                        createCell(rr, 2, times[slot][0] + "-" + times[slot][1], thinCenterStyle);
                    }

                    CellRangeAddress dayColA = new CellRangeAddress(dayBlockStart, dayBlockEnd, 0, 0);
                    RegionUtil.setBorderRight(BorderStyle.MEDIUM, dayColA, sheet);

                    col = 3;
                    for (UUID luuid : orderedLecturerUuids) {
                        for (int slot = 0; slot < 6; slot++) {
                            Row rr = getOrCreateRow(sheet, dayBlockStart + slot);
                            String text = pairTextForLecturer(pairs, luuid, day, slot + 1,
                                    pairGroupMap, pairLecturerMap,
                                    subjectMap, roomMap, groupMap);
                            Cell c = rr.createCell(col);
                            c.setCellStyle(wrapStyle);
                            c.setCellValue(text);
                        }
                        col++;
                    }

                    int lastCol = 2 + orderedLecturerUuids.size();
                    CellRangeAddress dayRect = new CellRangeAddress(dayBlockStart, dayBlockEnd, 0, lastCol);
                    RegionUtil.setBorderTop(BorderStyle.MEDIUM, dayRect, sheet);
                    RegionUtil.setBorderBottom(BorderStyle.MEDIUM, dayRect, sheet);
                    RegionUtil.setBorderLeft(BorderStyle.MEDIUM, dayRect, sheet);
                    RegionUtil.setBorderRight(BorderStyle.MEDIUM, dayRect, sheet);
                }

                for (int c = 0; c < 3 + orderedLecturerUuids.size(); c++) {
                    sheet.autoSizeColumn(c);
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("[EXPORT-LECTURER] Failed to build Excel: {}", e.getMessage(), e);
            return new byte[0];
        }
    }

    private String pairTextForLecturer(
            List<Pair> pairs, UUID lecturerUuid, LocalDate day, int pairOrder,
            Map<UUID, Set<UUID>> pairGroupMap,
            Map<UUID, Set<UUID>> pairLecturerMap,
            Map<UUID, Subject> subjectMap,
            Map<UUID, Room> roomMap,
            Map<UUID, Group> groupMap
    ) {
        for (Pair p : pairs) {
            Set<UUID> lecUuids = pairLecturerMap.getOrDefault(p.getUuid(), Set.of());
            if (!lecUuids.contains(lecturerUuid)) continue;
            if (!Objects.equals(p.getDate(), day)) continue;
            if (p.getPairOrder() != pairOrder) continue;

            StringBuilder sb = new StringBuilder();

            Subject subject = p.getSubjectUuid() != null ? subjectMap.get(p.getSubjectUuid()) : null;
            if (subject != null && subject.getName() != null && !subject.getName().isBlank()) {
                sb.append(subject.getName());
            }

            // Группы
            Set<UUID> groupUuids = pairGroupMap.getOrDefault(p.getUuid(), Set.of());
            if (!groupUuids.isEmpty()) {
                String groupNames = groupUuids.stream()
                        .map(groupMap::get)
                        .filter(Objects::nonNull)
                        .map(Group::getGroupName)
                        .filter(Objects::nonNull)
                        .collect(Collectors.joining(", "));
                if (!groupNames.isBlank()) {
                    if (sb.length() > 0) sb.append(", ");
                    sb.append(groupNames);
                }
            }

            Room room = p.getRoomUuid() != null ? roomMap.get(p.getRoomUuid()) : null;
            if (room != null && room.getTitle() != null && !room.getTitle().isBlank()) {
                if (sb.length() > 0) sb.append(" — ");
                sb.append(room.getTitle());
            }

            return sb.toString();
        }
        return "";
    }
}
