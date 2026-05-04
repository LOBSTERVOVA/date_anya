package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.enums.AcademicTitle;
import com.example.rusreact2.data.models.Lecturer;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class LecturerDto {
    UUID uuid = null;
    String avatar = null;
    String firstName;
    String lastName;
    String patronymic = null;
    LocalDate birthDate = null;
    LocalDate closestLesson = null;
    AcademicTitle academicTitle;
    // new optional fields
    String description;
    String phone;
    String email;
    String room;
    String academicDegree;
    @JsonProperty("isLabHead")
    boolean labHead;
    DepartmentDto department = null;
    @JsonProperty("isHead")
    boolean isHead;

    public LecturerDto minimumLecturerDto(Lecturer lecturer) {
        LecturerDto dto = new LecturerDto();
        dto.uuid = lecturer.getUuid();
        dto.avatar = lecturer.getAvatar();
        dto.firstName = lecturer.getFirstName();
        dto.lastName = lecturer.getLastName();
        dto.patronymic = lecturer.getPatronymic();
        dto.birthDate = lecturer.getBirthDate();
        dto.closestLesson = lecturer.getClosestLesson();
        dto.academicTitle = lecturer.getAcademicTitle();
        dto.description = lecturer.getDescription();
        dto.phone = lecturer.getPhone();
        dto.email = lecturer.getEmail();
        dto.room = lecturer.getRoom();
        dto.academicDegree = lecturer.getAcademicDegree();
        dto.labHead = lecturer.isLabHead();
        dto.isHead = lecturer.isHead();
        return dto;
    }

    public LecturerDto fullLecturerDto(Lecturer lecturer, DepartmentDto departmentDto) {
        LecturerDto dto = minimumLecturerDto(lecturer);
        dto.setDepartment(departmentDto);
        return dto;
    }
}
