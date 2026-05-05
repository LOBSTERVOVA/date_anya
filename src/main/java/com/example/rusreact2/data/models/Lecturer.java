package com.example.rusreact2.data.models;

import com.example.rusreact2.data.enums.AcademicTitle;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Data
@Table(name = "lecturers")
@NoArgsConstructor(force = true)
public class Lecturer {
    @Id
    @Column("uuid")
    UUID uuid;
    @Column(value = "external_id")
    String externalId;
    String avatar;
    String firstName;
    String lastName;
    String patronymic;
    LocalDate birthDate;
    AcademicTitle academicTitle;
    @Column(value = "is_head")
    @JsonProperty("isHead")
    boolean isHead = false;
    @Column(value = "closest_lesson")
    LocalDate closestLesson;
    String description;
    String phone;
    String email;
    @Column(value = "office_room")
    String room;
    String academicDegree;
    @Column(value = "is_lab_head")
    @JsonProperty("isLabHead")
    boolean labHead = false;

    private UUID departmentUuid;

    // Добавляем обратную связь с Pair
    private Set<UUID> pairUuids = new HashSet<>();

    @Override
    public int hashCode() {
        return Objects.hash(uuid);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Lecturer that = (Lecturer) o;
        return Objects.equals(uuid, that.uuid);
    }
}
