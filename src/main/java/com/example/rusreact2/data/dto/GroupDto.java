package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.enums.EducationForm;
import com.example.rusreact2.data.models.Group;
import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
public class GroupDto {
    UUID uuid;
    String faculty;
    int course;
    EducationForm educationForm;
    String direction;
    String groupName;
    String specialization;
    Set<String> kindsOfSports;
    Set<PairDto> pairs = null;

    public GroupDto minimumGroupDto(Group group) {
        GroupDto groupDto = new GroupDto();
        groupDto.setUuid(group.getUuid());
        groupDto.setFaculty(group.getFaculty());
        groupDto.setCourse(group.getCourse());
        groupDto.setEducationForm(group.getEducationForm());
        groupDto.setDirection(group.getDirection());
        groupDto.setGroupName(group.getGroupName());
        groupDto.setSpecialization(group.getSpecialization());
        groupDto.setKindsOfSports(group.getKindsOfSports());
        return groupDto;
    }

}
