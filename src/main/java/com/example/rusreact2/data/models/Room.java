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
@Table(name = "rooms")
@NoArgsConstructor(force = true)
public class Room {
    @Id
    @Column("uuid")
    UUID uuid;
    String title;

    @Override
    public int hashCode() {
        return Objects.hash(uuid);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Room that = (Room) o;
        return Objects.equals(uuid, that.uuid);
    }
}
