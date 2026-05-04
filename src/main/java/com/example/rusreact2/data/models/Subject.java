package com.example.rusreact2.data.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.util.Objects;
import java.util.UUID;

@Data
@Table(name = "subjects")
@NoArgsConstructor(force = true)
public class Subject {
    @Id
    @Column("uuid")
    UUID uuid;
    @Column(value = "external_id")
    String externalId;

    String name;

    String description;

    @Column(value = "department_external_id")
    String departmentExternalId;

    @Column(value = "department_uuid")
    private UUID departmentUuid;

    @Override
    public int hashCode() {
        return Objects.hash(uuid);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Subject that = (Subject) o;
        return Objects.equals(uuid, that.uuid);
    }
}
