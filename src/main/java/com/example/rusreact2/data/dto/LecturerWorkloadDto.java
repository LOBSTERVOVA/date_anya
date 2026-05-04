package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.enums.AcademicTitle;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class LecturerWorkloadDto {
    UUID uuid;
    String lastName;
    String firstName;
    String patronymic;
    String avatar;
    AcademicTitle academicTitle;
    int totalPairs;
    int totalHours;
    int totalLecturePairs;
    int totalLectureHours;
    int totalPracticePairs;
    int totalPracticeHours;
    List<SubjectStat> subjects = new ArrayList<>();

    @Data
    public static class SubjectStat {
        String subjectName;
        int pairCount;
        int hours;
        int lecturePairs;
        int lectureHours;
        int practicePairs;
        int practiceHours;
    }
}
