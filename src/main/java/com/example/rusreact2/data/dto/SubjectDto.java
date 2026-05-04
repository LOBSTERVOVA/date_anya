package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.models.Subject;
import lombok.Data;

import java.util.UUID;

@Data
public class SubjectDto {
    UUID uuid;
    String name;
    String description;
    DepartmentDto department;

    public SubjectDto minimumSubjectDto(Subject subject) {
        SubjectDto dto = new SubjectDto();
        dto.uuid = subject.getUuid();
        dto.name = subject.getName();
        dto.description = subject.getDescription();
        return dto;
    }

    public SubjectDto fullSubjectDto(Subject subject, DepartmentDto department) {
        SubjectDto dto = minimumSubjectDto(subject);
        dto.setDepartment(department);
        return dto;
    }
}
