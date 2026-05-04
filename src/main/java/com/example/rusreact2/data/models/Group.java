package com.example.rusreact2.data.models;

import com.example.rusreact2.data.enums.EducationForm;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Data
@Table(name = "groups")
@NoArgsConstructor(force = true)
public class Group {
    @Id
    @Column("uuid")
    UUID uuid;

    @Column(value = "group_name")
    private String groupName; // например c1-01-20

    @Column(value = "external_id")
    String externalId;
    private String faculty;
    private int course;
    @Column(value = "education_form")
    private EducationForm educationForm; // очная или заочная
    private String direction;
    private String specialization; // например спортивная подготовка по видам спорта «каратэдо», «киокусинкай», «ушу». Педагогическая деятельность в области физической культуры и спорта

    @Column(value = "kind_of_sport")
    private Set<String> kindsOfSports = new HashSet<>();


    private Set<UUID> pairUuids = new HashSet<>();

    @Override
    public int hashCode() {
        return Objects.hash(uuid);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Group that = (Group) o;
        return Objects.equals(uuid, that.uuid);
    }
}
