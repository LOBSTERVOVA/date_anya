package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.data.enums.LessonType;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class PairDto {
    UUID uuid = null;
    SubjectDto subject;
    int pairOrder;
    LocalDate date;
    RoomDto room = null;
    List<LecturerDto> lecturers = null;
    List<GroupDto> groups = null;
    Boolean isActive = false;
    LessonType type;

    public PairDto minimumPairDto(Pair pair, SubjectDto subject, RoomDto room, List<LecturerDto> lecturers, List<GroupDto> groups) {
        PairDto pairDto = new PairDto();
        pairDto.setUuid(pair.getUuid());
        pairDto.setSubject(subject);
        pairDto.setPairOrder(pair.getPairOrder());
        pairDto.setDate(pair.getDate());
        pairDto.setRoom(room);
        pairDto.setLecturers(lecturers);
        pairDto.setGroups(groups);
        pairDto.setIsActive(pair.getIsActive());
        pairDto.setType(pair.getType());
        return pairDto;
    }

//    public PairDto fullPairDto(Pair pair, SubjectDto subject, RoomDto room, LecturerDto lecturer) {
//        PairDto pairDto = minimumPairDto(pair, subject, room);
//        pairDto.setLecturer(lecturer); // Для обратной совместимости
//
//        // Заполняем список преподавателей
//        if (!pair.getLecturers().isEmpty()) {
//            List<LecturerDto> lecturerDtos = pair.getLecturers().stream()
//                .map(l -> new LecturerDto().fullLecturerDto(l))
//                .toList();
//            pairDto.setLecturers(lecturerDtos);
//
//            // Если lecturer не установлен, берем первого для обратной совместимости
//            if (pairDto.getLecturer() == null && !lecturerDtos.isEmpty()) {
//                pairDto.setLecturer(lecturerDtos.get(0));
//            }
//        }
//
//        pairDto.setGroup(new GroupDto().minimumGroupDto(pair.getGroup()));
//        return pairDto;
//    }
}
