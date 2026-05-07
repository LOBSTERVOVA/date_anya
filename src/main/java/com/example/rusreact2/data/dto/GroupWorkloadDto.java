package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.enums.EducationForm;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class GroupWorkloadDto {
    UUID uuid;
    String groupName;
    int course;
    EducationForm educationForm;
    String faculty;
    String direction;
    String specialization;
    Set<String> kindsOfSports;

    int totalPairs;
    int totalHours;
    int totalLecturePairs;
    int totalLectureHours;
    int totalPracticePairs;
    int totalPracticeHours;
    int totalCreditPairs;
    int totalCreditHours;
    int totalDifferentiatedCreditPairs;
    int totalDifferentiatedCreditHours;
    int totalExamPairs;
    int totalExamHours;

    List<SubjectStat> subjects = new ArrayList<>();
    List<PracticeDto> practices = new ArrayList<>();

    @Data
    public static class SubjectStat {
        String subjectName;
        int pairCount;
        int hours;
        int lecturePairs;
        int lectureHours;
        int practicePairs;
        int practiceHours;
        int creditPairs;
        int creditHours;
        int differentiatedCreditPairs;
        int differentiatedCreditHours;
        int examPairs;
        int examHours;
    }
}
