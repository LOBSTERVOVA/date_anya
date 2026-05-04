package com.example.rusreact2.data.models;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Data
@Table(name = "pairs")
@NoArgsConstructor(force = true)
public class Pair {
    @Id
    @Column("uuid")
    UUID uuid;
    private UUID subjectUuid;
    @Column(value = "pair_order")
    int pairOrder;
    LocalDate date;

    private UUID roomUuid;

    private Set<UUID> lecturerUuids = new HashSet<>();

    private Set<UUID> groupUuids = new HashSet<>();

    private Boolean isActive = false;

    @Override
    public int hashCode() {
        return Objects.hash(uuid);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Pair that = (Pair) o;
        return Objects.equals(uuid, that.uuid);
    }
}
