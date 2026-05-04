package com.example.rusreact2.data.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Data
@Table(name = "departments")
@NoArgsConstructor(force = true)
public class Department {
    @Id
    @Column("uuid")
    UUID uuid;
    @Column(value = "external_id")
    String externalId;
    String name;
    String description;
    private Set<UUID> roomUuids = new HashSet<>();
    Set<UUID> lecturerUuids = new HashSet<>();
    Set<UUID> subjectUuids = new HashSet<>();

    @Override
    public int hashCode() {
        return Objects.hash(uuid);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Department that = (Department) o;
        return Objects.equals(uuid, that.uuid);
    }
}
