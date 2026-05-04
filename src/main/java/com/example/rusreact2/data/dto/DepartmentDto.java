package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.models.Department;
import lombok.Data;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Data
public class DepartmentDto {
    UUID uuid;
    String name;
    String description;
    private Set<RoomDto> rooms = new HashSet<>();
    Set<LecturerDto> lecturers = new HashSet<>();
    Set<SubjectDto> subjects = new HashSet<>();

    public DepartmentDto minimumDepartmentDto(Department department) {
        DepartmentDto dto = new DepartmentDto();
        dto.setUuid(department.getUuid());
        dto.setName(department.getName());
        dto.setDescription(department.getDescription());
        return dto;
    }

    public DepartmentDto fullDepartmentDto(Department department, Set<RoomDto> rooms, Set<LecturerDto> lecturers, Set<SubjectDto> subjects) {
        DepartmentDto dto = minimumDepartmentDto(department);
        dto.setRooms(rooms);
        dto.setLecturers(lecturers);
        dto.setSubjects(subjects);
        return dto;
    }
}
