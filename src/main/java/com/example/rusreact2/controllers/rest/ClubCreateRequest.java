package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.models.Club;
import com.example.rusreact2.data.models.ClubSchedule;
import lombok.Data;
import java.util.List;

@Data
public class ClubCreateRequest {
    private Club club;
    private List<ClubSchedule> schedules;
}
